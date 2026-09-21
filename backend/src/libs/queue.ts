/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import 'dotenv/config';
import BullQueue from 'bull';
import { REDIS_URI_MSG_CONN } from "../config/redis";
import configLoader from '../services/ConfigLoaderService/configLoaderService';
import * as jobs from '../jobs';
import logger from '../utils/logger';

const config = configLoader();

const queueOptions = {
  defaultJobOptions: {
    attempts: config.webhook.attempts,
    backoff: {
      type: config.webhook.backoff.type,
      delay: config.webhook.backoff.delay,
    },
    removeOnFail: false,
    removeOnComplete: true,
  },
  limiter: {
    max: config.webhook.limiter.max,
    duration: config.webhook.limiter.duration,
  },
};

const useRedis = !!(REDIS_URI_MSG_CONN && String(REDIS_URI_MSG_CONN).trim());

const queues = useRedis
  ? Object.values(jobs).reduce((acc: any[], job: any) => {
      acc.push({
        bull: new BullQueue(job.key, REDIS_URI_MSG_CONN, queueOptions),
        name: job.key,
        handle: job.handle,
      });
      return acc;
    }, [])
  : [];

export default {
  queues,
  add(name: string, data: any, params = {}) {
    const queue = this.queues.find((q: any) => q.name === name);

    if (!queue) {
      if (!useRedis) {
        logger.warn(`[queue] Redis desativado — job "${name}" ignorado`);
        return Promise.resolve(null);
      }
      throw new Error(`Queue ${name} not found`);
    }

    return queue.bull.add(data, { ...params, removeOnComplete: true });
  },
  process() {
    if (!useRedis) {
      logger.info("[queue] Redis desativado — workers Bull não iniciados");
      return;
    }
    return this.queues.forEach((queue: any) => {
      queue.bull.process(queue.handle);

      queue.bull.on('failed', (job: any, err: any) => {
        logger.error(`Job failed: ${queue.name} ${job?.data}`);
        logger.error(err);
      });
    })
  }
}

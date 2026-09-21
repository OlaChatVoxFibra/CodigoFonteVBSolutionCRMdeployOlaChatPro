/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";

interface Request {
  contactId: number;
  companyId: number;
}

interface MediaItem {
  id: number;
  mediaUrl: string;
  mediaType: string;
  body: string;
  createdAt: Date;
  ticketId: number;
}

interface LinkItem {
  id: number;
  url: string;
  title?: string;
  createdAt: Date;
  ticketId: number;
}

interface Response {
  images: MediaItem[];
  videos: MediaItem[];
  audios: MediaItem[];
  documents: MediaItem[];
  links: LinkItem[];
}

const GetContactMediaService = async ({
  contactId,
  companyId
}: Request): Promise<Response> => {
  // Primeiro, buscar todos os tickets do contato
  const tickets = await Ticket.findAll({
    where: {
      contactId,
      companyId
    },
    attributes: ["id"]
  });

  const ticketIds = tickets.map(ticket => ticket.id);

  if (ticketIds.length === 0) {
    return {
      images: [],
      videos: [],
      audios: [],
      documents: [],
      links: []
    };
  }

  // Buscar todas as mensagens com mídia desses tickets
  const messages = await Message.findAll({
    where: {
      ticketId: {
        [Op.in]: ticketIds
      },
      mediaUrl: {
        [Op.not]: null
      },
      isDeleted: false
    },
    attributes: ["id", "mediaUrl", "mediaType", "body", "createdAt", "ticketId", "companyId"],
    order: [["createdAt", "DESC"]],
    limit: 300 // Limitar para evitar sobrecarga
  });

  // Buscar mensagens que contenham links
  const linkMessages = await Message.findAll({
    where: {
      ticketId: {
        [Op.in]: ticketIds
      },
      body: {
        [Op.regexp]: "(https?://[^\\s]+)" // Regex para encontrar URLs
      },
      mediaUrl: null, // Apenas mensagens sem mídia
      isDeleted: false
    },
    attributes: ["id", "body", "createdAt", "ticketId"],
    order: [["createdAt", "DESC"]],
    limit: 100
  });

  // Separar as mídias por tipo
  const images: MediaItem[] = [];
  const videos: MediaItem[] = [];
  const audios: MediaItem[] = [];
  const documents: MediaItem[] = [];

  messages.forEach(message => {
    // Construir a URL completa da mídia
    let fullMediaUrl = message.mediaUrl;
    
    // Se a URL não começa com http, significa que é um caminho relativo
    if (fullMediaUrl && !fullMediaUrl.startsWith('http')) {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
      const proxyPort = process.env.PROXY_PORT ? `:${process.env.PROXY_PORT}` : '';
      
      // Se a URL já contém /public/company, não adicionar novamente
      if (fullMediaUrl.startsWith('/public/company')) {
        fullMediaUrl = `${backendUrl}${proxyPort}${fullMediaUrl}`;
      } else {
        // Construir a URL completa com o companyId correto
        fullMediaUrl = `${backendUrl}${proxyPort}/public/company${message.companyId || companyId}/${fullMediaUrl}`;
      }
    }

    const mediaItem: MediaItem = {
      id: message.id,
      mediaUrl: fullMediaUrl,
      mediaType: message.mediaType,
      body: message.body,
      createdAt: message.createdAt,
      ticketId: message.ticketId
    };

    if (message.mediaType) {
      const type = message.mediaType.toLowerCase();
      
      if (type.includes("image") || type.includes("jpeg") || type.includes("jpg") || type.includes("png") || type.includes("gif")) {
        images.push(mediaItem);
      } else if (type.includes("video") || type.includes("mp4") || type.includes("avi") || type.includes("mov")) {
        videos.push(mediaItem);
      } else if (type.includes("audio") || type.includes("mp3") || type.includes("ogg") || type.includes("wav") || type.includes("ptt")) {
        audios.push(mediaItem);
      } else if (type.includes("pdf") || type.includes("document") || type.includes("doc") || type.includes("xls") || type.includes("ppt")) {
        documents.push(mediaItem);
      } else {
        // Se não for identificado, considerar como documento
        documents.push(mediaItem);
      }
    }
  });

  // Extrair links das mensagens
  const links: LinkItem[] = [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  linkMessages.forEach(message => {
    const matches = message.body.match(urlRegex);
    if (matches) {
      matches.forEach(url => {
        links.push({
          id: message.id,
          url: url,
          title: extractTitleFromUrl(url),
          createdAt: message.createdAt,
          ticketId: message.ticketId
        });
      });
    }
  });

  return {
    images,
    videos,
    audios,
    documents,
    links
  };
};

// Função auxiliar para extrair um título da URL
const extractTitleFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace("www.", "");
    const pathname = urlObj.pathname;
    
    if (pathname && pathname !== "/") {
      const lastPart = pathname.split("/").filter(Boolean).pop();
      if (lastPart) {
        return `${hostname} - ${decodeURIComponent(lastPart).replace(/[-_]/g, " ")}`;
      }
    }
    
    return hostname;
  } catch {
    return url;
  }
};

export default GetContactMediaService;
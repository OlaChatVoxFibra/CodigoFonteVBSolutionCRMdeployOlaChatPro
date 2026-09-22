/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Server as SocketIO } from "socket.io";
import { Server } from "http";
import AppError from "../errors/AppError";
import logger from "../utils/logger";
import { instrument } from "@socket.io/admin-ui";
import User from "../models/User";
import { ReceibedWhatsAppService } from "../services/WhatsAppOficial/ReceivedWhatsApp";
import { JwtPayload, verify } from "jsonwebtoken";
import authConfig from "../config/auth";
import BirthdayService from "../services/BirthdayService/BirthdayService";
import { isDevNoDb } from "../helpers/devNoDbAuth";

let io: SocketIO;

import { getCorsAllowedOrigins } from "../utils/appUrlUtils";

export const initIO = (httpServer: Server): SocketIO => {
  const allowedEnv = getCorsAllowedOrigins();

  io = new SocketIO(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Socket.io com credentials: true NÃO PODE USAR ORIGIN TRUE (gera *).
        // Quando existe origin, ECOAMOS a origem exata.
        if (!origin) {
          return callback(null, "*");
        }
        return callback(null, origin);
      },
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["authorization", "content-type"],
      credentials: true
    }
  });

  if (process.env.SOCKET_ADMIN && JSON.parse(process.env.SOCKET_ADMIN)) {
    if (!isDevNoDb()) {
      User.findByPk(1)
        .then((adminUser) => {
          if (!adminUser) return;
          instrument(io, {
            auth: {
              type: "basic",
              username: adminUser.email,
              password: adminUser.passwordHash
            },
            mode: "development",
          });
        })
        .catch((err: any) => {
          logger.warn({
            msg: "SOCKET_ADMIN: não foi possível carregar admin do banco",
            error: err?.message || String(err)
          });
        });
    }
  }

  const workspaces = io.of(/^\/\w+$/);
  workspaces.on("connection", async socket => {

    const token_api_oficial = process.env.TOKEN_API_OFICIAL || "";
    const token = Array.isArray(socket?.handshake?.query?.token) ? socket.handshake.query.token[1] : socket?.handshake?.query?.token?.split(" ")[1];

    if (!token) {
      return socket.disconnect();
    }

    if (token !== token_api_oficial) {
      try {
        const decoded = verify(token, authConfig.secret);
        const companyId = socket.nsp.name.split("/")[1]

        const decodedPayload = decoded as JwtPayload;
        const companyIdToken = decodedPayload.companyId;

        if (+companyIdToken !== +companyId) {
          if (isDevNoDb()) {
            // Modo local: não consulta Users no Postgres
          } else {
            const user = await User.findByPk(decodedPayload.id);
            if (user?.super) {
               // Super user allowed
            } else {
               logger.error(`CompanyId do token ${companyIdToken} diferente da companyId do socket ${companyId}`)
               return socket.disconnect();
            }
          }
        }
      } catch (error) {
        logger.error(JSON.stringify(error), "Error decoding token");
        if (error.message !== "jwt expired") {
          return socket.disconnect();
        }
      }
    } else {
      logger.info(`Client connected namespace ${socket.nsp.name}`);
      logger.info(`Conectado com sucesso na API OFICIAL`);
    }

    //  ADICIONAR: Eventos de heartbeat e gerenciamento de usuários
    const handleHeartbeat = async (socket: any) => {
      try {
        if (isDevNoDb()) {
          return;
        }
        const companyId = socket.nsp.name.split("/")[1];
        const decoded = verify(token !== token_api_oficial ? token : "", authConfig.secret);
        const decodedPayload = decoded as JwtPayload;
        const userId = decodedPayload.id;

        await User.update(
          {
            online: true,
            lastSeen: new Date()
          },
          { where: { id: userId } }
        );

        socket.broadcast.to(`company-${companyId}`).emit("user:online", {
          userId,
          lastSeen: new Date()
        });

        clearTimeout(socket.heartbeatTimeout);
        socket.heartbeatTimeout = setTimeout(async () => {
          if (isDevNoDb()) return;
          await User.update(
            {
              online: false,
              lastSeen: new Date()
            },
            { where: { id: userId } }
          );
          socket.broadcast.to(`company-${companyId}`).emit("user:offline", {
            userId,
            lastSeen: new Date()
          });
        }, 30000);
      } catch (error) {
        logger.error("Error in handleHeartbeat:", error);
      }
    };

    //  NOVO: Handler para verificar aniversários quando usuário se conecta
    const checkAndEmitBirthdays = async (companyId: number) => {
      if (isDevNoDb()) {
        return;
      }
      try {
        const birthdayData = await BirthdayService.getTodayBirthdaysForCompany(companyId);

        // Emitir eventos de aniversário se houver aniversariantes
        if (birthdayData.users.length > 0) {
          birthdayData.users.forEach(user => {
            io.of(`/${companyId}`).emit("user-birthday", {
              userId: user.id,
              userName: user.name,
              userAge: user.age
            });
            logger.info(` [GLOBAL] Emitido evento de aniversário para usuário: ${user.name}`);
          });
        }

        if (birthdayData.contacts.length > 0) {
          birthdayData.contacts.forEach(contact => {
            io.of(`/${companyId}`).emit("contact-birthday", {
              contactId: contact.id,
              contactName: contact.name,
              contactAge: contact.age
            });
            logger.info(` [GLOBAL] Emitido evento de aniversário para contato: ${contact.name}`);
          });
        }
      } catch (error) {
        logger.error(" Error checking birthdays:", error);
      }
    };

    //  EVENTO: Quando cliente se conecta
    socket.on("connect", async () => {
      try {
        if (token !== token_api_oficial) {
          const decoded = verify(token, authConfig.secret);
          const decodedPayload = decoded as JwtPayload;
          const userId = decodedPayload.id;
          const companyId = parseInt(socket.nsp.name.split("/")[1]);

          socket.join(`company-${companyId}`);

          if (isDevNoDb()) {
            socket.emit("users:online", []);
            return;
          }

          // Buscar dados do usuário
          const user = await User.findByPk(userId, {
            attributes: ["id", "name", "profileImage", "lastSeen"]
          });

          socket.broadcast.to(`company-${companyId}`).emit("user:new", {
            userId,
            user
          });

          // Buscar usuários online
          const onlineUsers = await User.findAll({
            where: {
              companyId,
              online: true
            },
            attributes: ["id", "name", "profileImage", "lastSeen"]
          });

          socket.emit("users:online", onlineUsers);

          //  NOVO: Verificar e emitir aniversários quando usuário se conecta
          await checkAndEmitBirthdays(companyId);
        }
      } catch (error) {
        logger.error("Error in socket connect:", error);
      }
    });

    //  NOVO: Evento para solicitar verificação manual de aniversários
    socket.on("checkBirthdays", async () => {
      try {
        const companyId = parseInt(socket.nsp.name.split("/")[1]);
        await checkAndEmitBirthdays(companyId);
      } catch (error) {
        logger.error(" Error in manual birthday check:", error);
      }
    });

    // Eventos existentes
    socket.on("joinChatBox", (ticketId: string) => {
      socket.join(ticketId);
    });

    socket.on("joinNotification", () => {
      socket.join("notification");
    });

    socket.on("joinVersion", () => {
      logger.info(`A client joined version channel namespace ${socket.nsp.name}`);
      socket.join("version");
    });

    socket.on("joinTickets", (status: string) => {
      socket.join(status);
    });

    socket.on("joinTicketsLeave", (status: string) => {
      socket.leave(status);
    });

    socket.on("joinChatBoxLeave", (ticketId: string) => {
      socket.leave(ticketId);
    });

    socket.on("receivedMessageWhatsAppOficial", (data: any) => {
      const receivedService = new ReceibedWhatsAppService();
      receivedService.getMessage(data);
    });

    socket.on("readMessageWhatsAppOficial", (data: any) => {
      const receivedService = new ReceibedWhatsAppService();
      receivedService.readMessage(data);
    });

    //  NOVO: Heartbeat para manter usuário online e verificar aniversários periodicamente
    socket.on("heartbeat", () => handleHeartbeat(socket));

    //  EVENTO: Quando cliente se desconecta
    socket.on("disconnect", async () => {
      try {
        if (isDevNoDb()) {
          return;
        }
        if (token !== token_api_oficial) {
          const companyId = parseInt(socket.nsp.name.split("/")[1]);
          const decoded = verify(token, authConfig.secret);
          const decodedPayload = decoded as JwtPayload;
          const userId = decodedPayload.id;

          await User.update(
            {
              online: false,
              lastSeen: new Date()
            },
            { where: { id: userId } }
          );

          socket.broadcast.to(`company-${companyId}`).emit("user:offline", {
            userId,
            lastSeen: new Date()
          });
        }
      } catch (error) {
        logger.error("Error in socket disconnect:", error);
      }
    });

  });
  return io;
};

export const getIO = (): SocketIO => {
  if (!io) {
    throw new AppError("Socket IO not initialized");
  }
  return io;
};

//  NOVA FUNÇÃO: Emitir eventos de aniversário para uma empresa específica
export const emitBirthdayEvents = async (companyId: number) => {
  try {
    if (!io) {
      logger.warn(`[RDS-SOCKET] Socket IO não inicializado ao tentar emitir eventos de aniversário para empresa ${companyId}`);
      return;
    }

    const birthdayData = await BirthdayService.getTodayBirthdaysForCompany(companyId);

    // Emitir para todos os usuários da empresa
    if (birthdayData.users.length > 0) {
      birthdayData.users.forEach(user => {
        io.of(`/${companyId}`).emit("user-birthday", {
          userId: user.id,  // ✅ Corrigido: usar userId em vez de user.id
          userName: user.name,
          userAge: user.age
        });
        logger.info(` [GLOBAL] Emitido evento de aniversário para usuário: ${user.name}`);
      });
    }

    if (birthdayData.contacts.length > 0) {
      birthdayData.contacts.forEach(contact => {
        io.of(`/${companyId}`).emit("contact-birthday", {
          contactId: contact.id,  // ✅ Corrigido: usar contactId em vez de contact.id
          contactName: contact.name,
          contactAge: contact.age
        });
        logger.info(` [GLOBAL] Emitido evento de aniversário para contato: ${contact.name}`);
      });
    }
  } catch (error) {
    logger.error(` [RDS-SOCKET] Erro ao emitir eventos de aniversário para empresa ${companyId}:`, 
      error instanceof Error ? error.message : "Unknown error");
    if (error instanceof Error && error.stack) {
      logger.debug(" [RDS-SOCKET] Error stack:", error.stack);
    }
  }
};

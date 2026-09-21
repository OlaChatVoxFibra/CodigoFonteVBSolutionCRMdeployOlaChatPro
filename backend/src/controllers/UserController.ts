/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { isEmpty, isNil } from "lodash";
import AppError from "../errors/AppError";

import CreateUserService from "../services/UserServices/CreateUserService";
import ListUsersService from "../services/UserServices/ListUsersService";
import UpdateUserService from "../services/UserServices/UpdateUserService";
import ShowUserService from "../services/UserServices/ShowUserService";
import DeleteUserService from "../services/UserServices/DeleteUserService";
import SimpleListService from "../services/UserServices/SimpleListService";
import CreateCompanyService from "../services/CompanyService/CreateCompanyService";
import { SendMailSmart } from "../helpers/SendMail";
import { useDate } from "../utils/useDate";
import { getWbot } from "../libs/wbot";
import FindCompaniesWhatsappService from "../services/CompanyService/FindCompaniesWhatsappService";
import User from "../models/User";

import { head } from "lodash";
import ToggleChangeWidthService from "../services/UserServices/ToggleChangeWidthService";
import APIShowEmailUserService from "../services/UserServices/APIShowEmailUserService";
import UpdateUserOnlineStatusService from "../services/UserServices/UpdateUserOnlineStatusService";
import GetOnlineUsersService from "../services/UserServices/GetOnlineUsersService";
import Chat from "../models/Chat";
import ChatUser from "../models/ChatUser";
import Plan from "../models/Plan";
import Subscriptions from "../models/Subscriptions";
import axios from "axios";
import { getCompanyOptionalColumns } from "../helpers/companyOptionalColumns";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;
  const { companyId, profile } = req.user;

  const { users, count, hasMore } = await ListUsersService({
    searchParam,
    pageNumber,
    companyId,
    profile
  });

  return res.json({ users, count, hasMore });
};

/**
 * POST /auth/signup: sem `companyId` no body, cria nova organização (Company) + usuário admin inicial.
 * Inclui fluxos públicos como /cadastro-gratis (freemium) e demais cadastros de empresa.
 */
export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    email,
    password,
    name,
    phone,
    profile,
    companyId: bodyCompanyId,
    queueIds,
    companyName,
    planId,
    startWork,
    endWork,
    whatsappId,
    allTicket,
    defaultTheme,
    defaultMenu,
    allowGroup,
    allHistoric,
    allUserChat,
    userClosePendingTicket,
    showDashboard,
    defaultTicketsManagerWidth = 550,
    allowRealTime,
    allowConnections,
    showContacts,
    showCampaign,
    showFlow,
    birthDate,
    allowSeeMessagesInPendingTickets = "enabled",
    document, // CNPJ da empresa
    signupSource

  } = req.body;
  let userCompanyId: number | null = null;

  const { dateToClient } = useDate();

  if (req.user !== undefined) {
    const { companyId: cId } = req.user;
    userCompanyId = cId;
  }

  if (req.url !== "/signup" && req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  if (process.env.DEMO === "ON") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  // Validar se CNPJ foi fornecido no signup
  if (req.url === "/signup" && (!document || document.trim() === "")) {
    throw new AppError("CNPJ é obrigatório para o cadastro", 400);
  }

  const companyUser = bodyCompanyId || userCompanyId;

  if (!companyUser) {
    if (signupSource === "freemium") {
      const freemiumDaysRaw = process.env.FREEMIUM_DAYS;
      const freemiumDays =
        freemiumDaysRaw && Number(freemiumDaysRaw) > 0
          ? Number(freemiumDaysRaw)
          : 30;

      let starterPlan: Plan | null = null;
      const envPlanId = process.env.FREEMIUM_PLAN_ID;
      if (envPlanId) {
        starterPlan = await Plan.findByPk(envPlanId, {
          attributes: ["id", "name", "trial", "trialDays"]
        });
      }
      if (!starterPlan) {
        starterPlan = await Plan.findOne({
          where: { name: "Starter" },
          order: [["id", "ASC"]],
          attributes: ["id", "name", "trial", "trialDays"]
        });
      }
      if (!starterPlan) {
        throw new AppError("ERR_FREEMIUM_PLAN_NOT_CONFIGURED", 503);
      }

      const endFreemium = new Date();
      endFreemium.setDate(endFreemium.getDate() + freemiumDays);
      const dateFreemium = endFreemium.toISOString().split("T")[0];

      const companyDataFreemium = {
        name: companyName,
        email: email,
        phone: phone,
        planId: starterPlan.id,
        status: true,
        dueDate: dateFreemium,
        recurrence: "freemium",
        document: document ? document.replace(/\D/g, "") : "",
        paymentMethod: "",
        password: password,
        companyUserName: name,
        startWork: startWork,
        endWork: endWork,
        defaultTheme: "light",
        defaultMenu: "closed",
        allowGroup: false,
        allHistoric: "disabled",
        userClosePendingTicket: "enabled",
        allowSeeMessagesInPendingTickets: "enabled",
        showDashboard: "disabled",
        defaultTicketsManagerWidth: 550,
        allowRealTime: "disabled",
        allowConnections: "disabled",
        skipExternalCnpjValidation: true
      };

      const createdCompanyFreemium = await CreateCompanyService(
        companyDataFreemium
      );

      try {
        const meta = req.body.metadata;
        const merged =
          meta && typeof meta === "object"
            ? { ...meta, signupSource: "freemium" }
            : { signupSource: "freemium" };
        const cols = await getCompanyOptionalColumns();
        if (cols.signupMetadata) {
          await createdCompanyFreemium.update({ signupMetadata: merged } as any);
        }
      } catch (metaErr) {
        console.warn("signupMetadata freemium:", metaErr);
      }

      try {
        await Subscriptions.create({
          companyId: createdCompanyFreemium.id,
          isActive: true,
          expiresAt: new Date(`${dateFreemium}T23:59:59.999Z`),
          providerSubscriptionId: "freemium_starter"
        } as any);
      } catch (subErr) {
        console.warn("Subscriptions freemium record:", subErr);
      }

      try {
        const _emailFreemium = {
          to: email,
          subject: `Login e senha da Empresa ${companyName}`,
          text: `Olá ${name}, este é um email sobre o cadastro da ${companyName}!<br><br>
        Segue os dados da sua empresa:<br><br>Nome: ${companyName}<br>Email: ${email}<br>Senha: ${password}<br>Data fim do período grátis: ${dateToClient(
            dateFreemium
          )}`
        };

        await SendMailSmart(_emailFreemium);
      } catch (error) {
        console.log("Não consegui enviar o email");
      }

      try {
        const whatsappCompanyF = await FindCompaniesWhatsappService(
          createdCompanyFreemium.id
        );

        if (
          whatsappCompanyF?.whatsapps?.[0]?.status === "CONNECTED" &&
          (phone !== undefined || !isNil(phone) || !isEmpty(phone))
        ) {
          const whatsappIdF = whatsappCompanyF.whatsapps[0].id;
          const wbotF = await getWbot(whatsappIdF);

          const phoneDigits = String(phone || "").replace(/\D/g, "");
          const jid =
            phoneDigits.length > 0
              ? `${phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`}@s.whatsapp.net`
              : "";
          const welcomeBody = `Olá *${name}*! 🎉\n\nSeja muito bem-vindo(a) à *${companyName}* — ficamos extremamente felizes em ter você com a gente nesta jornada!\n\nSomos a equipe VB Solution e estamos *100% à sua disposição*: dúvidas, ideias, ajustes ou um simples “oi” — pode nos chamar quando quiser. Queremos que você aproveite cada recurso, ganhe tempo no atendimento e veja resultados reais no dia a dia.\n\n📱 *Seus dados de acesso rápido:*\n• Empresa: ${companyName}\n• E-mail: ${email}\n• Período grátis até: ${dateToClient(dateFreemium)}\n\nLembre-se: sua senha é pessoal — guarde com carinho. Se precisar de treinamento, dicas ou suporte, é só responder esta mensagem. Vamos juntos! 💙`;

          if (jid) await wbotF.sendMessage(jid, { text: welcomeBody });
        }
      } catch (error) {
        console.log("Não consegui enviar a mensagem");
      }

      return res.status(200).json(createdCompanyFreemium);
    }

    let plan: Plan | null = null;
    if (planId) {
      plan = await Plan.findByPk(planId, {
        attributes: ["id", "name", "trial", "trialDays"]
      });
    }
    if (!plan) {
      plan = await Plan.findOne({
        where: { trial: true, isPublic: true },
        order: [["id", "ASC"]],
        attributes: ["id", "name", "trial", "trialDays"]
      });
    }
    if (!plan || plan.trial !== true) {
      throw new AppError("ERR_SIGNUP_REQUIRES_TRIAL_PLAN", 400);
    }

    const trialDays = Number(plan.trialDays) > 0 ? Number(plan.trialDays) : 30;
    const end = new Date();
    end.setDate(end.getDate() + trialDays);
    const date = end.toISOString().split("T")[0];

    const companyData = {
      name: companyName,
      email: email,
      phone: phone,
      planId: plan.id,
      status: true,
      dueDate: date,
      recurrence: "",
      document: document ? document.replace(/\D/g, "") : "",
      paymentMethod: "",
      password: password,
      companyUserName: name,
      startWork: startWork,
      endWork: endWork,
      defaultTheme: "light",
      defaultMenu: "closed",
      allowGroup: false,
      allHistoric: "disabled",
      userClosePendingTicket: "enabled",
      allowSeeMessagesInPendingTickets: "enabled",
      showDashboard: "disabled",
      defaultTicketsManagerWidth: 550,
      allowRealTime: "disabled",
      allowConnections: "disabled"
    };

    const createdCompany = await CreateCompanyService(companyData);

    try {
      await Subscriptions.create({
        companyId: createdCompany.id,
        isActive: true,
        expiresAt: new Date(`${date}T23:59:59.999Z`),
        providerSubscriptionId: "trial_signup"
      } as any);
    } catch (subErr) {
      console.warn("Subscriptions trial record:", subErr);
    }

    try {
      const _email = {
        to: email,
        subject: `Login e senha da Empresa ${companyName}`,
        text: `Olá ${name}, este é um email sobre o cadastro da ${companyName}!<br><br>
        Segue os dados da sua empresa:<br><br>Nome: ${companyName}<br>Email: ${email}<br>Senha: ${password}<br>Data Vencimento Trial: ${dateToClient(
          date
        )}`
      };

      await SendMailSmart(_email);
    } catch (error) {
      console.log("Não consegui enviar o email");
    }

    try {
      const whatsappCompany = await FindCompaniesWhatsappService(createdCompany.id);

      if (
        whatsappCompany?.whatsapps?.[0]?.status === "CONNECTED" &&
        (phone !== undefined || !isNil(phone) || !isEmpty(phone))
      ) {
        const whatsappId = whatsappCompany.whatsapps[0].id;
        const wbot = await getWbot(whatsappId);

        const body = `Olá ${name}, este é uma mensagem sobre o cadastro da ${companyName}!\n\nSegue os dados da sua empresa:\n\nNome: ${companyName}\nEmail: ${email}\nSenha: ${password}\nData Vencimento Trial: ${dateToClient(
          date
        )}`;

        await wbot.sendMessage(`55${phone}@s.whatsapp.net`, { text: body });
      }
    } catch (error) {
      console.log("Não consegui enviar a mensagem");
    }

    return res.status(200).json(createdCompany);
  }

  if (companyUser) {
    const user = await CreateUserService({
      email,
      password,
      name,
      profile,
      companyId: companyUser,
      queueIds,
      startWork,
      endWork,
      whatsappId,
      allTicket,
      defaultTheme,
      defaultMenu,
      allowGroup,
      allHistoric,
      allUserChat,
      userClosePendingTicket,
      showDashboard,
      defaultTicketsManagerWidth,
      allowRealTime,
      allowConnections,
      showContacts,
      showCampaign,
      showFlow,
      birthDate,
      allowSeeMessagesInPendingTickets
    });

    const userData = await User.findByPk(user.id);

    await User.createInitialChat(userData);

    const chats = await Chat.findAll({
      include: [
        {
          model: ChatUser,
          where: { userId: user.id }
        }
      ]
    });

    const io = getIO();
    io.of(userCompanyId.toString()).emit(`company-${userCompanyId}-user`, {
      action: "create",
      user
    });

    return res.status(200).json({ user, chats });
  }
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { userId } = req.params;
  const { companyId, id: requestUserId } = req.user as any;
  const requestUser = await User.findByPk(requestUserId);

  const skipCompanyCheck =
    Boolean(requestUser?.super) || requestUser?.email === "admin@admin.com";
  const user = await ShowUserService(userId, companyId, skipCompanyCheck);

  return res.status(200).json(user);
};

export const showEmail = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { email } = req.params;

  const user = await APIShowEmailUserService(email);

  return res.status(200).json(user);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  // if (req.user.profile !== "admin") {
  //   throw new AppError("ERR_NO_PERMISSION", 403);
  // }

  if (process.env.DEMO === "ON") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { id: requestUserId, companyId } = req.user;
  const { userId } = req.params;
  const userData = req.body;

  const user = await UpdateUserService({
    userData,
    userId,
    companyId,
    requestUserId: +requestUserId
  });

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-user`, {
    action: "update",
    user
  });

  return res.status(200).json(user);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { userId } = req.params;
  const { companyId, id, profile, email } = req.user as any;

  if (profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  if (process.env.DEMO === "ON") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const user = await User.findOne({
    where: { id: userId }
  });

  const isRoot = email === "admin@admin.com";
  if (!isRoot && companyId !== user.companyId) {
    return res
      .status(400)
      .json({ error: "Você não possui permissão para acessar este recurso!" });
  } else {
    await DeleteUserService(userId, isRoot ? user.companyId : companyId, +id);

    const io = getIO();
    io.of(String(companyId)).emit(`company-${companyId}-user`, {
      action: "delete",
      userId
    });

    return res.status(200).json({ message: "User deleted" });
  }
};

export const list = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.query;
  const { companyId: userCompanyId } = req.user;

  const users = await SimpleListService({
    companyId: companyId ? +companyId : userCompanyId
  });

  return res.status(200).json(users);
};

export const mediaUpload = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { userId } = req.params;
  const { companyId } = req.user;
  const files = req.files as Express.Multer.File[];
  const file = head(files);

  if (!file) {
    throw new AppError("Nenhum arquivo foi enviado", 400);
  }

  try {
    let user = await User.findByPk(userId);

    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    if (user.companyId !== companyId) {
      throw new AppError("Usuário não pertence a esta empresa", 403);
    }

    // Salvar apenas o nome do arquivo (sem caminho)
    user.profileImage = file.filename;
    await user.save();

    // Buscar usuário atualizado com todas as relações
    user = await ShowUserService(userId, companyId);

    // Emitir evento socket para atualizar em tempo real
    const io = getIO();
    io.of(String(companyId)).emit(`company-${companyId}-user`, {
      action: "update",
      user
    });

    return res.status(200).json({
      user,
      message: "Imagem atualizada com sucesso"
    });
  } catch (err: any) {
    console.error("Erro no upload da imagem:", err);
    throw new AppError(err.message || "Erro interno do servidor");
  }
};

export const toggleChangeWidht = async (
  req: Request,
  res: Response
): Promise<Response> => {
  var { userId } = req.params;
  const { defaultTicketsManagerWidth } = req.body;

  const { companyId } = req.user;
  const user = await ToggleChangeWidthService({
    userId,
    defaultTicketsManagerWidth
  });

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-user`, {
    action: "update",
    user
  });

  return res.status(200).json(user);
};

export const updateOnlineStatus = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { userId } = req.params;
  const { online } = req.body;

  await UpdateUserOnlineStatusService({
    userId: +userId,
    online
  });

  return res.status(200).json({ message: "Status updated" });
};

export const getOnlineUsers = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;

  const users = await GetOnlineUsersService({
    companyId
  });

  return res.status(200).json(users);
};

export const validateCnpj = async (req: Request, res: Response): Promise<Response> => {
  const { cnpj } = req.body;

  if (!cnpj) {
    throw new AppError("CPF ou CNPJ é obrigatório", 400);
  }

  // Limpar o documento (remover formatação)
  const cleanDocument = cnpj.replace(/\D/g, '');

  // Detectar se é CPF ou CNPJ
  const isCpf = cleanDocument.length === 11;
  const isCnpj = cleanDocument.length === 14;

  if (!isCpf && !isCnpj) {
    throw new AppError("CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos", 400);
  }

  if (isCpf) {
    // Validação local do CPF
    if (!validateCpf(cleanDocument)) {
      throw new AppError("CPF inválido", 400);
    }

    return res.status(200).json({
      valid: true,
      data: {
        nome: "Pessoa Física",
        cpf: cleanDocument,
        tipo: "cpf"
      }
    });
  }

  // Validação do CNPJ na Receita Federal
  try {
    const response = await axios.get(`https://receitaws.com.br/v1/cnpj/${cleanDocument}`);
    const data = response.data;

    if (data.status === "ERROR") {
      throw new AppError("CNPJ inválido ou não encontrado na Receita Federal", 400);
    }

    return res.status(200).json({
      valid: true,
      data: {
        nome: data.nome,
        cnpj: cleanDocument,
        email: data.email,
        telefone: data.telefone,
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        municipio: data.municipio,
        uf: data.uf,
        cep: data.cep,
        situacao: data.situacao,
        tipo: "cnpj"
      }
    });

  } catch (error: any) {
    console.error("Erro ao validar CNPJ:", error);

    if (error.response?.status === 404) {
      throw new AppError("CNPJ não encontrado na Receita Federal", 404);
    }

    throw new AppError("Erro ao validar CNPJ. Tente novamente.", 500);
  }
};

// Função para validar CPF
const validateCpf = (cpf: string): boolean => {
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;

  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(10))) return false;

  return true;
};

export default {
  index,
  store,
  show,
  showEmail,
  update,
  remove,
  list,
  mediaUpload,
  toggleChangeWidht,
  updateOnlineStatus,
  getOnlineUsers,
  validateCnpj
};

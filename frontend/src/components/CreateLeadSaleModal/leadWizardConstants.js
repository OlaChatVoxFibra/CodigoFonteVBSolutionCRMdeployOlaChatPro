/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  FaWhatsapp,
  FaInstagram,
  FaFacebook,
  FaGoogle,
  FaTelegram,
  FaGlobe,
  FaShareAlt
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { MdSms } from "react-icons/md";

export const WIZARD_STEPS = [
  { id: "personal", label: "Pessoais" },
  { id: "product", label: "Produto" },
  { id: "origin", label: "Origem" },
  { id: "notes", label: "Notas" }
];

export const DETAIL_DOCK_STEPS = [
  ...WIZARD_STEPS
];

export const ORIGIN_CHANNELS = [
  { id: "whatsapp", label: "WhatsApp", color: "#25D366", Icon: FaWhatsapp },
  { id: "instagram", label: "Instagram", color: "#E4405F", Icon: FaInstagram },
  { id: "facebook", label: "Facebook", color: "#1877F2", Icon: FaFacebook },
  { id: "x", label: "X", color: "#0F1419", Icon: FaXTwitter },
  { id: "telegram", label: "Telegram", color: "#26A5E4", Icon: FaTelegram },
  { id: "sms", label: "SMS", color: "#34C759", Icon: MdSms },
  { id: "site", label: "Site", color: "#5856D6", Icon: FaGlobe },
  { id: "indicacao", label: "Indicação", color: "#FF9500", Icon: FaShareAlt },
  { id: "google", label: "Google", color: "#4285F4", Icon: FaGoogle }
];

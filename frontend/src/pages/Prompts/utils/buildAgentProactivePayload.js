/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Monta o payload de proatividade (mesma lógica da página de agentes) para persistir em Prompt.produtividade.proactive.
 */
export function sanitizeMediaByContext(raw) {
  if (!raw || typeof raw !== "object") return undefined;
  const MAX_INBOUND_MEDIA_SLOTS = 12;
  const MAX_MEDIA_TITLE = 120;
  const MAX_MEDIA_WHEN = 500;
  const MAX_BEFORE_GLOBAL = 2000;

  const sanitizeInboundSlots = (v) => {
    const rawSlots = Array.isArray(v.inboundMediaSlots) ? v.inboundMediaSlots : [];
    const imageUrls = [];
    const documentUrls = [];
    const videoUrls = [];
    const inboundMediaSlots = [];
    let idx = 0;
    for (const s of rawSlots.slice(0, MAX_INBOUND_MEDIA_SLOTS)) {
      const id =
        String(s?.id || "")
          .trim()
          .slice(0, 80) || `slot_${Date.now()}_${idx++}`;
      const title = String(s?.title || "")
        .trim()
        .slice(0, MAX_MEDIA_TITLE);
      const whenToUse = String(s?.whenToUse || "")
        .trim()
        .slice(0, MAX_MEDIA_WHEN);
      const iu = String(s?.imageUrl || "").trim();
      const du = String(s?.documentUrl || "").trim();
      const vu = String(s?.videoUrl || "").trim();
      const urlCount = [iu, du, vu].filter(Boolean).length;
      if (urlCount > 1) continue;
      const hasMedia = !!(iu || du || vu);
      const hasText = !!(title || whenToUse);
      if (!hasMedia && !hasText) continue;
      const slot = { id, title, whenToUse };
      if (iu) {
        slot.imageUrl = iu;
        imageUrls.push(iu);
      } else if (du) {
        slot.documentUrl = du;
        documentUrls.push(du);
      } else if (vu) {
        slot.videoUrl = vu;
        videoUrls.push(vu);
      }
      inboundMediaSlots.push(slot);
    }
    return { imageUrls, documentUrls, videoUrls, inboundMediaSlots };
  };

  const out = {};
  ["inbound"].forEach((ctx) => {
    const v = raw[ctx];
    if (!v || typeof v !== "object") return;
    const delayAfterTextSec = Math.min(180, Math.max(0, Number(v.delayAfterTextSec) || 0));
    const skipIfRecentOutboundMedia = !!v.skipIfRecentOutboundMedia;
    const beforeMediaContext = String(v.beforeMediaContext || "")
      .trim()
      .slice(0, MAX_BEFORE_GLOBAL);

    let imageUrls = [];
    let documentUrls = [];
    let videoUrls = [];
    let inboundMediaSlots;

    if (Array.isArray(v.inboundMediaSlots) && v.inboundMediaSlots.length > 0) {
      const d = sanitizeInboundSlots(v);
      imageUrls = d.imageUrls;
      documentUrls = d.documentUrls;
      videoUrls = d.videoUrls;
      inboundMediaSlots = d.inboundMediaSlots.length ? d.inboundMediaSlots : undefined;
    } else {
      imageUrls = (v.imageUrls || []).map(String).map((s) => s.trim()).filter(Boolean);
      documentUrls = (v.documentUrls || []).map(String).map((s) => s.trim()).filter(Boolean);
      videoUrls = (v.videoUrls || []).map(String).map((s) => s.trim()).filter(Boolean);
    }

    if (
      !imageUrls.length &&
      !documentUrls.length &&
      !videoUrls.length &&
      !delayAfterTextSec &&
      !skipIfRecentOutboundMedia &&
      !beforeMediaContext &&
      !(inboundMediaSlots && inboundMediaSlots.length)
    ) {
      return;
    }
    out[ctx] = {
      imageUrls,
      documentUrls,
      videoUrls
    };
    if (delayAfterTextSec > 0) out[ctx].delayAfterTextSec = delayAfterTextSec;
    if (skipIfRecentOutboundMedia) out[ctx].skipIfRecentOutboundMedia = true;
    if (beforeMediaContext) out[ctx].beforeMediaContext = beforeMediaContext;
    if (inboundMediaSlots && inboundMediaSlots.length) out[ctx].inboundMediaSlots = inboundMediaSlots;
  });
  return Object.keys(out).length ? out : undefined;
}

export function sanitizeContextualLinks(arr) {
  if (!Array.isArray(arr)) return undefined;
  const out = arr
    .map((L) => ({
      id: String(L?.id || "").trim() || `lnk_${Date.now()}`,
      url: String(L?.url || "").trim(),
      label: String(L?.label || "").trim() || "Link",
      whenToUse: String(L?.whenToUse || "").trim(),
      fetchContent: !!L?.fetchContent
    }))
    .filter((L) => /^https?:\/\//i.test(L.url))
    .slice(0, 8);
  return out.length ? out : undefined;
}

export function buildProactivePayload(proactiveState) {
  const hints = {};
  const hf = String(proactiveState.hintFollowUp || "").trim();
  if (hf) hints.follow_up = hf;
  const objectives = {};
  ["follow_up", "inbound"].forEach((k) => {
    const t = (proactiveState.objectives && proactiveState.objectives[k]) || "";
    if (t.trim()) objectives[k] = t.trim();
  });
  const segments = {};
  ["follow_up"].forEach((k) => {
    const s = proactiveState.segments?.[k] || {};
    const tagIds = (s.tagIds || []).filter(Boolean);
    const lid = s.contactListId === "" || s.contactListId == null ? null : Number(s.contactListId);
    if (tagIds.length || (lid && lid > 0)) {
      segments[k] = {};
      if (tagIds.length) segments[k].tagIds = tagIds;
      if (lid && lid > 0) segments[k].contactListId = lid;
    }
  });
  const maxDay = parseInt(String(proactiveState.maxProactivePerContactPerDay || ""), 10);
  const customProactiveText = {};
  ["follow_up"].forEach((k) => {
    const t = (proactiveState.customProactiveText && proactiveState.customProactiveText[k]) || "";
    if (String(t).trim()) customProactiveText[k] = String(t).trim();
  });
  const maxReRaw = parseInt(String(proactiveState.maxReengagementAttempts || ""), 10);
  return {
    enabled: proactiveState.enabled,
    followUpEnabled: proactiveState.followUpEnabled !== false,
    hotLeadEnabled: false,
    reengagementEnabled: false,
    followUpAfterDays: Number(proactiveState.followUpAfterDays) || 2,
    reengageAfterWeeks: Number(proactiveState.reengageAfterWeeks) || 2,
    hotLeadKeywords: [],
    useHotLeadButtons: false,
    openAiVisionInbound: proactiveState.openAiVisionInbound,
    acknowledgeMedia: proactiveState.acknowledgeMedia,
    hints: Object.keys(hints).length ? hints : undefined,
    objectives: Object.keys(objectives).length ? objectives : undefined,
    playbook: proactiveState.playbook || undefined,
    inboundConversationBrief: String(proactiveState.inboundConversationBrief || "").trim() || undefined,
    inboundMediaOnlyFirstResponse: proactiveState.inboundMediaOnlyFirstResponse ? true : undefined,
    contextualLinks: sanitizeContextualLinks(proactiveState.contextualLinks),
    fetchLinkContentForPrompt: proactiveState.fetchLinkContentForPrompt ? true : undefined,
    followUpToneVacuo: String(proactiveState.followUpToneVacuo || "").trim() || undefined,
    followUpToneClienteSilencioso:
      String(proactiveState.followUpToneClienteSilencioso || "").trim() || undefined,
    segments: Object.keys(segments).length ? segments : undefined,
    businessHours: proactiveState.businessHoursEnabled
      ? {
          enabled: true,
          startHour: Math.min(23, Math.max(0, Number(proactiveState.businessStartHour) || 9)),
          endHour: Math.min(24, Math.max(0, Number(proactiveState.businessEndHour) || 18))
        }
      : { enabled: false },
    mediaByContext: (() => {
      const s = sanitizeMediaByContext(proactiveState.mediaByContext);
      if (s && typeof s === "object" && Object.keys(s).length > 0) return s;
      const raw = proactiveState.mediaByContext;
      if (raw && typeof raw === "object" && Object.keys(raw).length > 0) return raw;
      return {};
    })(),
    coldOutreachBlendMode: undefined,
    defaultOutbound: proactiveState.defaultOutbound?.allowAgentToSuggestUrls
      ? { allowAgentToSuggestUrls: true }
      : undefined,
    maxProactivePerContactPerDay: Number.isFinite(maxDay) && maxDay > 0 ? maxDay : undefined,
    sequences: undefined,
    applySegmentFilters: proactiveState.applySegmentFilters !== false,
    proactiveMission: proactiveState.proactiveMission || "balanced",
    maxFollowUpAttempts: Math.min(
      15,
      Math.max(1, Number(proactiveState.maxFollowUpAttempts) || 3)
    ),
    minHoursBetweenFollowUps: (() => {
      const n = parseInt(String(proactiveState.minHoursBetweenFollowUps || ""), 10);
      return Number.isFinite(n) && n > 0 ? Math.min(168, n) : undefined;
    })(),
    maxReengagementAttempts:
      Number.isFinite(maxReRaw) && maxReRaw > 0 ? Math.min(50, maxReRaw) : undefined,
    customProactiveText:
      Object.keys(customProactiveText).length > 0 ? customProactiveText : undefined
  };
}

export function splitProdutividade(raw) {
  if (!raw || typeof raw !== "object") return { proactive: {}, actions: null };
  if (raw.actions && typeof raw.actions === "object") {
    return {
      proactive: raw.proactive && typeof raw.proactive === "object" ? raw.proactive : {},
      actions: raw.actions
    };
  }
  return { proactive: raw, actions: null };
}

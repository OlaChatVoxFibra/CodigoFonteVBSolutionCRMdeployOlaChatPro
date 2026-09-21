/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

function normalizeInboundMediaFromApi(mediaByContext) {
  if (!mediaByContext || typeof mediaByContext !== "object") return mediaByContext || {};
  const inbound = mediaByContext.inbound;
  if (!inbound || typeof inbound !== "object") return mediaByContext;
  if (Array.isArray(inbound.inboundMediaSlots) && inbound.inboundMediaSlots.length > 0) {
    return { ...mediaByContext, inbound: { ...inbound } };
  }
  const slots = [];
  let i = 0;
  const mkId = () => `mig-${Date.now()}-${i++}`;
  (inbound.imageUrls || []).forEach((url) => {
    const u = String(url || "").trim();
    if (!u) return;
    slots.push({ id: mkId(), title: "", whenToUse: "", imageUrl: u });
  });
  (inbound.documentUrls || []).forEach((url) => {
    const u = String(url || "").trim();
    if (!u) return;
    slots.push({ id: mkId(), title: "", whenToUse: "", documentUrl: u });
  });
  (inbound.videoUrls || []).forEach((url) => {
    const u = String(url || "").trim();
    if (!u) return;
    slots.push({ id: mkId(), title: "", whenToUse: "", videoUrl: u });
  });
  return {
    ...mediaByContext,
    inbound: { ...inbound, inboundMediaSlots: slots }
  };
}

/**
 * Mescla resposta GET /settings/agent_proactive no estado da UI (hints planos, segmentos, etc.).
 * @param {object} prev — estado React anterior
 * @param {object} v — objeto já parseado (não string JSON)
 */
export function mergeProactiveFromApi(prev, v) {
  if (!v || typeof v !== "object") return prev;
  const kw = Array.isArray(v.hotLeadKeywords)
    ? v.hotLeadKeywords.join(", ")
    : v.hotLeadKeywords || "";
  const mergeSeg = (key) => ({
    tagIds: v.segments?.[key]?.tagIds || [],
    contactListId:
      v.segments?.[key]?.contactListId != null && v.segments[key].contactListId !== ""
        ? v.segments[key].contactListId
        : ""
  });
  const seq = v.sequences?.cold_outreach;
  return {
    ...prev,
    ...v,
    hotLeadKeywords: kw || prev.hotLeadKeywords,
    hintFollowUp: v.hints?.follow_up || v.hintFollowUp || "",
    hintHotLead: v.hints?.hot_lead || v.hintHotLead || "",
    hintReengagement: v.hints?.reengagement || v.hintReengagement || "",
    hintColdOutreach: v.hints?.cold_outreach || v.hintColdOutreach || "",
    objectives: {
      follow_up: v.objectives?.follow_up || "",
      hot_lead: v.objectives?.hot_lead || "",
      reengagement: v.objectives?.reengagement || "",
      cold_outreach: v.objectives?.cold_outreach || "",
      inbound: v.objectives?.inbound || ""
    },
    segments: {
      follow_up: mergeSeg("follow_up"),
      hot_lead: mergeSeg("hot_lead"),
      reengagement: mergeSeg("reengagement"),
      cold_outreach: mergeSeg("cold_outreach")
    },
    businessHoursEnabled: !!v.businessHours?.enabled,
    businessStartHour: v.businessHours?.startHour ?? 9,
    businessEndHour: v.businessHours?.endHour ?? 18,
    playbook: v.playbook || "",
    mediaByContext: normalizeInboundMediaFromApi(v.mediaByContext || {}),
    defaultOutbound: v.defaultOutbound || { allowAgentToSuggestUrls: false },
    maxProactivePerContactPerDay:
      v.maxProactivePerContactPerDay != null ? String(v.maxProactivePerContactPerDay) : "",
    sequenceSteps:
      Array.isArray(seq) && seq.length
        ? seq.map((s) => ({
            delayHours: s.delayHours || 24,
            hint: s.hint || ""
          }))
        : [],
    coldOutreachBlendMode: v.coldOutreachBlendMode || "merge",
    applySegmentFilters: v.applySegmentFilters !== false,
    proactiveMission: v.proactiveMission || "balanced",
    maxFollowUpAttempts:
      v.maxFollowUpAttempts != null && v.maxFollowUpAttempts !== ""
        ? Number(v.maxFollowUpAttempts)
        : 3,
    minHoursBetweenFollowUps:
      v.minHoursBetweenFollowUps != null && v.minHoursBetweenFollowUps !== ""
        ? String(v.minHoursBetweenFollowUps)
        : "",
    maxReengagementAttempts:
      v.maxReengagementAttempts != null && v.maxReengagementAttempts !== ""
        ? String(v.maxReengagementAttempts)
        : "",
    customProactiveText: {
      follow_up: v.customProactiveText?.follow_up || "",
      hot_lead: v.customProactiveText?.hot_lead || "",
      reengagement: v.customProactiveText?.reengagement || "",
      cold_outreach: v.customProactiveText?.cold_outreach || ""
    },
    inboundConversationBrief: v.inboundConversationBrief || "",
    inboundMediaOnlyFirstResponse: !!v.inboundMediaOnlyFirstResponse,
    contextualLinks: Array.isArray(v.contextualLinks) ? v.contextualLinks : [],
    fetchLinkContentForPrompt: !!v.fetchLinkContentForPrompt,
    followUpToneVacuo: v.followUpToneVacuo || "",
    followUpToneClienteSilencioso: v.followUpToneClienteSilencioso || "",
    followUpEnabled: v.followUpEnabled !== false
  };
}

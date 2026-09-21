"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


function normalizeOption(option) {
  return String(option || "")
    .replace(/\?+$/g, "")
    .replace(/^[\s,.;:–—-]+/, "")
    .replace(/[\s,.;:–—-]+$/, "")
    .replace(/^(mais|por|de|da|do|em|na|no)\s+/i, "")
    .trim();
}

function lastQuestionLine(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (/\?\s*$/.test(lines[i])) return lines[i];
  }
  return "";
}

function extractOptions(text) {
  const question = lastQuestionLine(text);
  if (!question || !/\bou\b/i.test(question) || !/,/.test(question)) return [];
  const withoutQuestion = question.replace(/\?+$/g, "").trim();
  const captured =
    (withoutQuestion.match(/\b(?:procura\s+mais|prefere|quer|busca|precisa(?:\s+de)?|escolhe(?:r)?|entre)\s+(.+)$/i) || [])[1] ||
    (withoutQuestion.match(/:\s*(.+)$/) || [])[1] ||
    "";
  const candidate = captured || withoutQuestion;
  const unique = [
    ...new Set(
      candidate
        .split(/\s*,\s*|\s+ou\s+/i)
        .map(normalizeOption)
        .filter((part) => part.length >= 3 && part.length <= 90)
        .map((part) => part.replace(/\s+/g, " "))
    )
  ];
  if (unique.length < 2 || unique.length > 6) return [];
  if (unique.some((part) => /\b(nome|email|telefone|cidade|empresa)\b/i.test(part))) return [];
  return unique;
}

function inferSlotName(text) {
  const q = lastQuestionLine(text).toLowerCase();
  if (/\b(dificuldade|problema|desafio|dor)\b/i.test(q)) return "pain";
  if (/\b(procura|busca|interesse|objetivo|foco|precisa|quer)\b/i.test(q)) return "interest";
  return "choice";
}

function parseJsonValue(value, fallback) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return value;
  if (typeof value === "string" && value.trim()) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

module.exports = {
  up: async (queryInterface) => {
    const stepsTable = await queryInterface.describeTable("AttendanceFlowSteps").catch(() => null);
    if (!stepsTable || !stepsTable.customerVisibleText || !stepsTable.branchesIR || !stepsTable.expectedReply) {
      return;
    }

    const [rows] = await queryInterface.sequelize.query(
      `
        SELECT "id", "promptId", "stepNumber", "customerVisibleText", "agentPrompt", "branchesIR"
          FROM "AttendanceFlowSteps"
         WHERE COALESCE("customerVisibleText", "agentPrompt", '') ILIKE '%,%'
           AND COALESCE("customerVisibleText", "agentPrompt", '') ~* '\\mou\\M'
      `
    );

    const touchedPromptIds = new Set();
    for (const row of rows || []) {
      const visible = row.customerVisibleText || row.agentPrompt || "";
      const options = extractOptions(visible);
      if (options.length < 2) continue;

      const nextStepId = `s${Number(row.stepNumber || 0) + 1}`;
      const naturalBranches = options.map((option) => ({
        matcher: "semantic",
        value: option,
        nextStepId,
        label: option.slice(0, 80)
      }));
      const currentBranches = parseJsonValue(row.branchesIR, []);
      const keepExisting = Array.isArray(currentBranches)
        ? currentBranches.filter((branch) => {
            const value = String(branch && branch.value ? branch.value : "").toLowerCase();
            return value !== "*" && !options.some((option) => option.toLowerCase() === value);
          })
        : [];
      const alwaysBranches = Array.isArray(currentBranches)
        ? currentBranches.filter((branch) => branch && branch.matcher === "always")
        : [];
      const branchesIR = [...naturalBranches, ...keepExisting, ...alwaysBranches];

      await queryInterface.sequelize.query(
        `
          UPDATE "AttendanceFlowSteps"
             SET "expectedReply" = 'choice',
                 "slotName" = :slotName,
                 "branchesIR" = CAST(:branchesIR AS jsonb),
                 "updatedAt" = NOW()
           WHERE "id" = :id
        `,
        {
          replacements: {
            id: row.id,
            slotName: inferSlotName(visible),
            branchesIR: JSON.stringify(branchesIR)
          }
        }
      );
      if (row.promptId != null) touchedPromptIds.add(Number(row.promptId));
    }

    const definitionsTable = await queryInterface.describeTable("AttendanceFlowDefinitions").catch(() => null);
    if (definitionsTable && touchedPromptIds.size > 0) {
      await queryInterface.sequelize.query(
        `
          UPDATE "AttendanceFlowDefinitions"
             SET "flowUnderstanding" = NULL,
                 "flowUnderstandingVersion" = COALESCE("flowUnderstandingVersion", 0) + 1,
                 "lastCompiledAt" = NOW()
           WHERE "promptId" IN (:promptIds)
        `,
        { replacements: { promptIds: [...touchedPromptIds] } }
      );
    }
  },

  down: async () => {
    // No-op: a migração apenas enriquece IR existente sem remover dados do usuário.
  }
};

jest.mock("openai", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      responses: { create: jest.fn() },
      chat: { completions: { create: jest.fn() } }
    }))
  };
});

jest.mock("axios", () => ({
  __esModule: true,
  default: { get: jest.fn() },
  get: jest.fn()
}));

import PromptSmartAction from "../models/PromptSmartAction";
import Message from "../models/Message";
import {
  applyAgentOrchestratorGuardrails,
  formatAgentReplyReadableSpacing,
  runAgentOrchestrator,
  splitAgentReplyIntoSmartBlocks,
  validateAgentOrchestratorJson
} from "../services/PromptServices/AgentOrchestratorService";

function makePrompt(overrides: Record<string, any> = {}) {
  return {
    id: 10,
    companyId: 1,
    name: "VB Solution",
    apiKey: "sk-test",
    model: "gpt-test",
    maxTokens: 900,
    maxMessages: 12,
    prompt: [
      "Regras Gerais: converse como humano, sem repetir perguntas.",
      "Roteiro: Você procura mais organização interna, automação de atendimento ou crescimento nas vendas?",
      "Depois de entender o objetivo, pergunte a maior dificuldade."
    ].join("\n"),
    attendanceFlowSteps: [
      {
        stepNumber: 1,
        objective: "Entender objetivo",
        customerVisibleText:
          "Você procura mais organização interna, automação de atendimento ou crescimento nas vendas?"
      }
    ],
    ...overrides
  } as any;
}

function makeTicket(dataWebhook: Record<string, any> = {}) {
  return {
    id: 123,
    companyId: 1,
    dataWebhook,
    update: jest.fn(async function update(this: any, patch: any) {
      this.dataWebhook = patch.dataWebhook;
    }),
    setDataValue: jest.fn(function setDataValue(this: any, key: string, value: any) {
      if (key === "dataWebhook") this.dataWebhook = value;
    }),
    getDataValue: jest.fn(function getDataValue(this: any, key: string) {
      return key === "dataWebhook" ? this.dataWebhook : undefined;
    })
  } as any;
}

describe("AgentOrchestratorService", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    delete process.env.AGENT_LLM_FIRST_RUNTIME_ENABLED;
    delete process.env.AGENT_LLM_FIRST_MODEL;
    delete process.env.AGENT_LLM_FIRST_STRUCTURED_MODEL;
    delete process.env.AGENT_LLM_FIRST_ALLOW_EXPERIMENTAL_MODELS;
    delete process.env.AGENT_LLM_FIRST_JSON_REPROCESS_ATTEMPTS;
  });

  it("validates structured decision JSON", () => {
    const decision = validateAgentOrchestratorJson({
      understanding: {
        userIntent: "organização interna",
        currentObjective: "qualificar interesse",
        currentStage: "diagnóstico",
        collectedData: { interest: "organização interna" },
        missingData: ["maior dificuldade"]
      },
      decision: {
        type: "ask_missing_info",
        reason: "cliente respondeu a escolha",
        nextQuestion: "Qual é a maior dificuldade hoje?",
        actionSlug: null,
        actionVariables: {}
      },
      reply: "Entendi, organização interna. Qual é a maior dificuldade hoje?"
    });
    expect(decision?.decision.type).toBe("ask_missing_info");
    expect(decision?.understanding.collectedData.interest).toBe("organização interna");
  });

  it("rejects reply that leaks orchestrator JSON to the customer", () => {
    const decision = validateAgentOrchestratorJson({
      understanding: {
        userIntent: "sticker",
        currentObjective: "qualificar",
        currentStage: "Etapa 1",
        collectedData: [],
        missingData: ["nicho"]
      },
      decision: {
        type: "reply_only",
        reason: "teste",
        nextQuestion: null,
        actionSlug: null,
        actionVariables: {}
      },
      reply: `\`\`\`json
{
  "understanding": {
    "userIntent": "sticker"
  }
}
\`\`\``
    });
    expect(decision).toBeNull();
  });

  it("accepts strict-schema key/value arrays and normalizes them to records", () => {
    const decision = validateAgentOrchestratorJson({
      understanding: {
        userIntent: "criar lead",
        currentObjective: "coletar dados",
        currentStage: "qualificação",
        collectedData: [{ key: "empresa", value: "VB Solution" }],
        missingData: []
      },
      decision: {
        type: "reply_and_execute_action",
        reason: "dados suficientes",
        nextQuestion: null,
        actionSlug: "criar_lead",
        actionVariables: [{ key: "nome", value: "Leonardo" }]
      },
      reply: "Perfeito, vou seguir com esses dados."
    });

    expect(decision?.understanding.collectedData.empresa).toBe("VB Solution");
    expect(decision?.decision.actionVariables.nome).toBe("Leonardo");
  });

  it("uses nextQuestion as reply when the structured reply is empty", () => {
    const decision = validateAgentOrchestratorJson({
      understanding: {
        userIntent: "confirmou interesse",
        currentObjective: "avancar roteiro",
        currentStage: "qualificacao",
        collectedData: [{ key: "interesse", value: "sim" }],
        missingData: ["proximo dado"]
      },
      decision: {
        type: "ask_missing_info",
        reason: "perguntar proxima etapa",
        nextQuestion: "Qual é o próximo detalhe que você quer priorizar?",
        actionSlug: null,
        actionVariables: []
      },
      reply: ""
    });

    expect(decision?.reply).toBe("Qual é o próximo detalhe que você quer priorizar?");
  });

  it("uses a safe minimum token budget for the structured orchestrator", async () => {
    jest.spyOn(PromptSmartAction, "findAll").mockResolvedValue([] as any);
    const create = jest.fn().mockResolvedValue({
      choices: [
        {
          finish_reason: "stop",
          message: {
            content: JSON.stringify({
              understanding: {
                userIntent: "organização interna",
                currentObjective: "entender gargalo",
                currentStage: "qualificação",
                collectedData: [],
                missingData: ["maior dificuldade"]
              },
              decision: {
                type: "ask_missing_info",
                reason: "avançar",
                nextQuestion: "Qual é a maior dificuldade hoje?",
                actionSlug: null,
                actionVariables: []
              },
              reply: "Qual é a maior dificuldade hoje?"
            })
          }
        }
      ]
    });

    await runAgentOrchestrator({
      prompt: makePrompt({ maxTokens: 900 }),
      ticket: makeTicket(),
      contact: { id: 5, name: "Leonardo", number: "559999999999" } as any,
      userText: "Sim",
      recentMessages: [] as any,
      openaiClient: { chat: { completions: { create } } }
    });

    expect(create.mock.calls[0][0].max_tokens).toBeGreaterThanOrEqual(1800);
  });

  it("guards against multiple main questions and internal markers", () => {
    const reply = applyAgentOrchestratorGuardrails(
      "# ETAPA 2\nEntendi. Qual é sua dificuldade? Qual seu telefone?",
      {}
    );
    expect(reply.replace(/\s+/g, " ").trim()).toBe("Entendi. Qual é sua dificuldade?");
    expect(reply).not.toMatch(/ETAPA/);
  });

  it("keeps the useful question instead of permission filler question", () => {
    const reply = applyAgentOrchestratorGuardrails(
      [
        "Olá!",
        "Sou o consultor virtual da VB Solution.",
        "Posso fazer algumas perguntas rápidas para entender melhor o que você precisa?",
        "Qual é o nome da sua empresa?"
      ].join("\n\n"),
      {}
    );
    expect(reply).toContain("Qual é o nome da sua empresa?");
    expect(reply).not.toContain("Posso fazer");
    expect(reply.match(/\?/g)?.length).toBe(1);
  });

  it("normalizes glued punctuation for readable WhatsApp spacing", () => {
    expect(formatAgentReplyReadableSpacing("Olá.Tudo certo?Beleza")).toBe("Olá. Tudo certo? Beleza");
    expect(formatAgentReplyReadableSpacing("Sim,obrigado")).toBe("Sim, obrigado");
  });

  it("splits long replies without cutting sentences", () => {
    const blocks = splitAgentReplyIntoSmartBlocks(
      [
        "Entendi seu cenário e já vou seguir pelo objetivo de organização interna.",
        "Primeiro vou considerar o que você já respondeu para não repetir etapas.",
        "Agora faz sentido entender o principal gargalo do time antes de sugerir qualquer automação."
      ].join(" "),
      { maxChars: 95, maxBlocks: 5 }
    );
    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks[0]).toMatch(/\.$/);
    expect(blocks.join(" ")).toContain("principal gargalo");
  });

  it("splits explicit paragraphs and question into separate bubbles", () => {
    const blocks = splitAgentReplyIntoSmartBlocks(
      [
        "Olá!",
        "Sou o consultor virtual da VB Solution CRM White Label.",
        "Nós ajudamos empresas a organizar vendas e automatizar atendimentos.",
        "Qual é o nome da sua empresa?"
      ].join("\n\n"),
      { maxChars: 520, maxBlocks: 12 }
    );
    expect(blocks).toEqual([
      "Olá!",
      "Sou o consultor virtual da VB Solution CRM White Label.",
      "Nós ajudamos empresas a organizar vendas e automatizar atendimentos.",
      "Qual é o nome da sua empresa?"
    ]);
  });

  it("uses OpenAI structured output to advance natural-choice context", async () => {
    jest.spyOn(PromptSmartAction, "findAll").mockResolvedValue([] as any);
    const openaiClient = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    understanding: {
                      userIntent: "organização interna",
                      currentObjective: "entender gargalo operacional",
                      currentStage: "qualificação",
                      collectedData: { interest: "organização interna" },
                      missingData: ["maior dificuldade"]
                    },
                    decision: {
                      type: "ask_missing_info",
                      reason: "cliente respondeu uma opção natural do roteiro",
                      nextQuestion: "Qual é a maior dificuldade hoje?",
                      actionSlug: null,
                      actionVariables: {}
                    },
                    reply: "Entendi, organização interna. Qual é a maior dificuldade hoje?"
                  })
                }
              }
            ]
          })
        }
      }
    };

    const ticket = makeTicket();
    const result = await runAgentOrchestrator({
      prompt: makePrompt(),
      ticket,
      contact: { id: 5, name: "Leonardo", number: "559999999999" } as any,
      userText: "Organização interna",
      recentMessages: [
        {
          fromMe: true,
          body: "Você procura mais organização interna, automação de atendimento ou crescimento nas vendas?"
        }
      ] as any,
      openaiClient
    });

    expect(result.handled).toBe(true);
    expect(result.reply).toMatch(/maior dificuldade/i);
    expect(result.reply.match(/\?/g)?.length).toBe(1);
    expect(ticket.dataWebhook.agentState.llmFirstState.collectedData.interest).toBe("organização interna");
    expect(openaiClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5.5",
        response_format: expect.objectContaining({
          type: "json_schema"
        })
      })
    );
    const payload = openaiClient.chat.completions.create.mock.calls[0][0];
    expect(
      payload.response_format.json_schema.schema.properties.understanding.properties.collectedData.type
    ).toBe("array");
    expect(payload.response_format.json_schema.schema.properties.decision.properties.actionVariables.type).toBe(
      "array"
    );
  });

  it("uses Responses API when the OpenAI client supports it", async () => {
    jest.spyOn(PromptSmartAction, "findAll").mockResolvedValue([] as any);
    const responsesCreate = jest.fn().mockResolvedValue({
      output_text: JSON.stringify({
        understanding: {
          userIntent: "organização interna",
          currentObjective: "entender gargalo operacional",
          currentStage: "qualificação",
          collectedData: [{ key: "interest", value: "organização interna" }],
          missingData: ["maior dificuldade"]
        },
        decision: {
          type: "ask_missing_info",
          reason: "cliente respondeu uma opção natural do roteiro",
          nextQuestion: "Qual é a maior dificuldade hoje?",
          actionSlug: null,
          actionVariables: []
        },
        reply: "Entendi, organização interna. Qual é a maior dificuldade hoje?"
      })
    });
    const chatCreate = jest.fn();
    const openaiClient = {
      responses: { create: responsesCreate },
      chat: { completions: { create: chatCreate } }
    };

    const result = await runAgentOrchestrator({
      prompt: makePrompt(),
      ticket: makeTicket(),
      contact: { id: 5, name: "Leonardo", number: "559999999999" } as any,
      userText: "Organização interna",
      recentMessages: [] as any,
      openaiClient
    });

    expect(result.handled).toBe(true);
    expect(result.reply).toMatch(/maior dificuldade/i);
    expect(responsesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5.5",
        max_output_tokens: expect.any(Number),
        text: expect.objectContaining({
          format: expect.objectContaining({
            type: "json_schema",
            name: "agent_orchestrator_decision"
          })
        })
      })
    );
    expect(chatCreate).not.toHaveBeenCalled();
  });

  it("ignores stale LLM-first state from an older prompt version", async () => {
    jest.spyOn(PromptSmartAction, "findAll").mockResolvedValue([] as any);
    const create = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              understanding: {
                userIntent: "automação de atendimento",
                currentObjective: "entender gargalo",
                currentStage: "qualificação atual",
                collectedData: [{ key: "interesse", value: "automação" }],
                missingData: ["maior dificuldade"]
              },
              decision: {
                type: "ask_missing_info",
                reason: "usar roteiro atual",
                nextQuestion: "Qual é a maior dificuldade no atendimento hoje?",
                actionSlug: null,
                actionVariables: []
              },
              reply: "Qual é a maior dificuldade no atendimento hoje?"
            })
          }
        }
      ]
    });

    await runAgentOrchestrator({
      prompt: makePrompt({
        id: 10,
        updatedAt: "2026-05-14T00:00:00.000Z",
        prompt: "Roteiro atual: qualificar automação de atendimento e perguntar maior dificuldade."
      }),
      ticket: makeTicket({
        agentState: {
          llmFirstState: {
            promptId: 10,
            promptStateKey: "10:2026-05-13T00:00:00.000Z",
            currentObjective: "qualificar gestação",
            currentStage: "gestação",
            lastAssistantQuestion: "Com quantas semanas de gestação você está?",
            askedQuestions: ["Com quantas semanas de gestação você está?"]
          }
        }
      }),
      contact: { id: 5, name: "Leonardo", number: "559999999999" } as any,
      userText: "Automação",
      recentMessages: [] as any,
      openaiClient: { chat: { completions: { create } } }
    });

    const payloadText = create.mock.calls[0][0].messages.map((m: any) => m.content).join("\n");
    expect(payloadText).not.toMatch(/qualificar gestação|Com quantas semanas de gestação/i);
    expect(payloadText).toMatch(/automação de atendimento/i);
  });

  it("loads the latest ticket messages and then restores chronological order", async () => {
    jest.spyOn(PromptSmartAction, "findAll").mockResolvedValue([] as any);
    const findAll = jest.spyOn(Message, "findAll").mockResolvedValue([
      { fromMe: false, body: "mensagem mais nova" },
      { fromMe: true, body: "mensagem anterior" }
    ] as any);
    const create = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              understanding: {
                userIntent: "continuar",
                currentObjective: "avançar",
                currentStage: "atual",
                collectedData: [],
                missingData: []
              },
              decision: {
                type: "reply_only",
                reason: "continuar pela última mensagem",
                nextQuestion: null,
                actionSlug: null,
                actionVariables: []
              },
              reply: "Certo, vou seguir."
            })
          }
        }
      ]
    });

    await runAgentOrchestrator({
      prompt: makePrompt(),
      ticket: makeTicket(),
      contact: { id: 5, name: "Leonardo", number: "559999999999" } as any,
      userText: "Ok",
      openaiClient: { chat: { completions: { create } } }
    });

    expect(findAll).toHaveBeenCalledWith(expect.objectContaining({ order: [["createdAt", "DESC"]] }));
    const sentMessages = create.mock.calls[0][0].messages;
    const loadedBodies = sentMessages
      .filter((m: any) => m.content === "mensagem anterior" || m.content === "mensagem mais nova")
      .map((m: any) => m.content);
    expect(loadedBodies).toEqual(["mensagem anterior", "mensagem mais nova"]);
  });

  it("uses configured premium models without requiring an experimental allow flag", async () => {
    jest.spyOn(PromptSmartAction, "findAll").mockResolvedValue([] as any);
    process.env.AGENT_LLM_FIRST_STRUCTURED_MODEL = "gpt-5.5";
    const create = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              understanding: {
                userIntent: "organização interna",
                currentObjective: "entender gargalo",
                currentStage: "qualificação",
                collectedData: { interest: "organização interna" },
                missingData: ["maior dificuldade"]
              },
              decision: {
                type: "ask_missing_info",
                reason: "modelo seguro estruturado",
                nextQuestion: "Qual é a maior dificuldade hoje?",
                actionSlug: null,
                actionVariables: {}
              },
              reply: "Entendi. Qual é a maior dificuldade hoje?"
            })
          }
        }
      ]
    });

    const result = await runAgentOrchestrator({
      prompt: makePrompt(),
      ticket: makeTicket(),
      contact: { id: 5, name: "Leonardo", number: "559999999999" } as any,
      userText: "Organização interna",
      recentMessages: [] as any,
      openaiClient: { chat: { completions: { create } } }
    });

    expect(result.handled).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].model).toBe("gpt-5.5");
  });

  it("tries the next structured model when a configured json_schema model is unsupported", async () => {
    jest.spyOn(PromptSmartAction, "findAll").mockResolvedValue([] as any);
    process.env.AGENT_LLM_FIRST_STRUCTURED_MODEL = "unsupported-model";
    const create = jest
      .fn()
      .mockRejectedValueOnce(new Error("Unsupported response_format json_schema"))
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                understanding: {
                  userIntent: "organização interna",
                  currentObjective: "entender gargalo",
                  currentStage: "qualificação",
                  collectedData: { interest: "organização interna" },
                  missingData: ["maior dificuldade"]
                },
                decision: {
                  type: "ask_missing_info",
                  reason: "fallback de schema",
                  nextQuestion: "Qual é a maior dificuldade hoje?",
                  actionSlug: null,
                  actionVariables: {}
                },
                reply: "Entendi. Qual é a maior dificuldade hoje?"
              })
            }
          }
        ]
      });

    const result = await runAgentOrchestrator({
      prompt: makePrompt(),
      ticket: makeTicket(),
      contact: { id: 5, name: "Leonardo", number: "559999999999" } as any,
      userText: "Organização interna",
      recentMessages: [] as any,
      openaiClient: { chat: { completions: { create } } }
    });

    expect(result.handled).toBe(true);
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0][0].model).toBe("unsupported-model");
    expect(create.mock.calls[1][0].model).toBe("gpt-5.5");
    expect(create.mock.calls[1][0].response_format.type).toBe("json_schema");
  });

  it("uses the customer roteiro to advance when previous outbound was blocked", async () => {
    jest.spyOn(PromptSmartAction, "findAll").mockResolvedValue([] as any);
    const create = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              understanding: {
                userIntent: "informou prioridade do atendimento",
                currentObjective: "explicar o proximo passo configurado no roteiro",
                currentStage: "etapa 3 - explicacao personalizada",
                collectedData: { priority: "automação de atendimento" },
                missingData: ["autorizacao para diagnostico"]
              },
              decision: {
                type: "ask_missing_info",
                reason: "resposta bloqueada era generica; cliente ja respondeu a etapa 2 do roteiro do cliente",
                nextQuestion: "Posso preparar o diagnóstico inicial?",
                actionSlug: null,
                actionVariables: {}
              },
              reply:
                "Com automação de atendimento, o próximo passo é mapear os gargalos atuais antes de sugerir qualquer ferramenta. Posso preparar o diagnóstico inicial?"
            })
          }
        }
      ]
    });

    const result = await runAgentOrchestrator({
      prompt: makePrompt({
        prompt: [
          "ETAPA 2 — Qualificação personalizada",
          "Pergunta: Qual prioridade você quer resolver primeiro?",
          "ETAPA 3 — Explicação personalizada",
          "Mensagem: Com automação de atendimento, o próximo passo é mapear os gargalos atuais antes de sugerir qualquer ferramenta.",
          "Pergunta: Posso preparar o diagnóstico inicial?"
        ].join("\n")
      }),
      ticket: makeTicket(),
      contact: { id: 5, name: "Leonardo", number: "559999999999" } as any,
      userText: "automação de atendimento",
      recentMessages: [
        { fromMe: true, body: "Qual prioridade você quer resolver primeiro?" },
        { fromMe: false, body: "automação de atendimento" }
      ] as any,
      blockedOutboundContext: {
        blockedReply: "Recebi sua resposta. Vou seguir com essa informação e avançar pelo próximo ponto.",
        reasons: ["approx-duplicate"]
      },
      openaiClient: { chat: { completions: { create } } }
    });

    expect(result.handled).toBe(true);
    expect(result.reply).toMatch(/automação de atendimento/i);
    expect(result.reply).toMatch(/Posso preparar o diagnóstico inicial/i);
    expect(result.reply).not.toMatch(/Recebi sua resposta|vou seguir com essa informação/i);
    expect(create.mock.calls[0][0].messages.at(-1).content).toContain("REPROCESSAMENTO OBRIGATORIO");
  });

  it("repairs repeated question when user already answered last question", async () => {
    jest.spyOn(PromptSmartAction, "findAll").mockResolvedValue([] as any);
    const create = jest
      .fn()
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                understanding: {
                  userIntent: "respondeu idade gestacional",
                  currentObjective: "qualificar gestação",
                  currentStage: "gestação",
                  collectedData: { gestationalAge: "5 semanas" },
                  missingData: ["objetivo do atendimento"]
                },
                decision: {
                  type: "ask_missing_info",
                  reason: "modelo repetiu por engano",
                  nextQuestion: "Com quantos meses ou semanas de gestação você está?",
                  actionSlug: null,
                  actionVariables: {}
                },
                reply: "Agora, com quantos meses ou semanas de gestação você está?"
              })
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                understanding: {
                  
                  userIntent: "respondeu idade gestacional",
                  currentObjective: "entender necessidade da gestante",
                  currentStage: "qualificação",
                  collectedData: { gestationalAge: "5 semanas" },
                  missingData: ["principal necessidade"]
                },
                decision: {
                  type: "ask_missing_info",
                  reason: "avançar sem repetir idade gestacional",
                  nextQuestion: "Você busca acompanhamento, orientação ou algum cuidado específico neste momento?",
                  actionSlug: null,
                  actionVariables: {}
                },
                reply: "Perfeito, 5 semanas. Você busca acompanhamento, orientação ou algum cuidado específico neste momento?"
              })
            }
          }
        ]
      });

    const result = await runAgentOrchestrator({
      prompt: makePrompt({
        prompt: "Roteiro: confirmar gestação, coletar tempo de gestação e entender a necessidade da gestante."
      }),
      ticket: makeTicket(),
      contact: { id: 5, name: "Leonardo", number: "559999999999" } as any,
      userText: "5 semanas",
      recentMessages: [
        {
          fromMe: true,
          body: "Com quantos meses ou semanas de gestação você está?"
        },
        { fromMe: false, body: "5 semanas" }
      ] as any,
      openaiClient: { chat: { completions: { create } } }
    });

    expect(create).toHaveBeenCalledTimes(2);
    expect(result.reply).toContain("5 semanas");
    expect(result.reply).not.toMatch(/com quantos meses ou semanas/i);
    expect(result.reply.match(/\?/g)?.length).toBe(1);
  });

  it("uses prior useful answer when current message is only a follow-up", async () => {
    jest.spyOn(PromptSmartAction, "findAll").mockResolvedValue([] as any);
    const create = jest
      .fn()
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                understanding: {
                  userIntent: "cobrou resposta",
                  currentObjective: "qualificar gestação",
                  currentStage: "gestação",
                  collectedData: {},
                  missingData: ["idade gestacional"]
                },
                decision: {
                  type: "ask_missing_info",
                  reason: "modelo ignorou a resposta anterior",
                  nextQuestion: "Com quantos meses ou semanas de gestação você está?",
                  actionSlug: null,
                  actionVariables: {}
                },
                reply: "Perfeito, Leonardo! Com quantos meses ou semanas de gestação você está?"
              })
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                understanding: {
                  userIntent: "respondeu idade gestacional e cobrou continuidade",
                  currentObjective: "entender necessidade da gestante",
                  currentStage: "próxima etapa",
                  collectedData: { gestationalAge: "5 semanas" },
                  missingData: ["principal necessidade"]
                },
                decision: {
                  type: "ask_missing_info",
                  reason: "usar resposta útil anterior e avançar",
                  nextQuestion: "Você procura acompanhamento de rotina ou tem alguma dúvida específica agora?",
                  actionSlug: null,
                  actionVariables: {}
                },
                reply: "Perfeito, 5 semanas. Você procura acompanhamento de rotina ou tem alguma dúvida específica agora?"
              })
            }
          }
        ]
      });

    const ticket = makeTicket();
    const result = await runAgentOrchestrator({
      prompt: makePrompt({
        prompt: "Roteiro: coletar tempo de gestação e avançar para a necessidade da gestante."
      }),
      ticket,
      contact: { id: 5, name: "Leonardo", number: "559999999999" } as any,
      userText: "Tá aí?",
      recentMessages: [
        { fromMe: true, body: "Com quantos meses ou semanas de gestação você está?" },
        { fromMe: false, body: "5 semanas" },
        { fromMe: false, body: "Tá aí?" }
      ] as any,
      openaiClient: { chat: { completions: { create } } }
    });

    expect(create).toHaveBeenCalledTimes(2);
    expect(result.reply).toContain("5 semanas");
    expect(result.reply).not.toMatch(/com quantos meses ou semanas/i);
    expect(ticket.dataWebhook.agentState.llmFirstState.lastUserAnswer).toBe("5 semanas");
  });

  it("repairs invalid JSON before falling back to legacy runtime", async () => {
    jest.spyOn(PromptSmartAction, "findAll").mockResolvedValue([] as any);
    const create = jest
      .fn()
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content:
                '{ "understanding": { "userIntent": null, "currentObjective": null, "currentStage": null, "collectedData": { "gestationPeriod": "2 semanas" }, "missingData": [] }, "decision": { "type": "ask_missing_info", "reason": "coletar próximo dado", "nextQuestion": "Você já trabalhou de carteira assinada'
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                understanding: {
                  userIntent: "respondeu tempo de gestação",
                  currentObjective: "entender histórico trabalhista",
                  currentStage: "qualificação trabalhista",
                  collectedData: { gestationPeriod: "2 semanas" },
                  missingData: ["historico de carteira assinada"]
                },
                decision: {
                  type: "ask_missing_info",
                  reason: "JSON anterior inválido reparado",
                  nextQuestion: "Você já trabalhou de carteira assinada?",
                  actionSlug: null,
                  actionVariables: {}
                },
                reply: "Entendi, 2 semanas. Você já trabalhou de carteira assinada?"
              })
            }
          }
        ]
      });

    const result = await runAgentOrchestrator({
      prompt: makePrompt({
        prompt: "Roteiro: coletar tempo de gestação e depois perguntar histórico de carteira assinada."
      }),
      ticket: makeTicket(),
      contact: { id: 5, name: "Leonardo", number: "559999999999" } as any,
      userText: "2 semanas",
      recentMessages: [
        { fromMe: true, body: "Com quantos meses ou semanas de gestação você está?" },
        { fromMe: false, body: "2 semanas" }
      ] as any,
      openaiClient: { chat: { completions: { create } } }
    });

    expect(create).toHaveBeenCalledTimes(2);
    expect(result.handled).toBe(true);
    expect(result.fallbackReason).toBeUndefined();
    expect(result.reply).toContain("2 semanas");
    expect(result.reply).toMatch(/carteira assinada/i);
  });

  it("returns recovery reply instead of legacy fallback after repeated invalid JSON", async () => {
    jest.spyOn(PromptSmartAction, "findAll").mockResolvedValue([] as any);
    const create = jest.fn().mockResolvedValue({ choices: [{ message: { content: "ok sem json" } }] });
    const result = await runAgentOrchestrator({
      prompt: makePrompt(),
      ticket: makeTicket(),
      contact: { id: 5, name: "Leonardo", number: "559999999999" } as any,
      userText: "Organização interna",
      recentMessages: [] as any,
      openaiClient: {
        chat: {
          completions: {
            create
          }
        }
      }
    });
    expect(create).toHaveBeenCalledTimes(4);
    expect(result.handled).toBe(true);
    expect(result.fallbackReason).toBeUndefined();
    expect(result.reply).toContain("Organização interna");
  });

  it("does not treat greeting as collected data when JSON recovery is needed", async () => {
    jest.spyOn(PromptSmartAction, "findAll").mockResolvedValue([] as any);
    const create = jest.fn().mockResolvedValue({ choices: [{ message: { content: "sem json" } }] });
    const result = await runAgentOrchestrator({
      prompt: makePrompt({
        attendanceFlowSteps: [
          {
            stepNumber: 1,
            customerVisibleText: "Para eu te orientar corretamente, você está grávida no momento ou o bebê já nasceu?"
          }
        ]
      }),
      ticket: makeTicket(),
      contact: { id: 5, name: "Leonardo", number: "559999999999" } as any,
      userText: "Olá",
      recentMessages: [] as any,
      openaiClient: { chat: { completions: { create } } }
    });

    expect(result.handled).toBe(true);
    expect(result.reply).not.toContain("Entendi, Olá");
    expect(result.reply).toMatch(/grávida|bebê/i);
  });
});

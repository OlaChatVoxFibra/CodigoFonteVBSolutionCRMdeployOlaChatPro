/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useRef } from "react";
import { marked } from "marked";
import { Pencil, Zap } from "lucide-react";
import BrainLiveCodePanel from "../BrainLiveCodePanel";
import BrainTooltip from "../BrainTooltip";
import { b } from "../../pages/AiBrain/brainClassNames";

export default function BrainIdeChatPanel({
  messages = [],
  loading = false,
  liveCode,
  showLiveCodeStack = false,
  composer,
  onOpenIdeBuild,
  onEditUserMessage,
  toolNameMap = {},
  assistantLabel = "BrainAI IDE Code",
  ui = (x) => x,
}) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, loading, showLiveCodeStack, liveCode?.tick]);

  return (
    <div className="brain-ide-build__chat">
      <div
        className={`brain-ide-build__chat-scroll ${b.messagesArea} brain-ide-build__chat-scroll--brain-ui`}
        ref={scrollRef}
      >
        {messages.length === 0 && !showLiveCodeStack ? (
          <div className="brain-ide-build__chat-empty">
            <p>{ui("Descreva o que você quer construir. O Brain gera o código e o preview aparece ao lado.")}</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`${b.messageRow} ${
                msg.role === "user" ? b.messageRowUser : b.messageRowAssistant
              } brain-ide-build__chat-row`}
            >
              {msg.role === "assistant" ? (
                <div className={b.messageLabelAssistant}>{ui(assistantLabel)}</div>
              ) : null}
              {msg.role === "assistant" && msg.toolCalls?.length > 0 ? (
                <div style={{ marginBottom: 4 }}>
                  {msg.toolCalls.map((tc, j) => (
                    <span key={j} className={b.toolBadge}>
                      <Zap size={8} /> {toolNameMap[tc] || tc}
                    </span>
                  ))}
                </div>
              ) : null}
              {msg.role === "assistant" && msg.codeSnapshot ? (
                <BrainLiveCodePanel
                  liveCode={msg.codeSnapshot}
                  historical
                  onOpenIdeBuild={onOpenIdeBuild}
                />
              ) : null}
              {msg.role === "user" ? (
                <div className={b.messageRowUserInner}>
                  <div className={b.messageUserHeader}>
                    <span className={b.messageLabelUser}>{ui("Você")}</span>
                    <div className={b.messageUserActions}>
                      <BrainTooltip title={ui("Editar e reenviar")}>
                        <button
                          type="button"
                          className={b.messageActionBtn}
                          onClick={() => onEditUserMessage?.(i)}
                          disabled={loading}
                        >
                          <Pencil size={11} />
                        </button>
                      </BrainTooltip>
                    </div>
                  </div>
                  <div className={b.messageContentUser}>
                    <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
                  </div>
                </div>
              ) : msg.content ? (
                <div className={b.messageContentAssistant}>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(msg.content || "", { breaks: true }),
                    }}
                  />
                </div>
              ) : null}
            </div>
          ))
        )}
        {showLiveCodeStack ? (
          <div className={`${b.messageRow} ${b.messageRowAssistant} brain-ide-build__chat-row`}>
            <BrainLiveCodePanel
              liveCode={liveCode}
              onSelectPath={liveCode?.selectPath}
              onOpenIdeBuild={onOpenIdeBuild}
            />
          </div>
        ) : null}
        {loading && !showLiveCodeStack ? (
          <div className={`${b.messageRow} ${b.messageRowAssistant} brain-ide-build__chat-row`}>
            <div className={b.messageLabelAssistant}>{ui(assistantLabel)}</div>
            <div className={b.workingBar}>
              <div className={b.typingIndicator} style={{ margin: 0 }}>
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <div className="brain-ide-build__chat-composer">{composer}</div>
    </div>
  );
}

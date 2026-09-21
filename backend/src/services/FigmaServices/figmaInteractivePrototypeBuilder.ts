/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export type NavigableScreen = {
  id: string;
  title?: string;
  html: string;
};

export type NavigableFlowLink = {
  fromScreenId: string;
  toScreenId: string;
  label?: string;
  /** Seletor CSS dentro da tela de origem (opcional; padrão: [data-goto="toScreenId"]) */
  hotspotSelector?: string;
};

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Gera HTML único com múltiplas telas e navegação por clique (protótipo navegável no browser).
 */
export function buildNavigablePrototypeHtml(params: {
  title: string;
  screens: NavigableScreen[];
  startScreenId?: string;
  width?: number;
  height?: number;
  flowLinks?: NavigableFlowLink[];
}): string {
  const screens = params.screens.filter(s => s.id && s.html);
  if (!screens.length) {
    throw new Error("Informe ao menos uma tela (id + html).");
  }

  const startId =
    params.startScreenId && screens.some(s => s.id === params.startScreenId)
      ? params.startScreenId
      : screens[0].id;

  const w = params.width || 390;
  const h = params.height || 844;
  const title = escapeHtml(params.title || "Protótipo navegável");

  const screenDivs = screens
    .map(s => {
      const active = s.id === startId ? " active" : "";
      return `<section class="vb-screen${active}" data-screen-id="${escapeHtml(s.id)}" aria-label="${escapeHtml(s.title || s.id)}">
${s.html}
</section>`;
    })
    .join("\n");

  const navItems = screens
    .map(
      s =>
        `<button type="button" class="vb-nav-item" data-goto-screen="${escapeHtml(s.id)}">${escapeHtml(s.title || s.id)}</button>`
    )
    .join("");

  const flowJson = JSON.stringify(
    (params.flowLinks || []).map(l => ({
      from: l.fromScreenId,
      to: l.toScreenId,
      label: l.label,
      hotspotSelector: l.hotspotSelector
    }))
  );

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; background: #0f0f12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .vb-shell { min-height: 100%; display: flex; flex-direction: column; align-items: center; padding: 12px 12px 0; }
    .vb-device {
      width: ${w}px;
      max-width: 100%;
      height: ${h}px;
      max-height: calc(100vh - 120px);
      background: #fff;
      border-radius: 24px;
      overflow: hidden;
      position: relative;
      box-shadow: 0 24px 80px rgba(0,0,0,0.45);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .vb-screen {
      display: none;
      position: absolute;
      inset: 0;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
    }
    .vb-screen.active { display: block; }
    .vb-bar {
      width: ${w}px;
      max-width: 100%;
      margin-top: 10px;
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      justify-content: center;
      padding-bottom: 12px;
    }
    .vb-nav-item {
      font-size: 11px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.06);
      color: #e4e4e7;
      cursor: pointer;
    }
    .vb-nav-item:hover { background: rgba(96,165,250,0.25); border-color: #60a5fa; }
    [data-goto] { cursor: pointer; }
  </style>
</head>
<body>
  <div class="vb-shell">
    <div class="vb-device" id="vb-device">
      ${screenDivs}
    </div>
    <nav class="vb-bar" aria-label="Telas do fluxo">${navItems}</nav>
  </div>
  <script>
    const FLOW_LINKS = ${flowJson};
    function showScreen(id) {
      document.querySelectorAll('.vb-screen').forEach(function(el) {
        el.classList.toggle('active', el.getAttribute('data-screen-id') === id);
      });
      document.querySelectorAll('.vb-nav-item').forEach(function(btn) {
        btn.style.outline = btn.getAttribute('data-goto-screen') === id ? '2px solid #60a5fa' : '';
      });
    }
    document.querySelectorAll('[data-goto-screen]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        showScreen(btn.getAttribute('data-goto-screen'));
      });
    });
    document.getElementById('vb-device').addEventListener('click', function(ev) {
      var t = ev.target;
      while (t && t !== document.getElementById('vb-device')) {
        if (t.getAttribute && t.getAttribute('data-goto')) {
          showScreen(t.getAttribute('data-goto'));
          return;
        }
        t = t.parentElement;
      }
    });
    FLOW_LINKS.forEach(function(link) {
      if (!link.from || !link.to) return;
      var fromEl = document.querySelector('.vb-screen[data-screen-id="' + link.from + '"]');
      if (!fromEl) return;
      var sel = link.hotspotSelector || '[data-goto="' + link.to + '"]';
      fromEl.querySelectorAll(sel).forEach(function(node) {
        node.addEventListener('click', function(e) {
          e.preventDefault();
          showScreen(link.to);
        });
      });
    });
    showScreen(${JSON.stringify(startId)});
  </script>
</body>
</html>`;
}

/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export const DEFAULT_CODE_FILES = {
  "index.html": `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Preview</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main class="app">
    <h1>Projeto de código</h1>
    <p>Peça ao Brain para gerar telas ou importe uma pasta.</p>
  </main>
  <script src="app.js"></script>
</body>
</html>`,
  "styles.css": `* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; background: #0f0f12; color: #fafafa; }
.app { padding: 24px; max-width: 480px; margin: 0 auto; }
h1 { font-size: 1.25rem; }`,
  "app.js": "console.log('Brain code sandbox');"
};

export function defaultCodeFiles(): Record<string, string> {
  return { ...DEFAULT_CODE_FILES };
}

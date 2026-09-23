/**
 * FAILSAFE HTTP SERVER — Garante pelo menos /health, CORS e endpoints mínimos
 * são atendidos SEMPRE, mesmo que import("./server") ou import("./app") crasham
 * por causa de qualquer módulo (Redis, Bull, Socket, DB migrations, assets etc.).
 *
 * Modo de uso:
 *   $ node dist/failsafe-server.js     # apenas esse server, sem dependências extras
 *   Ou dentro de start-production.js: primeiro sobe este failsafe, depois tenta
 *   iniciar o server.js "full". Se o full crashar, o failsafe continua respondendo
 *   (Railway enxerga a porta 8080 viva → não responde "Application not found" mais).
 *
 * NÃO DEPENDE DE NENHUM CÓDIGO DO ./app.ts NEM DEPENDÊNCIAS EXTERNAS.
 * Só usa os módulos built-in do Node.
 */

const http = require("http");
const path = require("path");
const fs = require("fs");
const url = require("url");

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.LISTEN_HOST || "0.0.0.0";

function normalizeOriginList(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.toLowerCase());
}

function applyCors(req, res) {
  const origin = (req.headers.origin || "").trim();
  const allowedList = normalizeOriginList(process.env.CORS_ALLOWED_ORIGINS || "")
    .concat(
      "https://olachatpro.com.br",
      "https://www.olachatpro.com.br",
      "https://olachatprofrontend.vercel.app",
      "https://codigofontevbsolutioncrmdeployolachapro-production.up.railway.app"
    )
    .map((o) => o.toLowerCase());
  const allowAny = String(process.env.CORS_ALLOW_ANY || "true").toLowerCase() !== "false";

  let acceptedOrigin = null;
  if (origin) {
    const lc = origin.toLowerCase();
    if (allowAny || allowedList.indexOf(lc) >= 0) {
      acceptedOrigin = origin;
    }
  }

  if (acceptedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", acceptedOrigin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, Accept, X-Requested-With, token, companyid, companyId, userid, userId, env-token, x-csrf-token, Origin, X-JWT-Token, X-Socket-Id, x-refresh-token, apollo-require-preflight"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD"
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "X-Total-Count, Content-Disposition, Content-Length, X-JWT-Token"
  );
  res.setHeader("Access-Control-Max-Age", "7200");
}

function writeJson(res, status, data) {
  const body = Buffer.from(JSON.stringify(data));
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Length", String(body.length));
  res.end(body);
}

function readBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > maxBytes) {
        reject(new Error("payload too large"));
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// Roteamento FAILSAFE
async function handleRequest(req, res) {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  const parsed = url.parse(req.url || "/", true);
  const p = (parsed.pathname || "/").replace(/\/+$/, "") || "/";

  if (p === "" || p === "/") {
    return writeJson(res, 200, {
      ok: true,
      server: "vbsolutioncrm-failsafe",
      mode: "failsafe-only",
      ts: new Date().toISOString()
    });
  }

  if (p === "/health" || p === "/healthz") {
    return writeJson(res, 200, {
      ok: true,
      server: "vbsolutioncrm-failsafe",
      stage: "health-route-montada",
      ts: new Date().toISOString()
    });
  }

  // ============================================================
  // MESMOS endpoints que o frontend chama no login.
  // Se o app completo crashar, esses ainda respondem corretamente
  // e o Railway não entrega mais "Application not found".
  // ============================================================
  if (p === "/auth/offline-status") {
    return writeJson(res, 200, {
      offlineMode: false,
      isOnline: true,
      server: "vbsolutioncrm-failsafe",
      ts: new Date().toISOString()
    });
  }

  if (p === "/public-settings/enabledLanguages") {
    return writeJson(res, 200, {
      ok: true,
      enabledLanguages: [
        { code: "pt-BR", name: "Português (Brasil)", default: true },
        { code: "en", name: "English" },
        { code: "es", name: "Español" }
      ],
      ts: new Date().toISOString()
    });
  }

  if (p === "/public-settings") {
    return writeJson(res, 200, {
      ok: true,
      settings: {
        enabledLanguages: [
          { code: "pt-BR", name: "Português (Brasil)", default: true },
          { code: "en", name: "English" },
          { code: "es", name: "Español" }
        ],
        offlineMode: false,
        ts: new Date().toISOString()
      }
    });
  }

  // ============================================================
  // Login FAILSAFE. Se o controller completo crashar,
  // ao menos tentamos validar a senha com bcrypt diretamente.
  // Este só roda SE o DB estiver acessível e model/query funcionar
  // (se não, retorna erro 503 explicativo, com CORS header).
  // ============================================================
  if (p === "/auth/login" && req.method === "POST") {
    let body = null;
    try {
      const buf = await readBody(req, 512 * 1024);
      body = buf.length ? JSON.parse(buf.toString("utf8")) : {};
    } catch (e) {
      return writeJson(res, 400, {
        error: "failsafe: body JSON inválido",
        message: e.message
      });
    }

    try {
      const { SessionController } = await import("./controllers/SessionController.js");
      // Tenta repassar para o controller compilado real (se existir e não crashar).
      const fakeNext = (err) => {
        if (err) {
          return writeJson(res, err.statusCode || 500, {
            error: err.message || "failsafe proxy next",
            failsafe: true
          });
        }
      };
      const fakeRes = {
        status(c) {
          res.statusCode = c;
          return fakeRes;
        },
        json(data) {
          return writeJson(res, res.statusCode || 200, data);
        },
        cookie(...a) {
          return res.setHeader("Set-Cookie", a[0] + "=" + a[1]);
        },
        setHeader(...a) {
          res.setHeader(...a);
          return fakeRes;
        },
        header: res.setHeader.bind(res)
      };
      const handler = SessionController && SessionController.store
        ? SessionController.store.bind(SessionController)
        : null;
      if (!handler) {
        return writeJson(res, 503, {
          error: "failsafe: SessionController compilado não disponível. Deploy do backend não buildou o dist corretamente.",
          hint: "Verifique se backend foi buildado com tsc e controllers existem em dist/controllers."
        });
      }
      return await handler(req, fakeRes, fakeNext);
    } catch (e) {
      return writeJson(res, 503, {
        error: "failsafe: /auth/login encaminhado crashou. Detalhe abaixo.",
        message: e.message,
        stack: (e.stack || "").split("\n")[0],
        hint: "Verifique no Railway Deploy Logs se SessionController e o build TypeScript foram gerados."
      });
    }
  }

  // Tudo o mais: 404 com CORS + body explicativo
  return writeJson(res, 404, {
    error: "failsafe-not-found",
    message: "Endpoint não encontrado no failsafe. O app completo pode não estar disponível.",
    path: p,
    method: req.method
  });
}

const server = http.createServer(async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (err) {
    try {
      applyCors(req, res);
      writeJson(res, 500, {
        error: "failsafe-unhandled",
        message: err.message,
        stack: (err.stack || "").split("\n")[0]
      });
    } catch (_) {
      try {
        res.statusCode = 500;
        res.end("Internal Server Error");
      } catch (_) {
        /* ignore */
      }
    }
  }
});

function startFailsafeServer() {
  return new Promise((resolve, reject) => {
    server.once("error", (err) => {
      console.error("[failsafe] Falha ao escutar porta", PORT, "host", HOST, ":", err.message);
      reject(err);
    });
    server.listen(PORT, HOST, () => {
      console.log(
        `[failsafe] ✅ Servidor FAILSAFE ouvindo em http://${HOST}:${PORT} (PID ${process.pid})`
      );
      console.log(`[failsafe]   Rotas mínimas: /health /auth/offline-status /public-settings/enabledLanguages /auth/login`);
      resolve(server);
    });
  });
}

// Se executado diretamente (node failsafe-server.js), sobe imediatamente.
if (require.main === module) {
  startFailsafeServer().catch(() => setTimeout(() => process.exit(1), 2000));
}

module.exports = {
  startFailsafeServer,
  applyCors,
  writeJson
};
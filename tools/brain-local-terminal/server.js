#!/usr/bin/env node
/**
 * Brain.AI — Terminal local (PowerShell/CMD/Bash na SUA máquina).
 *
 * Uso: npm run brain:terminal
 * Porta padrão: 9333 (127.0.0.1)
 *
 * O frontend Brain IDE conecta aqui — nunca no Railway/VPS.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

const HOST = process.env.BRAIN_LOCAL_TERMINAL_HOST || "127.0.0.1";
const PORT = Number(process.env.BRAIN_LOCAL_TERMINAL_PORT || 9333);
const WORKSPACE_ROOT = path.join(os.homedir(), ".vbsolution", "brain-code");
const MAX_OUTPUT = 512 * 1024;
const DEFAULT_TIMEOUT_MS = 90_000;

const BLOCKED_PATTERNS = [
  /\brm\s+-rf\s+\//i,
  /\bformat\s+[a-z]:/i,
  /\bdel\s+\/f\s+\/s\s+\/q\s+[a-z]:\\/i,
  /\bRemove-Item\s+.*-Recurse\s+.*[A-Z]:\\/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  />\s*\/dev\/sd/i,
  /\|\s*sh\s*$/i,
  /curl\s+.*\|\s*(bash|sh)/i
];

function getDefaultShell() {
  return process.platform === "win32" ? "powershell" : "bash";
}

function getAvailableShells() {
  return process.platform === "win32" ? ["powershell", "cmd", "bash"] : ["bash", "powershell"];
}

function workspaceDir(projectId, workspaceId) {
  const parts = [];
  if (projectId) parts.push(`p${projectId}`);
  if (workspaceId) parts.push(`w${workspaceId}`);
  return path.join(WORKSPACE_ROOT, parts.length ? parts.join("-") : "default");
}

function validateCommand(command) {
  const cmd = String(command || "").trim();
  if (!cmd) return "Comando vazio.";
  if (cmd.length > 4000) return "Comando muito longo.";
  for (const re of BLOCKED_PATTERNS) {
    if (re.test(cmd)) return "Comando bloqueado por segurança.";
  }
  return null;
}

function shellArgs(shell, command) {
  if (shell === "powershell") {
    return {
      exe: process.platform === "win32" ? "powershell.exe" : "pwsh",
      args: ["-NoProfile", "-NonInteractive", "-Command", command]
    };
  }
  if (shell === "cmd") {
    return { exe: "cmd.exe", args: ["/d", "/s", "/c", command] };
  }
  return { exe: "bash", args: ["-lc", command] };
}

function syncFiles(projectId, workspaceId, files) {
  const dir = workspaceDir(projectId, workspaceId);
  fs.mkdirSync(dir, { recursive: true });
  let count = 0;
  for (const [relPath, content] of Object.entries(files || {})) {
    const safe = String(relPath || "")
      .replace(/^\/+/, "")
      .replace(/\.\./g, "");
    if (!safe) continue;
    const full = path.join(dir, safe);
    const resolved = path.resolve(full);
    if (!resolved.startsWith(path.resolve(dir))) continue;
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, String(content ?? ""), "utf8");
    count += 1;
  }
  return { workspacePath: dir, fileCount: count };
}

function execCommand({ command, shell, projectId, workspaceId, files }) {
  const shellType = getAvailableShells().includes(shell) ? shell : getDefaultShell();
  const validation = validateCommand(command);
  if (validation) {
    return Promise.resolve({
      success: false,
      stdout: "",
      stderr: validation,
      exitCode: 1,
      shell: shellType,
      workspacePath: workspaceDir(projectId, workspaceId),
      error: validation
    });
  }

  if (files && Object.keys(files).length) {
    syncFiles(projectId, workspaceId, files);
  }

  const cwd = workspaceDir(projectId, workspaceId);
  fs.mkdirSync(cwd, { recursive: true });
  const { exe, args } = shellArgs(shellType, command);

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let killed = false;

    const child = spawn(exe, args, {
      cwd,
      env: { ...process.env, BRAIN_CODE_WORKSPACE: cwd },
      windowsHide: true
    });

    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGTERM");
    }, DEFAULT_TIMEOUT_MS);

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
      if (stdout.length > MAX_OUTPUT) stdout = stdout.slice(0, MAX_OUTPUT) + "\n…(truncado)";
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > MAX_OUTPUT) stderr = stderr.slice(0, MAX_OUTPUT) + "\n…(truncado)";
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        success: false,
        stdout,
        stderr: stderr || err.message,
        exitCode: 1,
        shell: shellType,
        workspacePath: cwd,
        error: err.message.includes("ENOENT")
          ? `Shell "${exe}" não encontrado. Instale PowerShell ou escolha outro shell.`
          : err.message
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        success: code === 0 && !killed,
        stdout,
        stderr: killed
          ? `${stderr}\nTempo limite (${DEFAULT_TIMEOUT_MS / 1000}s) excedido.`.trim()
          : stderr,
        exitCode: killed ? null : code,
        shell: shellType,
        workspacePath: cwd
      });
    });
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url || "/";

  try {
    if (req.method === "GET" && url === "/health") {
      const shell = getDefaultShell();
      sendJson(res, 200, {
        ok: true,
        mode: "local",
        platform: process.platform,
        hostname: os.hostname(),
        defaultShell: shell,
        availableShells: getAvailableShells(),
        workspaceRoot: WORKSPACE_ROOT,
        banner: `Brain IDE · ${shell} · máquina local\nHost: ${os.hostname()} · ${process.platform}\nPasta: ${WORKSPACE_ROOT}\n`
      });
      return;
    }

    if (req.method === "POST" && url === "/sync") {
      const body = await readBody(req);
      const result = syncFiles(body.projectId, body.workspaceId, body.files || {});
      sendJson(res, 200, { success: true, ...result });
      return;
    }

    if (req.method === "POST" && url === "/exec") {
      const body = await readBody(req);
      const result = await execCommand({
        command: body.command,
        shell: body.shell,
        projectId: body.projectId,
        workspaceId: body.workspaceId,
        files: body.files
      });
      sendJson(res, 200, result);
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (e) {
    sendJson(res, 500, { error: e?.message || "Erro interno" });
  }
});

server.listen(PORT, HOST, () => {
  console.log("");
  console.log("  Brain.AI — Terminal LOCAL");
  console.log(`  http://${HOST}:${PORT}`);
  console.log(`  Workspace: ${WORKSPACE_ROOT}`);
  console.log("  Comandos rodam no PowerShell/CMD deste PC (não no Railway).");
  console.log("  Deixe este processo aberto enquanto usa o IDE Build.");
  console.log("");
});

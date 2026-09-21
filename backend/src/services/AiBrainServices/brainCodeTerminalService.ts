/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { spawn } from "child_process";
import os from "os";
import { getBrainCodeWorkspaceDir, syncBrainCodeWorkspace } from "./brainCodeWorkspaceService";

export type BrainTerminalShell = "powershell" | "cmd" | "bash";

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

const MAX_OUTPUT = 512 * 1024;
const DEFAULT_TIMEOUT_MS = 90_000;

export function getDefaultTerminalShell(): BrainTerminalShell {
  return process.platform === "win32" ? "powershell" : "bash";
}

export function getTerminalInfo(): {
  platform: string;
  defaultShell: BrainTerminalShell;
  availableShells: BrainTerminalShell[];
} {
  const available: BrainTerminalShell[] =
    process.platform === "win32" ? ["powershell", "cmd", "bash"] : ["bash", "powershell"];
  return {
    platform: process.platform,
    defaultShell: getDefaultTerminalShell(),
    availableShells: available
  };
}

function validateCommand(command: string): string | null {
  const cmd = String(command || "").trim();
  if (!cmd) return "Comando vazio.";
  if (cmd.length > 4000) return "Comando muito longo.";
  for (const re of BLOCKED_PATTERNS) {
    if (re.test(cmd)) return "Comando bloqueado por segurança.";
  }
  return null;
}

function shellArgs(shell: BrainTerminalShell, command: string): { exe: string; args: string[] } {
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

export async function execBrainCodeTerminal(params: {
  companyId: number;
  userId: number;
  command: string;
  shell?: BrainTerminalShell;
  files?: Record<string, string>;
  projectId?: number;
}): Promise<{
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  shell: BrainTerminalShell;
  workspacePath: string;
  error?: string;
}> {
  const shell = params.shell || getDefaultTerminalShell();
  const validation = validateCommand(params.command);
  if (validation) {
    return {
      success: false,
      stdout: "",
      stderr: validation,
      exitCode: 1,
      shell,
      workspacePath: getBrainCodeWorkspaceDir(params.companyId, params.userId, params.projectId),
      error: validation
    };
  }

  if (params.files && Object.keys(params.files).length) {
    await syncBrainCodeWorkspace(params.companyId, params.userId, params.files, params.projectId);
  }

  const cwd = getBrainCodeWorkspaceDir(params.companyId, params.userId, params.projectId);
  const { exe, args } = shellArgs(shell, params.command);

  return new Promise(resolve => {
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

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
      if (stdout.length > MAX_OUTPUT) stdout = stdout.slice(0, MAX_OUTPUT) + "\n…(truncado)";
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > MAX_OUTPUT) stderr = stderr.slice(0, MAX_OUTPUT) + "\n…(truncado)";
    });

    child.on("error", (err: Error) => {
      clearTimeout(timer);
      resolve({
        success: false,
        stdout,
        stderr: stderr || err.message,
        exitCode: 1,
        shell,
        workspacePath: cwd,
        error:
          err.message.includes("ENOENT")
            ? `Shell "${exe}" não encontrado no servidor. Tente outro shell ou instale PowerShell.`
            : err.message
      });
    });

    child.on("close", code => {
      clearTimeout(timer);
      resolve({
        success: code === 0 && !killed,
        stdout,
        stderr: killed
          ? `${stderr}\nTempo limite (${DEFAULT_TIMEOUT_MS / 1000}s) excedido.`.trim()
          : stderr,
        exitCode: killed ? null : code,
        shell,
        workspacePath: cwd
      });
    });
  });
}

export function getTerminalBanner(shell: BrainTerminalShell): string {
  const host = os.hostname();
  return `Brain IDE · ${shell} · workspace do projeto\nHost: ${host} · ${process.platform}\n`;
}

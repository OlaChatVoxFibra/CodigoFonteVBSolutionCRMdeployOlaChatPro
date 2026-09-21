#!/usr/bin/env node
/**
 * Libera a porta do frontend (5181) se um processo antigo estiver ocupando.
 */
const { execSync } = require("child_process");

const port = String(process.env.PORT || 5181);

function freeOnWindows() {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid) && pid !== "0") pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`[free-port] Processo ${pid} na porta ${port} encerrado.`);
      } catch {
        // ignore
      }
    }
  } catch {
    // porta livre
  }
}

if (process.platform === "win32") {
  freeOnWindows();
}

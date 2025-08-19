import { spawn } from "child_process";

export interface ShellOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  detached?: boolean;
  stdio?: "ignore" | "pipe" | "inherit";
  timeout?: number;
}

export function runShell(
  cmd: string,
  opts: { cwd?: string; env?: NodeJS.ProcessEnv; detached?: boolean } = {},
) {
  const child = spawn("/bin/zsh", ["-lc", cmd], {
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env },
    stdio: "ignore", // or 'pipe' if you want logs back
    detached: !!opts.detached,
  });
  if (opts.detached) child.unref();
  return child;
}

export function runShellSync(
  cmd: string,
  opts: Omit<ShellOptions, "detached"> = {},
) {
  return new Promise<{ code: number; stdout: string; stderr: string }>(
    (resolve, reject) => {
      const child = spawn("/bin/zsh", ["-lc", cmd], {
        cwd: opts.cwd,
        env: { ...process.env, ...opts.env },
        stdio: "pipe",
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        resolve({
          code: code || 0,
          stdout,
          stderr,
        });
      });

      child.on("error", reject);

      // Handle timeout if specified
      if (opts.timeout) {
        setTimeout(() => {
          if (!child.killed) {
            child.kill("SIGTERM");
          }
        }, opts.timeout * 1000);
      }
    },
  );
}

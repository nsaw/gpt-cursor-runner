// ***REMOVED*** Relay Core — Phase 4 Signal Bus
import http from "http";

function post(path: string, data: any) {
  const json = JSON.stringify(data);
  const req = http.request({
    method: "POST",
    hostname: "localhost",
    port: 5051,
    path,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": json.length,
    },
  });
  req.write(json);
  req.end();
}

export function emitPatchComplete(patchId: string) {
  post("/webhook/ghost-relay", { type: "patch-complete", patchId });
}

export function emitSummaryWrite(summary: string) {
  post("/webhook/ghost-relay", { type: "summary-write", summary });
}

export function emitMonitorStatus(status: string) {
  post("/webhook/ghost-relay", { type: "monitor-status", status });
}

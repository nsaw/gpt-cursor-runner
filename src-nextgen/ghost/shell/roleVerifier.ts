// Role Verifier — GHOST Trust Enforcement
import { emitPatchComplete } from "./relayCore";

const allowedRoles = ["GPT", "GPT2", "GHOST", "COACH"];

export function verifyPatchRoles(patch: any): boolean {
  const role = patch?.git?.commit?.toUpperCase() || "";
  const tag = patch?.tag?.toUpperCase() || "";
  const match = allowedRoles.some((r) => role.includes(r) || tag.includes(r));
  if (!match) {
    console.error("[RoleVerifier] ❌ PATCH BLOCKED — unauthorized role");
    emitPatchComplete("BLOCKED_UNAUTHORIZED_ROLE");
    return false;
  }
  console.log(`[RoleVerifier] ✅ PATCH PASSED: role = ${role || tag}`);
  return true;
}

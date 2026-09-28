const SECRET_KEY_RE =
  /(secret|token|password|passwd|pwd|credential|private|api[_-]?key|access[_-]?key|(^|[_-])key($|[_-])|auth|bearer|session|cookie|signing|webhook|dsn)/i;

/** URLs that embed userinfo (user:pass@host or key@host), e.g. DATABASE_URL / SENTRY_DSN. */
const URL_WITH_CREDENTIALS_RE =
  /^[a-z][a-z0-9+.-]*:\/\/[^/\s]*@/i;

const SECRET_VALUE_RE =
  /^(sk-|pk_|rk_|ghp_|gho_|github_pat_|xox[baprs]-|AKIA|ASIA|ya29\.|eyJ[A-Za-z0-9_-]{10,}\.|-----BEGIN )/i;

/** True when key name or value shape suggests a secret. */
export function looksLikeSecret(key: string, value: string | null | undefined): boolean {
  if (SECRET_KEY_RE.test(key)) return true;
  if (value == null || value === "") return false;
  if (SECRET_VALUE_RE.test(value)) return true;
  if (URL_WITH_CREDENTIALS_RE.test(value)) return true;
  // Long opaque tokens (hex / base64-ish) without spaces
  if (value.length >= 24 && !/\s/.test(value) && /^[A-Za-z0-9+/=_\-.]+$/.test(value)) {
    return true;
  }
  return false;
}

/**
 * Mask secret-like values for display/export.
 * Short secrets → length-only; longer → last 4 chars (or full length note).
 * Non-secrets returned as-is (truncated if huge).
 */
export function maskValue(
  key: string,
  value: string | null | undefined,
): string {
  if (value == null) return "—";
  if (value === "") return "(empty)";

  const secret = looksLikeSecret(key, value);
  if (!secret) {
    if (value.length > 120) return `${value.slice(0, 117)}…`;
    return value;
  }

  if (value.length <= 4) {
    return `•••• (len ${value.length})`;
  }
  return `••••${value.slice(-4)} (len ${value.length})`;
}

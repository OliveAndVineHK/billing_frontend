const TOKEN_KEY = "billing_token";
const ENTITY_ID_KEY = "billing_entity_id";
const ENTITY_NAME_KEY = "billing_entity_name";

export type AuthInfo = {
  token: string;
  entityId: string;
  entityName: string;
};

export function setAuth(token: string, entityId: string, entityName: string) {
  const maxAge = 60 * 30; // 30 minutes — matches JWT exp issued by Flask
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  const opts = `path=/;max-age=${maxAge};SameSite=Lax${isSecure ? ";Secure" : ""}`;
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)};${opts}`;
  document.cookie = `${ENTITY_ID_KEY}=${encodeURIComponent(entityId)};${opts}`;
  document.cookie = `${ENTITY_NAME_KEY}=${encodeURIComponent(entityName)};${opts}`;
}

export function getAuth(): AuthInfo | null {
  if (typeof document === "undefined") return null;
  const jar = Object.fromEntries(
    document.cookie
      .split("; ")
      .filter(Boolean)
      .map((c) => {
        const idx = c.indexOf("=");
        return [c.slice(0, idx), decodeURIComponent(c.slice(idx + 1))];
      }),
  );
  const token = jar[TOKEN_KEY];
  if (!token) return null;
  return {
    token,
    entityId: jar[ENTITY_ID_KEY] ?? "",
    entityName: jar[ENTITY_NAME_KEY] ?? "",
  };
}

export function clearAuth() {
  const expire = "path=/;max-age=0";
  document.cookie = `${TOKEN_KEY}=;${expire}`;
  document.cookie = `${ENTITY_ID_KEY}=;${expire}`;
  document.cookie = `${ENTITY_NAME_KEY}=;${expire}`;
}

/** Cookie name checked by Next.js middleware for auth gating. */
export const AUTH_COOKIE_NAME = TOKEN_KEY;

const MODULE1_URL =
  process.env.NEXT_PUBLIC_MODULE1_URL ?? "http://localhost:5001";

/** Clear cookies and redirect the browser back to Module 1 login. */
export function redirectToLogin() {
  clearAuth();
  window.location.href = `${MODULE1_URL}/login`;
}

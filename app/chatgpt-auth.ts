import { headers } from "next/headers";
import { redirect } from "next/navigation";

// 後台登入：信箱 + 管理密碼（ADMIN_PASSWORD），成功後簽發 HMAC 簽章 cookie。
// 不信任任何外部傳入的身分 header，可安全部署在公開的 Cloudflare Worker。
export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

export const SESSION_COOKIE = "bubu_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const SIGN_IN_PATH = "/admin/login";
const SIGN_OUT_PATH = "/api/auth/logout";

function secret(name: string): string {
  return process.env[name] || "";
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(value: string): Uint8Array<ArrayBuffer> {
  const s = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function hmacKey(): Promise<CryptoKey | null> {
  const key = secret("SESSION_SECRET");
  if (key.length < 32) return null;
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionToken(email: string): Promise<string | null> {
  const key = await hmacKey();
  if (!key) return null;
  const payload = b64url(
    new TextEncoder().encode(
      JSON.stringify({ email, exp: Date.now() + SESSION_MAX_AGE * 1000 }),
    ),
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)),
  );
  return `${payload}.${b64url(sig)}`;
}

async function readSessionToken(token: string): Promise<string | null> {
  const key = await hmacKey();
  const [payload, sig] = token.split(".");
  if (!key || !payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      fromB64url(sig),
      new TextEncoder().encode(payload),
    );
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as {
      email?: string;
      exp?: number;
    };
    if (!data.email || !data.exp || data.exp < Date.now()) return null;
    return data.email;
  } catch {
    return null;
  }
}

/** 以常數時間比對管理密碼；未設定 ADMIN_PASSWORD 時一律拒絕。 */
export async function passwordMatches(input: string): Promise<boolean> {
  const expected = secret("ADMIN_PASSWORD");
  if (expected.length < 8) return false;
  const digest = async (v: string) =>
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)),
    );
  const [a, b] = await Promise.all([digest(input), digest(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie") ?? "";
  const token = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(SESSION_COOKIE + "="))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!token) return null;
  const email = await readSessionToken(decodeURIComponent(token));
  if (!email) return null;
  return { userId: email, displayName: email, email, fullName: null };
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (url.pathname === SIGN_OUT_PATH || url.pathname.startsWith("/api/auth/"))
    return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

function encode(userId: string, expiresAt: number): string {
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt })).toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function decode(token: string): { userId: string; expiresAt: number } | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof decoded.userId !== "string" || typeof decoded.expiresAt !== "number") return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function createSession(userId: string): Promise<void> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, encode(userId, expiresAt), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function verifySession(): Promise<{ userId: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const decoded = decode(token);
  if (!decoded || decoded.expiresAt < Date.now()) return null;

  return { userId: decoded.userId };
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

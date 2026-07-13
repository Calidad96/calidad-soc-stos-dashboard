import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'calidad_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  email: string;
  role: 'shared';
}

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.DASHBOARD_AUTH_PASSWORD && process.env.AUTH_SECRET);
}

export async function createSessionToken(email: string): Promise<string | null> {
  const key = secretKey();
  if (!key) return null;

  return new SignJWT({ email: email.trim().toLowerCase(), role: 'shared' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key);
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  const key = secretKey();
  if (!key) return null;

  try {
    const { payload } = await jwtVerify(token, key);
    if (typeof payload.email !== 'string') return null;
    return {
      email: payload.email,
      role: 'shared',
    };
  } catch {
    return null;
  }
}

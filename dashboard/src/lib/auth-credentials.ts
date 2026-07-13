import { timingSafeEqual } from 'crypto';

export function getAuthEmail(): string {
  return (
    process.env.DASHBOARD_AUTH_EMAIL?.trim().toLowerCase() ??
    'integrations@calidads.net'
  );
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyCredentials(email: string, password: string): boolean {
  const expectedPassword = (process.env.DASHBOARD_AUTH_PASSWORD ?? '').trim();
  if (!expectedPassword) return false;

  const expectedEmail = getAuthEmail();
  const emailOk = email.trim().toLowerCase() === expectedEmail;
  if (!emailOk) return false;

  return safeEqual(password, expectedPassword);
}

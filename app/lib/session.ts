import { cookies } from 'next/headers';

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  accountId: string;
};

const SESSION_COOKIE = 'tt_session';
const SECRET = process.env.SESSION_SECRET || 'fallback-dev-secret-change-me';

function base64url(str: string) {
  return Buffer.from(str).toString('base64url');
}

function fromBase64url(str: string) {
  return Buffer.from(str, 'base64url').toString('utf8');
}

export async function setSession(user: SessionUser) {
  const payload = base64url(JSON.stringify({ ...user, _ts: Date.now() }));
  const sig = base64url(SECRET + payload);
  const token = `${payload}.${sig}`;
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const [payload, sig] = token.split('.');
    const expectedSig = base64url(SECRET + payload);
    if (sig !== expectedSig) return null;
    const data = JSON.parse(fromBase64url(payload));
    return data as SessionUser;
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

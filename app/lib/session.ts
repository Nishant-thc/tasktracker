import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  accountId: string;
  _ts?: number;
};

const SESSION_COOKIE = 'tt_session';

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET environment variable is missing or too short. It must be at least 32 characters long.');
  }
  return secret;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionUser>(cookieStore, {
    cookieName: SESSION_COOKIE,
    password: getSecret(),
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    },
  });

  if (!session.id) return null;

  // Check 7-day expiry
  if (session._ts && Date.now() - session._ts > 7 * 24 * 60 * 60 * 1000) {
    session.destroy();
    return null;
  }

  return session as SessionUser;
}

export async function setSession(user: SessionUser) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionUser>(cookieStore, {
    cookieName: SESSION_COOKIE,
    password: getSecret(),
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    },
  });

  session.id = user.id;
  session.email = user.email;
  session.name = user.name;
  session.role = user.role;
  session.accountId = user.accountId;
  session._ts = Date.now();

  await session.save();
}

export async function clearSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionUser>(cookieStore, {
    cookieName: SESSION_COOKIE,
    password: getSecret(),
  });
  session.destroy();
}

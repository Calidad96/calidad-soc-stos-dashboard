import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth-session';

function isPublicPath(pathname: string): boolean {
  if (pathname === '/login') return true;
  if (pathname === '/favicon.ico') return true;
  if (pathname === '/icon' || pathname.startsWith('/icon.')) return true;
  if (pathname === '/apple-icon' || pathname.startsWith('/apple-icon.')) return true;
  if (pathname === '/api/auth/login') return true;
  if (pathname === '/api/auth/logout') return true;
  if (pathname === '/api/cron/sync') return true;
  if (pathname.startsWith('/_next')) return true;
  if (/\.(png|jpg|jpeg|ico|svg|webp|woff2?)$/i.test(pathname)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (session) {
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/login', request.url);
  if (pathname !== '/') {
    loginUrl.searchParams.set('from', pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|calidad-logo\\.png).*)'],
};

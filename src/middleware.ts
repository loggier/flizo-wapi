import { NextResponse, type NextRequest } from 'next/server';
import { decrypt } from '@/lib/session';

const protectedRoutes = ['/'];
const publicRoutes = ['/login'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.includes(path);

  if (isProtectedRoute) {
    const cookie = request.cookies.get('session')?.value;
    const session = await decrypt(cookie || '');

    if (!session?.user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};

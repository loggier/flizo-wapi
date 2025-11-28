import { NextResponse, type NextRequest } from 'next/server';
import { decrypt } from '@/lib/session';

const protectedRoutes = ['/'];
const publicRoutes = ['/login'];

// Check if essential environment variables are set
const areVarsSet = 
  process.env.EVOLUTION_API_URL &&
  process.env.EVOLUTION_API_KEY &&
  process.env.AUTH_USER &&
  process.env.AUTH_PASSWORD &&
  process.env.AUTH_SECRET;

const showDevInfo = process.env.NODE_ENV === 'development' && !areVarsSet;


export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.includes(path);
  const isPublicRoute = publicRoutes.includes(path);

  if (isPublicRoute && path === '/login' && showDevInfo) {
    const url = request.nextUrl.clone();
    url.searchParams.set('showDevInfo', 'true');
    return NextResponse.rewrite(url);
  }

  if (isProtectedRoute) {
    const cookie = request.cookies.get('session')?.value;
    if (!cookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const session = await decrypt(cookie);

    if (!session?.user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};

import { NextResponse, type NextRequest } from 'next/server';

const publicRoutes = ['/login'];

// Check if essential environment variables are set
const areVarsSet = 
  process.env.FLIZOWAPI_API_URL &&
  process.env.FLIZOWAPI_API_KEY &&
  process.env.AUTH_USER &&
  process.env.AUTH_PASSWORD &&
  process.env.AUTH_SECRET;

const showDevInfo = process.env.NODE_ENV === 'development' && !areVarsSet;


export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(path);

  if (isPublicRoute && path === '/login' && showDevInfo) {
    const url = request.nextUrl.clone();
    url.searchParams.set('showDevInfo', 'true');
    return NextResponse.rewrite(url);
  }

  // Client-side authentication is now responsible for route protection.
  // The middleware's role is simplified.

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};

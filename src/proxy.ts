import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { locales } from './i18n/config';

const handleI18nRouting = createMiddleware(routing);

const OLD_ROUTES = ['/challenges', '/paths'];

export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 301 redirect old routes to /learn/* (only locale-prefixed paths)
  let locale = '';
  let barePath = pathname;
  for (const l of locales) {
    if (pathname.startsWith(`/${l}/`) || pathname === `/${l}`) {
      locale = l;
      barePath = pathname.slice(`/${l}`.length) || '/';
      break;
    }
  }

  if (locale) {
    const needsRedirect = OLD_ROUTES.some(
      (route) => barePath === route || barePath.startsWith(route + '/')
    );
    if (needsRedirect) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/learn${barePath}`;
      return NextResponse.redirect(url, 301);
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);
  const response = handleI18nRouting(request);
  if (response.status === 200) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  return response;
}

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
};

import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { routing } from './routing';

async function getPathname(): Promise<string | null> {
  try {
    const h = await headers();
    const path = h.get('x-pathname');
    if (path) return path;
    const url = h.get('x-url') ?? h.get('referer');
    if (url?.startsWith('http')) return new URL(url).pathname;
  } catch {
    // headers() may throw in some contexts
  }
  return null;
}

function needsNamespace(pathname: string | null, ns: string): boolean {
  if (!pathname) return true; // fallback: load all
  const normalized = pathname.replace(/^\/(en|zh)/, '');
  return normalized === `/${ns}` || normalized.startsWith(`/${ns}/`);
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as 'en' | 'zh')) {
    locale = routing.defaultLocale;
  }

  const base = (await import(`../../messages/${locale}.json`)).default as Record<string, unknown>;
  const pathname = await getPathname();
  const messages = { ...base };

  if (needsNamespace(pathname, 'privacy')) {
    const m = (await import(`../../messages/${locale}-privacy.json`)).default as Record<string, unknown>;
    Object.assign(messages, m);
  }
  if (needsNamespace(pathname, 'terms')) {
    const m = (await import(`../../messages/${locale}-terms.json`)).default as Record<string, unknown>;
    Object.assign(messages, m);
  }
  // Always load activities: pathname-based loading fails during client-side navigation
  const activities = (await import(`../../messages/${locale}-activities.json`)).default as Record<string, unknown>;
  Object.assign(messages, activities);

  return {
    locale,
    messages,
  };
});

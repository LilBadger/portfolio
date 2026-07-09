function basePath(): string {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

function routePath(path = ''): string {
  const cleanPath = path.replace(/^\/+|\/+$/g, '');
  return cleanPath ? `${basePath()}${cleanPath}/` : basePath();
}

export const homeHref = routePath();

export function homeSectionHref(section: string): string {
  return `${homeHref}#${section.replace(/^#/, '')}`;
}

export function projectHref(slug: string): string {
  return routePath(`projects/${slug}`);
}

export function articleHref(slug: string): string {
  return routePath(`articles/${slug}`);
}

export function pageHref(slug: string): string {
  return routePath(`pages/${slug}`);
}

export function pathWithoutBase(pathname: string): string {
  const base = basePath();
  const normalizedPath = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.replace(/^\//, '');
  return normalizedPath.replace(/^\/+|\/+$/g, '');
}

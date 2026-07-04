export function assetPath(path: string | undefined): string {
  if (!path) return `${import.meta.env.BASE_URL}assets/placeholder-project.svg`;
  if (/^https?:\/\//i.test(path)) return path;
  const cleanPath = path.replace(/^\//, '');
  return `${import.meta.env.BASE_URL}${cleanPath}`;
}

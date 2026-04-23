/**
 * Сборка полного URL для fetch (относительный путь или абсолютный VITE_API_BASE).
 * Вынесено в чистую функцию для юнит-тестов (абсолютный base без потери host).
 */
export function buildFetchUrl(
  path: string,
  origin: string,
  opts?: { viteApiBase?: string; search?: Record<string, string | undefined> },
): string {
  const b = (opts?.viteApiBase ?? "").replace(/\/$/, "");
  const p = b ? `${b}${path}` : path;
  const u = p.startsWith("http") ? new URL(p) : new URL(p, origin);
  if (opts?.search) {
    for (const [k, v] of Object.entries(opts.search)) {
      if (v !== undefined && v !== null) u.searchParams.set(k, v);
    }
  }
  return u.toString();
}

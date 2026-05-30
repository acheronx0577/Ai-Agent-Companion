const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

export function resolveLocalServiceUrl(pathname, {
  envVar = "WAKU_BASE_URL",
  fallback = "http://127.0.0.1:5000",
} = {}) {
  const base = (process.env[envVar] || fallback).trim();
  const url = new URL(pathname, base.endsWith("/") ? base : `${base}/`);
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(`${envVar} must target localhost (got ${url.origin})`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported protocol: ${url.protocol}`);
  }
  return url.href;
}

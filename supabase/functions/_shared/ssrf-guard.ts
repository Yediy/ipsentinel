// SSRF Protection: Prevent fetching from private/internal networks
// Allowed hosts should be configured via environment variable

const ALLOWED_HOSTS = (Deno.env.get("ALLOWED_ASSET_HOSTS") || "")
  .split(",")
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

// Add default safe hosts if none configured
const DEFAULT_SAFE_HOSTS = [
  "storage.googleapis.com",
  "s3.amazonaws.com", 
  "cloudfront.net",
  "supabase.co",
  "lovable.dev"
];

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(n => parseInt(n, 10));
  if (parts.length !== 4 || parts.some(n => isNaN(n) || n < 0 || n > 255)) {
    return false;
  }

  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  
  // 127.0.0.0/8 (loopback)
  if (parts[0] === 127) return true;
  
  // 169.254.0.0/16 (link-local)
  if (parts[0] === 169 && parts[1] === 254) return true;
  
  // 0.0.0.0/8
  if (parts[0] === 0) return true;

  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  
  // Loopback ::1
  if (lower === "::1") return true;
  
  // Link-local fe80::/10
  if (lower.startsWith("fe80:")) return true;
  
  // Unique local fc00::/7
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;

  return false;
}

export async function assertSafeFetch(rawUrl: string): Promise<void> {
  let url: URL;
  
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL format");
  }

  // Only allow HTTPS (or HTTP for localhost in development)
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only HTTPS protocol allowed");
  }

  // Allow HTTP only for localhost in development
  if (url.protocol === "http:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("HTTP only allowed for localhost");
  }

  const hostname = url.hostname.toLowerCase();

  // Check against allowed hosts
  const allowedHosts = ALLOWED_HOSTS.length > 0 ? ALLOWED_HOSTS : DEFAULT_SAFE_HOSTS;
  const isAllowed = allowedHosts.some(allowed => 
    hostname === allowed || hostname.endsWith("." + allowed)
  );

  if (!isAllowed) {
    throw new Error(`Host ${hostname} is not in the allowed list`);
  }

  // DNS resolution and IP check
  try {
    const addresses = await Deno.resolveDns(hostname, "A").catch(() => [] as string[]);
    const addressesIPv6 = await Deno.resolveDns(hostname, "AAAA").catch(() => [] as string[]);

    for (const addr of addresses) {
      if (isPrivateIPv4(addr)) {
        throw new Error(`Private IPv4 address blocked: ${addr}`);
      }
    }

    for (const addr of addressesIPv6) {
      if (isPrivateIPv6(addr)) {
        throw new Error(`Private IPv6 address blocked: ${addr}`);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("blocked")) {
      throw error;
    }
    // DNS resolution failed, but we'll allow it if host is in allow list
    console.warn(`DNS resolution failed for ${hostname}, but host is allowed`);
  }
}

export async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  await assertSafeFetch(url);
  return fetch(url, options);
}

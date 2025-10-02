import dns from "node:dns/promises";

function isPrivateIPv4(ip: string): boolean {
  return /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(ip);
}

export async function assertSafeFetch(rawUrl: string): Promise<void> {
  const u = new URL(rawUrl);
  
  if (u.protocol !== "https:") {
    throw new Error("Only HTTPS allowed");
  }
  
  const allowed = (process.env.ALLOWED_ASSET_HOSTS || "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  
  const host = u.hostname.toLowerCase();
  
  if (!allowed.some(a => host === a || host.endsWith("." + a))) {
    throw new Error(`Host not allowed: ${host}`);
  }
  
  try {
    const addrs = await dns.lookup(host, { all: true });
    
    for (const addr of addrs) {
      if (addr.family === 4 && isPrivateIPv4(addr.address)) {
        throw new Error("Private IP address not allowed");
      }
    }
  } catch (err: any) {
    if (err.code === "ENOTFOUND") {
      throw new Error("Host not found");
    }
    throw err;
  }
}

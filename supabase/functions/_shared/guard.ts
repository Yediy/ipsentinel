export function withGuard(handler: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    const origin = req.headers.get("origin") || "";
    const allowed = (Deno.env.get("CORS_ORIGINS") || "").split(",").map(s => s.trim());
    const cors = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : "null",
      "Access-Control-Allow-Methods": "POST,OPTIONS,GET",
      "Access-Control-Allow-Headers": "content-type,authorization,apikey"
    };
    
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: cors });
    }
    
    const ct = req.headers.get("content-type") || "";
    if (req.method !== "GET" && !ct.includes("application/json")) {
      return new Response(
        JSON.stringify({ error: "UnsupportedMediaType" }), 
        { 
          status: 415, 
          headers: { ...cors, "Content-Type": "application/json" } 
        }
      );
    }
    
    const res = await handler(req);
    const h = new Headers(res.headers);
    Object.entries(cors).forEach(([k, v]) => h.set(k, v));
    return new Response(res.body, { status: res.status, headers: h });
  };
}

// supabase/functions/stripe-webhook/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.23.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE")!;
const CORS_ORIGINS = (Deno.env.get("CORS_ORIGINS") ?? "").split(",").map(s => s.trim()).filter(Boolean);

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" });

function cors(resp: Response, req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allow = CORS_ORIGINS.includes(origin) ? origin : "";
  const hdrs = new Headers(resp.headers);
  if (allow) {
    hdrs.set("access-control-allow-origin", allow);
    hdrs.set("vary", "origin");
  }
  return new Response(resp.body, { status: resp.status, headers: hdrs });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return cors(
      new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-methods": "POST,OPTIONS",
          "access-control-allow-headers": "content-type, stripe-signature",
          "access-control-max-age": "86400"
        }
      }),
      req
    );
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature") ?? "";
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
    } catch (_err) {
      return cors(
        new Response(JSON.stringify({ ok: false, error: "invalid_signature" }), { status: 400 }),
        req
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

    const { data: existing, error: idErr } = await supabase
      .from("webhook_events")
      .select("id")
      .eq("id", event.id)
      .single();

    if (!idErr && existing) {
      return cors(new Response(JSON.stringify({ ok: true, duplicate: true })), req);
    }
    await supabase.from("webhook_events").insert({ id: event.id, provider: "stripe", type: event.type });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const session_id = session.id;
        const amount_total = session.amount_total ?? null;
        const currency = session.currency ?? null;
        const payment_status = session.payment_status ?? null;
        const metadata = session.metadata ?? {};
        const filing_id = metadata["filing_id"] ?? null;
        if (!filing_id) break;

        await supabase.from("payments").upsert({
          session_id,
          filing_id,
          status: payment_status,
          amount: amount_total,
          currency
        }, { onConflict: "session_id" });

        await supabase.from("filings")
          .update({ status: "paid" })
          .eq("id", filing_id);

        await supabase.rpc("notify_user", {
          p_user_id: null,
          p_filing_id: filing_id,
          p_subject: "Payment received",
          p_body: "Your payment was received. We're generating your filing package now."
        });

        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const session_id = session.id;
        await supabase.from("payments")
          .update({ status: "expired" })
          .eq("session_id", session_id);
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const session_id = (pi.latest_charge ?? "").toString();
        if (session_id) {
          await supabase.from("payments")
            .update({ status: "failed" })
            .eq("session_id", session_id);
        }
        break;
      }

      default:
        break;
    }

    return cors(new Response(JSON.stringify({ ok: true })), req);
  } catch (_err) {
    return cors(new Response(JSON.stringify({ ok: false }), { status: 500 }), req);
  }
});

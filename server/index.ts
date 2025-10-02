import "dotenv/config";
import express from "express";
import * as Sentry from "@sentry/node";
import pino from "pino";
import pinoHttp from "pino-http";
import Stripe from "stripe";
import multer from "multer";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import { configureSecurity } from "./security/app-security";
import { assertSafeFetch } from "./security/ssrf";
import { anyUpload, ensureAllowed } from "./security/uploads";
import { validate, TransformSchema, ExportZipSchema } from "./security/validators";

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || "info" });
app.use(pinoHttp({ logger }));

// ===== Sentry =====
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV || "development"
  });
  app.use(Sentry.Handlers.requestHandler());
}

// ===== Stripe webhook (RAW body) FIRST =====
if (process.env.STRIPE_WEBHOOK_SECRET) {
  const stripe = new Stripe(process.env.STRIPE_API_KEY || "sk_test", {
    apiVersion: "2024-06-20"
  });

  app.post("/webhooks/stripe", express.raw({ type: "application/json" }), (req, res) => {
    try {
      const sig = req.headers["stripe-signature"] as string;
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      logger.info({ event: event.type }, "Stripe webhook received");
      
      // Handle events you care about
      // TODO: Process payment_intent.succeeded, etc.
      
      return res.json({ received: true });
    } catch (e: any) {
      logger.error({ error: e.message }, "Stripe webhook error");
      return res.status(400).send(`Webhook Error: ${e.message}`);
    }
  });
}

// ===== Security middleware (after Stripe route) =====
configureSecurity(app);

// ===== Health =====
app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// ===== Supabase Admin client =====
const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// ===== Upload (store to Supabase Storage/docs) =====
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_UPLOAD_BYTES || "26214400", 10)
  }
});

app.post(
  "/api/drawings/upload",
  upload.single("file"),
  ensureAllowed,
  async (req, res) => {
    try {
      const filingId = req.query.filing_id as string;
      if (!filingId) {
        return res.status(400).json({ error: "filing_id required" });
      }

      const f = (req as any).file as Express.Multer.File;
      const ext =
        f.mimetype === "image/png" ? "png" :
        f.mimetype === "image/jpeg" ? "jpg" :
        "svg";
      const name = `filings/${filingId}/assets/${Date.now()}.${ext}`;

      const { error } = await sb.storage.from("docs").upload(name, f.buffer, {
        contentType: f.mimetype,
        upsert: false
      });

      if (error) throw error;

      // Signed URL (time-limited)
      const { data: signed } = await sb.storage
        .from("docs")
        .createSignedUrl(name, 60 * 60);

      logger.info({ filingId, name }, "File uploaded");
      
      return res.json({ ok: true, asset_url: signed?.signedUrl });
    } catch (e: any) {
      logger.error({ error: e.message }, "Upload failed");
      return res.status(500).json({ error: "UploadFailed", detail: e.message });
    }
  }
);

// ===== ST.96 XML transform =====
app.post("/api/transform/st96", validate(TransformSchema), async (req, res) => {
  const { filing_id, office } = req.body;
  
  try {
    // TODO: Fetch filing via REST and generate XML from templates
    const xml = `<Application office="${office}" filing_id="${filing_id}"/>`;
    const key = `filings/${filing_id}/exports/${office.toLowerCase()}.xml`;
    
    const { error } = await sb.storage.from("docs").upload(key, Buffer.from(xml), {
      contentType: "application/xml",
      upsert: true
    });
    
    if (error) throw error;
    
    const { data: signed } = await sb.storage
      .from("docs")
      .createSignedUrl(key, 60 * 60);

    // Record document
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/documents`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY!}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        filing_id,
        kind: "xml",
        url: signed?.signedUrl,
        sha256: crypto.createHash("sha256").update(xml).digest("hex")
      })
    });

    logger.info({ filing_id, office }, "XML transform complete");
    
    return res.json({ ok: true, xml_url: signed?.signedUrl });
  } catch (e: any) {
    logger.error({ error: e.message, filing_id }, "Transform failed");
    return res.status(500).json({ error: "TransformFailed", detail: e.message });
  }
});

// ===== ZIP export =====
app.post("/api/export/zip", validate(ExportZipSchema), async (req, res) => {
  try {
    const { filing_id } = req.body;
    
    // Fetch documents for this filing
    const docs = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/documents?filing_id=eq.${filing_id}&select=kind,url`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY!}`
        }
      }
    ).then(r => r.json());

    // Validate URLs (SSRF guard)
    for (const d of docs) {
      await assertSafeFetch(d.url);
    }

    logger.info({ filing_id, count: docs.length }, "Export ZIP prepared");
    
    // TODO: Stream ZIP with archiver
    return res.json({ ok: true, files: docs });
  } catch (e: any) {
    logger.error({ error: e.message }, "Export failed");
    return res.status(500).json({ error: "ExportFailed", detail: e.message });
  }
});

// ===== Lovable Doc Ingest webhook =====
app.post(
  "/webhooks/doc-ingest",
  express.text({ type: "*/*" }),
  async (req, res) => {
    try {
      const secret = (req.headers["x-webhook-secret"] || "") as string;
      
      if (!secret || secret !== (process.env.LOVABLE_DOC_WEBHOOK_SECRET || "")) {
        return res.status(401).json({ error: "InvalidSecret" });
      }

      const body = JSON.parse(req.body || "{}");
      
      if (!body.filing_id || !body.url) {
        return res.status(400).json({ error: "InvalidPayload" });
      }

      await fetch(`${process.env.SUPABASE_URL}/rest/v1/documents`, {
        method: "POST",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY!}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          filing_id: body.filing_id,
          kind: body.kind || "pdf",
          url: body.url,
          sha256: body.sha256 || null
        })
      });

      // Notify user
      const filing = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/filings?id=eq.${body.filing_id}&select=user_id`,
        {
          headers: {
            apikey: process.env.SUPABASE_SERVICE_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY!}`
          }
        }
      )
        .then(r => r.json())
        .then(a => a[0]);

      if (filing?.user_id) {
        await fetch(`${process.env.SUPABASE_URL}/rest/v1/notifications`, {
          method: "POST",
          headers: {
            apikey: process.env.SUPABASE_SERVICE_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY!}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            user_id: filing.user_id,
            kind: "info",
            title: "Document ready",
            body: "Your generated document has been attached."
          })
        });
      }

      logger.info({ filing_id: body.filing_id }, "Document ingested");
      
      return res.json({ ok: true });
    } catch (e: any) {
      logger.error({ error: e.message }, "Webhook failed");
      return res.status(500).json({ error: "WebhookFailed", detail: e.message });
    }
  }
);

// ===== Sentry error handler LAST =====
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

const port = Number(process.env.PORT || 8080);
app.listen(port, () => logger.info({ port }, "Server started"));

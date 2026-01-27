/**
 * Sentry error monitoring utility for Edge Functions
 * Requires SENTRY_DSN secret to be configured
 */

const SENTRY_DSN = Deno.env.get("SENTRY_DSN");

interface SentryEvent {
  exception?: {
    values: Array<{
      type: string;
      value: string;
      stacktrace?: {
        frames: Array<{
          filename: string;
          function: string;
          lineno?: number;
          colno?: number;
        }>;
      };
    }>;
  };
  message?: string;
  level: "fatal" | "error" | "warning" | "info" | "debug";
  timestamp: number;
  platform: string;
  environment: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: {
    id?: string;
    email?: string;
    ip_address?: string;
  };
  request?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
  };
}

interface SentryConfig {
  dsn?: string;
  environment?: string;
  release?: string;
}

let sentryConfig: SentryConfig = {
  environment: Deno.env.get("DENO_DEPLOYMENT_ID") ? "production" : "development",
};

/**
 * Initialize Sentry with configuration
 */
export function initSentry(config?: Partial<SentryConfig>): void {
  sentryConfig = { ...sentryConfig, ...config };
}

/**
 * Check if Sentry is configured
 */
export function isSentryEnabled(): boolean {
  return Boolean(SENTRY_DSN);
}

/**
 * Parse Sentry DSN to extract project details
 */
function parseDSN(dsn: string): { publicKey: string; host: string; projectId: string } | null {
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const host = url.host;
    const projectId = url.pathname.slice(1);
    return { publicKey, host, projectId };
  } catch {
    return null;
  }
}

/**
 * Capture an exception and send to Sentry
 */
export async function captureException(
  error: Error,
  context?: {
    user?: { id?: string; email?: string };
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    request?: Request;
  }
): Promise<string | null> {
  if (!SENTRY_DSN) {
    console.error("[Sentry] DSN not configured, logging error locally:", error.message);
    return null;
  }

  const parsed = parseDSN(SENTRY_DSN);
  if (!parsed) {
    console.error("[Sentry] Invalid DSN format");
    return null;
  }

  const eventId = crypto.randomUUID().replace(/-/g, "");

  const event: SentryEvent = {
    exception: {
      values: [
        {
          type: error.name || "Error",
          value: error.message,
          stacktrace: error.stack
            ? {
                frames: parseStackTrace(error.stack),
              }
            : undefined,
        },
      ],
    },
    level: "error",
    timestamp: Date.now() / 1000,
    platform: "deno",
    environment: sentryConfig.environment || "production",
    tags: {
      runtime: "deno",
      ...context?.tags,
    },
    extra: context?.extra,
    user: context?.user,
  };

  if (context?.request) {
    event.request = {
      url: context.request.url,
      method: context.request.method,
      headers: Object.fromEntries(
        [...context.request.headers.entries()].filter(
          ([key]) => !["authorization", "cookie"].includes(key.toLowerCase())
        )
      ),
    };
  }

  try {
    const storeUrl = `https://${parsed.host}/api/${parsed.projectId}/store/`;
    const response = await fetch(storeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=deno-edge/1.0.0, sentry_key=${parsed.publicKey}`,
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      console.error("[Sentry] Failed to send event:", response.status);
      return null;
    }

    console.log("[Sentry] Event captured:", eventId);
    return eventId;
  } catch (sendError) {
    console.error("[Sentry] Error sending event:", sendError);
    return null;
  }
}

/**
 * Capture a message (non-exception) and send to Sentry
 */
export async function captureMessage(
  message: string,
  level: "fatal" | "error" | "warning" | "info" | "debug" = "info",
  context?: {
    user?: { id?: string; email?: string };
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  }
): Promise<string | null> {
  if (!SENTRY_DSN) {
    console.log(`[Sentry] DSN not configured, logging message locally: [${level}] ${message}`);
    return null;
  }

  const parsed = parseDSN(SENTRY_DSN);
  if (!parsed) {
    console.error("[Sentry] Invalid DSN format");
    return null;
  }

  const eventId = crypto.randomUUID().replace(/-/g, "");

  const event: SentryEvent = {
    message,
    level,
    timestamp: Date.now() / 1000,
    platform: "deno",
    environment: sentryConfig.environment || "production",
    tags: {
      runtime: "deno",
      ...context?.tags,
    },
    extra: context?.extra,
    user: context?.user,
  };

  try {
    const storeUrl = `https://${parsed.host}/api/${parsed.projectId}/store/`;
    const response = await fetch(storeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=deno-edge/1.0.0, sentry_key=${parsed.publicKey}`,
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      console.error("[Sentry] Failed to send message:", response.status);
      return null;
    }

    console.log("[Sentry] Message captured:", eventId);
    return eventId;
  } catch (sendError) {
    console.error("[Sentry] Error sending message:", sendError);
    return null;
  }
}

/**
 * Parse error stack trace into Sentry-compatible frames
 */
function parseStackTrace(stack: string): Array<{ filename: string; function: string; lineno?: number; colno?: number }> {
  const lines = stack.split("\n").slice(1);
  const frames: Array<{ filename: string; function: string; lineno?: number; colno?: number }> = [];

  for (const line of lines) {
    const match = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/);
    if (match) {
      frames.unshift({
        function: match[1] || "<anonymous>",
        filename: match[2],
        lineno: parseInt(match[3], 10),
        colno: parseInt(match[4], 10),
      });
    }
  }

  return frames;
}

/**
 * Wrapper to capture errors from async functions
 */
export function withSentry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: {
    functionName?: string;
    tags?: Record<string, string>;
  }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      await captureException(error as Error, {
        tags: {
          function: context?.functionName || fn.name || "anonymous",
          ...context?.tags,
        },
      });
      throw error;
    }
  }) as T;
}

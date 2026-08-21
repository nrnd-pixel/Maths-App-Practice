import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const TARGET_FUNCTION_URL = SUPABASE_URL
  ? `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/student-ai-help-v38`
  : "";

const allowedOrigin = (origin: string | null) => {
  if (!origin) return "";

  if (origin === "http://localhost:8888" || origin === "http://127.0.0.1:8888") {
    return origin;
  }

  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();
    const isKnownNetlifySite = parsed.protocol === "https:" && (
      hostname === "magical-pixie-a61111.netlify.app" ||
      hostname.endsWith("--magical-pixie-a61111.netlify.app")
    );
    if (isKnownNetlifySite) return origin;
  } catch {
    return "";
  }

  return "";
};

const corsHeaders = (req: Request) => {
  const origin = allowedOrigin(req.headers.get("origin"));
  const requestedHeaders = req.headers.get("access-control-request-headers");

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": requestedHeaders ||
      "authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin, Access-Control-Request-Headers",
  };
};

const jsonResponse = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigin(origin)) {
    console.warn("student-ai-help-v381 rejected origin", origin);
    return jsonResponse(req, { error: "Origin not allowed" }, 403);
  }

  if (req.method === "OPTIONS") {
    console.info("student-ai-help-v381 preflight accepted", origin || "no-origin");
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  if (!TARGET_FUNCTION_URL) {
    return jsonResponse(req, { error: "AI Help service is not configured" }, 503);
  }

  let raw = "";
  try {
    raw = await req.text();
  } catch {
    return jsonResponse(req, { error: "Could not read request" }, 400);
  }

  if (!raw || raw.length > 20000) {
    return jsonResponse(req, { error: "Invalid request body" }, 400);
  }

  console.info("student-ai-help-v381 forwarding POST", origin || "no-origin");

  let upstream: Response;
  try {
    upstream = await fetch(TARGET_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: raw,
    });
  } catch {
    return jsonResponse(req, { error: "AI Help service could not be reached" }, 503);
  }

  const responseText = await upstream.text();
  const contentType = upstream.headers.get("content-type") || "application/json; charset=utf-8";

  return new Response(responseText, {
    status: upstream.status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
});

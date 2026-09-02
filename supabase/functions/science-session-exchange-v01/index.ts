import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SCIENCE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SCIENCE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PLATFORM_URL = "https://lmveznstltjxzpalcmid.supabase.co";
const PLATFORM_PUBLISHABLE_KEY = "sb_publishable_0ArG2t1Zgln135ctDR6pQw_QY_z3yf8";

function allowedOrigin(origin: string | null): string {
  if (!origin) return "";
  if (origin === "http://localhost:8888" || origin === "http://127.0.0.1:8888") return origin;
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol === "https:" && (
      host === "magical-pixie-a61111.netlify.app" ||
      host.endsWith("--magical-pixie-a61111.netlify.app")
    )) return origin;
  } catch {}
  return "";
}

function corsHeaders(req: Request): Record<string,string> {
  const origin = allowedOrigin(req.headers.get("origin"));
  const requestedHeaders = req.headers.get("access-control-request-headers");
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": requestedHeaders || "content-type, apikey, authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin, Access-Control-Request-Headers",
  };
}

function jsonResponse(req: Request, body: unknown, status=200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function readJson(req: Request): Promise<Record<string,unknown>|null> {
  try {
    const raw = await req.text();
    if (!raw || raw.length > 2048) return null;
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string,unknown>
      : null;
  } catch { return null; }
}

async function platformRpc(name: string, body: Record<string,unknown>): Promise<{ok:boolean,status:number,payload:any}> {
  try {
    const response = await fetch(`${PLATFORM_URL}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        "apikey": PLATFORM_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    let payload: any = null;
    try { payload = await response.json(); } catch {}
    return { ok: response.ok, status: response.status, payload };
  } catch {
    return { ok:false, status:503, payload:null };
  }
}

function normalizePlatformPayload(payload: any): any {
  if (payload?.student) return payload;
  if (!payload?.student_id || !payload?.student_name) return payload;
  return {
    allowed: payload.allowed,
    expires_at: payload.expires_at,
    subjects: payload.subjects,
    student: {
      roster_student_id: payload.roster_student_id,
      class_id: payload.class_id,
      student_name: payload.student_name,
      student_id: payload.student_id,
      year_level: payload.year_level,
      class_name: payload.class_name,
    },
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigin(origin)) return jsonResponse(req,{error:"Origin not allowed"},403);
  if (req.method === "OPTIONS") return new Response(null,{status:204,headers:corsHeaders(req)});
  if (req.method !== "POST") return jsonResponse(req,{error:"Method not allowed"},405);
  if (!SCIENCE_URL || !SCIENCE_SERVICE_KEY) return jsonResponse(req,{error:"Science session service is not configured"},503);

  const body = await readJson(req);
  const explicitPlatformToken = typeof body?.platform_access_token === "string"
    ? body.platform_access_token.trim() : "";
  const legacyToken = typeof body?.math_access_token === "string"
    ? body.math_access_token.trim() : "";
  const suppliedToken = explicitPlatformToken || legacyToken;

  if (suppliedToken.length < 24 || suppliedToken.length > 256) {
    return jsonResponse(req,{error:"Learning Platform session is invalid or expired"},401);
  }

  // Preferred path: the browser supplies the platform capability directly.
  let platformResult = await platformRpc("get_student_subject_access", {
    p_platform_access_token: suppliedToken,
  });

  // Compatibility path for an already-signed-in Maths preview session. Exchange the
  // existing Maths practice token for a platform capability server-side, without a PIN.
  if (!platformResult.ok && !explicitPlatformToken && legacyToken) {
    platformResult = await platformRpc("exchange_math_access_for_platform", {
      p_math_access_token: legacyToken,
    });
  }

  if (!platformResult.ok) {
    return jsonResponse(req,{error:"Learning Platform session is invalid or expired"},401);
  }

  const platformPayload = normalizePlatformPayload(platformResult.payload);
  if (platformPayload?.subjects?.science?.allowed !== true) {
    return jsonResponse(req,{error:"Science is not enabled for this student",code:"science_subject_not_allowed"},403);
  }

  const student = platformPayload?.student;
  const yearLevel = Number(student?.year_level || 0);
  const studentName = String(student?.student_name || "").trim();
  const studentId = String(student?.student_id || "").trim();
  const className = String(student?.class_name || "").trim();

  if (!Number.isInteger(yearLevel) || yearLevel < 1 || yearLevel > 6 || !studentName || !studentId) {
    return jsonResponse(req,{error:"Registered student identity could not be verified"},401);
  }

  let scienceResponse: Response;
  try {
    scienceResponse = await fetch(`${SCIENCE_URL.replace(/\/$/,"")}/rest/v1/rpc/science_mint_student_access_v01`, {
      method:"POST",
      headers:{
        "apikey":SCIENCE_SERVICE_KEY,
        "Authorization":`Bearer ${SCIENCE_SERVICE_KEY}`,
        "Content-Type":"application/json",
      },
      body:JSON.stringify({
        p_year_level:yearLevel,
        p_student_name:studentName,
        p_student_id:studentId,
        p_class_name:className || null,
      }),
    });
  } catch {
    return jsonResponse(req,{error:"Science access could not be created"},503);
  }

  const scienceText = await scienceResponse.text();
  if (!scienceResponse.ok) {
    console.error("science-session-exchange-v01 mint failed",scienceResponse.status);
    return jsonResponse(req,{error:"Science access could not be created"},503);
  }

  try { return jsonResponse(req,JSON.parse(scienceText),200); }
  catch { return jsonResponse(req,{error:"Science access could not be created"},502); }
});

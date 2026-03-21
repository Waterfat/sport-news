import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";

// --- Rate Limiting (in-memory) ---
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 3;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Periodically clean up expired entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60_000);

// --- Zod Schema ---
const submissionSchema = z.object({
  name: z
    .string()
    .min(1, "姓名為必填")
    .max(50, "姓名最多 50 字"),
  email: z
    .string()
    .min(1, "Email 為必填")
    .email("Email 格式不正確"),
  specialty: z
    .string()
    .min(1, "擅長領域為必填"),
  portfolio_url: z
    .string()
    .url("作品連結格式不正確")
    .optional()
    .or(z.literal("")),
  introduction: z
    .string()
    .max(500, "自我介紹最多 500 字")
    .optional()
    .or(z.literal("")),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        {
          success: false,
          errors: [{ code: "RATE_LIMIT", message: "請求過於頻繁，請稍後再試" }],
        },
        { status: 429 }
      );
    }

    // Parse & validate
    const body = await request.json();
    const parsed = submissionSchema.safeParse(body);

    if (!parsed.success) {
      const errors = (parsed.error.issues ?? []).map((e) => ({
        code: "VALIDATION_ERROR",
        message: e.message,
        field: e.path.map(String).join("."),
      }));
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }

    const { name, email, specialty, portfolio_url, introduction } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const supabase = createServiceClient();

    // Check for existing pending application with same email
    const { data: existing } = await supabase
      .from("submission_applications")
      .select("id")
      .eq("email", normalizedEmail)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          errors: [
            {
              code: "DUPLICATE",
              message: "此 Email 已有待審核的申請，請勿重複提交",
            },
          ],
        },
        { status: 409 }
      );
    }

    // Insert
    const { error } = await supabase.from("submission_applications").insert({
      name: name.trim(),
      email: normalizedEmail,
      specialty,
      portfolio_url: portfolio_url?.trim() || null,
      introduction: introduction?.trim() || null,
    });

    if (error) {
      console.error("submission insert error:", error);
      return NextResponse.json(
        {
          success: false,
          errors: [{ code: "DB_ERROR", message: "儲存失敗，請稍後再試" }],
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("submission route error:", err);
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "INTERNAL_ERROR", message: "伺服器錯誤" }],
      },
      { status: 500 }
    );
  }
}

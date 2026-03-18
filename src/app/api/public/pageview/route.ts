import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import crypto from "crypto";

const BOT_PATTERNS = [
  /headlesschrome/i,
  /playwright/i,
  /puppeteer/i,
  /selenium/i,
  /googlebot/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /applebot/i,
  /mj12bot/i,
  /ahrefsbot/i,
  /semrushbot/i,
  /dotbot/i,
  /petalbot/i,
  /bytespider/i,
];

function isBot(ua: string): boolean {
  return BOT_PATTERNS.some((p) => p.test(ua));
}

export async function POST(req: NextRequest) {
  try {
    const userAgent = req.headers.get("user-agent") || "";

    // Filter out bots and automated test traffic
    if (isBot(userAgent)) {
      return NextResponse.json({ ok: true, filtered: "bot" });
    }

    const body = await req.json();
    const { sessionId, path, referrer, memberId } = body;

    if (!sessionId || !path) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Hash IP for privacy
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    const ipHash = crypto.createHash("sha256").update(ip + "pageview-salt").digest("hex").slice(0, 16);

    const supabase = createServiceClient();
    await supabase.from("page_views").insert({
      session_id: sessionId.slice(0, 64),
      page_path: path.slice(0, 500),
      referrer: referrer?.slice(0, 1000) || null,
      user_agent: userAgent.slice(0, 500),
      ip_hash: ipHash,
      member_id: memberId || null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import crypto from "crypto";

const BOT_PATTERNS = [
  /headlesschrome/i, /playwright/i, /puppeteer/i, /selenium/i,
  /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i, /baiduspider/i,
  /yandexbot/i, /facebookexternalhit/i, /twitterbot/i, /linkedinbot/i,
  /whatsapp/i, /telegrambot/i, /applebot/i, /mj12bot/i, /ahrefsbot/i,
  /semrushbot/i, /dotbot/i, /petalbot/i, /bytespider/i,
  /vercel-screenshot/i, /vercel\//i, /lighthouse/i, /pagespeed/i,
];

function isBot(ua: string): boolean {
  if (BOT_PATTERNS.some((p) => p.test(ua))) return true;
  // Detect automated Chromium: navigator.webdriver is set in automation
  // but we can't check that server-side. Instead, we rely on the client
  // sending an `x-is-bot` header (set by PageTracker when webdriver detected)
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const userAgent = req.headers.get("user-agent") || "";
    const clientIsBot = req.headers.get("x-is-bot") === "1";
    if (isBot(userAgent) || clientIsBot) {
      return NextResponse.json({ ok: true, filtered: "bot" });
    }

    const body = await req.json();
    const { visitorId, sessionId, path, referrer, memberId } = body;

    if (!path) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }

    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    const ipHash = crypto.createHash("sha256").update(ip + "pageview-salt").digest("hex").slice(0, 16);

    const supabase = createServiceClient();
    await supabase.from("page_views").insert({
      visitor_id: visitorId?.slice(0, 64) || null,
      session_id: (sessionId || visitorId || "unknown").slice(0, 64),
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

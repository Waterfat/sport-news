import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get("period") || "7d";
  const days = period === "30d" ? 30 : period === "90d" ? 90 : 7;

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const supabase = createServiceClient();

  const { data: views } = await supabase
    .from("page_views")
    .select("session_id, member_id, page_path, referrer, user_agent, ip_hash, created_at")
    .gte("created_at", sinceStr)
    .order("created_at", { ascending: false })
    .limit(50000);

  // Filter out bot traffic in query results (defense in depth)
  const allViews = (views ?? []).filter((v) => {
    const ua = (v.user_agent || "").toLowerCase();
    return !(/headlesschrome|playwright|puppeteer|selenium|bot|spider|crawl/i.test(ua));
  });

  // --- Summary ---
  const totalPV = allViews.length;
  // UV: use member_id if available, fallback to session_id
  const uniqueVisitors = new Set(allViews.map((v) => v.member_id || v.session_id));
  const totalUV = uniqueVisitors.size;
  const avgPagesPerVisitor = totalUV > 0 ? Math.round((totalPV / totalUV) * 10) / 10 : 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayViews = allViews.filter((v) => v.created_at?.startsWith(todayStr));
  const todayPV = todayViews.length;
  const todayUV = new Set(todayViews.map((v) => v.member_id || v.session_id)).size;

  // Count logged-in views
  const memberViews = allViews.filter((v) => v.member_id).length;

  // --- Daily trend ---
  const dailyMap = new Map<string, { pv: number; visitors: Set<string> }>();
  for (const v of allViews) {
    const day = v.created_at?.slice(0, 10) ?? "";
    if (!dailyMap.has(day)) dailyMap.set(day, { pv: 0, visitors: new Set() });
    const d = dailyMap.get(day)!;
    d.pv++;
    d.visitors.add(v.member_id || v.session_id);
  }
  const dailyTrend = Array.from(dailyMap.entries())
    .map(([date, d]) => ({ date, pv: d.pv, uv: d.visitors.size }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // --- Top pages ---
  const pageMap = new Map<string, { pv: number; visitors: Set<string> }>();
  for (const v of allViews) {
    if (!pageMap.has(v.page_path)) pageMap.set(v.page_path, { pv: 0, visitors: new Set() });
    const p = pageMap.get(v.page_path)!;
    p.pv++;
    p.visitors.add(v.member_id || v.session_id);
  }
  const topPages = Array.from(pageMap.entries())
    .map(([path, p]) => ({ path, pv: p.pv, uv: p.visitors.size }))
    .sort((a, b) => b.pv - a.pv)
    .slice(0, 20);

  // --- Referrer sources ---
  const refMap = new Map<string, number>();
  for (const v of allViews) {
    let source = "直接訪問";
    const ref = v.referrer || "";
    if (ref.includes("t.me") || ref.includes("telegram")) source = "Telegram";
    else if (ref.includes("line.me") || ref.includes("line://")) source = "LINE";
    else if (ref.includes("google")) source = "Google";
    else if (ref.includes("facebook") || ref.includes("fb.com")) source = "Facebook";
    else if (ref.includes("twitter") || ref.includes("x.com")) source = "X/Twitter";
    else if (ref && ref !== "") source = "其他";
    refMap.set(source, (refMap.get(source) || 0) + 1);
  }
  const referrerSources = Array.from(refMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  // --- Device distribution ---
  const deviceMap = new Map<string, number>();
  for (const v of allViews) {
    const ua = (v.user_agent || "").toLowerCase();
    let device = "Desktop";
    if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
      device = /ipad|tablet/i.test(ua) ? "Tablet" : "Mobile";
    }
    deviceMap.set(device, (deviceMap.get(device) || 0) + 1);
  }
  const devices = Array.from(deviceMap.entries())
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count);

  // --- Recent sessions ---
  const sessionMap = new Map<string, { pages: { path: string; time: string }[]; firstSeen: string; ua: string; memberId: string | null }>();
  for (const v of allViews) {
    const key = v.member_id || v.session_id;
    if (!sessionMap.has(key)) {
      sessionMap.set(key, { pages: [], firstSeen: v.created_at, ua: v.user_agent || "", memberId: v.member_id });
    }
    sessionMap.get(key)!.pages.push({
      path: v.page_path,
      time: v.created_at,
    });
  }
  const recentSessions = Array.from(sessionMap.entries())
    .map(([id, s]) => ({
      sessionId: s.memberId ? `會員 ${id.slice(0, 8)}...` : id.slice(0, 8) + "...",
      isMember: !!s.memberId,
      pageCount: s.pages.length,
      firstSeen: s.firstSeen,
      lastPage: s.pages[0]?.path ?? "",
      ua: s.ua.slice(0, 80),
      pages: s.pages.slice(0, 30).reverse(),
    }))
    .sort((a, b) => b.firstSeen.localeCompare(a.firstSeen))
    .slice(0, 30);

  return NextResponse.json({
    summary: { totalPV, totalUV, avgPagesPerVisitor, todayPV, todayUV, memberViews },
    dailyTrend,
    topPages,
    referrerSources,
    devices,
    recentSessions,
  });
}

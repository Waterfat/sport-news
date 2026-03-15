import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getMemberPreferences,
  updateMemberPreferences,
} from "@/lib/member";

/**
 * 關注球隊 API
 * GET: 取得已關注球隊
 * POST: 新增關注球隊
 * DELETE: 移除關注球隊
 */

export async function GET() {
  const session = await auth();
  if (!session?.user?.memberId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefs = await getMemberPreferences(session.user.memberId);
  return NextResponse.json({
    favorites: prefs?.favorite_teams ?? [],
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.memberId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sport, teamId, name } = await request.json();
  if (!sport || !teamId || !name) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const prefs = await getMemberPreferences(session.user.memberId);
  const existing = prefs?.favorite_teams ?? [];

  // 避免重複
  if (existing.some((t) => t.teamId === teamId && t.sport === sport)) {
    return NextResponse.json({ favorites: existing });
  }

  const updated = [...existing, { sport, teamId, name }];
  await updateMemberPreferences(session.user.memberId, {
    favorite_teams: updated,
  });

  return NextResponse.json({ favorites: updated });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.memberId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sport, teamId } = await request.json();

  const prefs = await getMemberPreferences(session.user.memberId);
  const existing = prefs?.favorite_teams ?? [];
  const updated = existing.filter(
    (t) => !(t.teamId === teamId && t.sport === sport)
  );

  await updateMemberPreferences(session.user.memberId, {
    favorite_teams: updated,
  });

  return NextResponse.json({ favorites: updated });
}

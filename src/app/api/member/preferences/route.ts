import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getMemberPreferences,
  updateMemberPreferences,
} from "@/lib/member";

export async function GET() {
  const session = await auth();
  if (!session?.user?.memberId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefs = await getMemberPreferences(session.user.memberId);
  return NextResponse.json({ preferences: prefs });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.memberId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const prefs = await updateMemberPreferences(session.user.memberId, body);
  return NextResponse.json({ preferences: prefs });
}

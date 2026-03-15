// 會員 CRUD：建立/查詢/更新偏好/帳號關聯

import { createServiceClient } from "./supabase";

export interface Member {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  role: "member" | "admin";
  created_at: string;
  updated_at: string;
}

export interface MemberAccount {
  id: string;
  member_id: string;
  provider: "google" | "line";
  provider_account_id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  created_at: string;
}

export interface MemberPreferences {
  member_id: string;
  favorite_teams: Array<{
    sport: string;
    teamId: string;
    name: string;
  }>;
  favorite_leagues: string[];
  notification_line: boolean;
  notification_telegram: boolean;
}

/**
 * OAuth 登入時查找或建立會員
 * 以 email 為唯一鍵進行帳號合併
 */
export async function findOrCreateMember(params: {
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  provider: "google" | "line";
  provider_account_id: string;
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: number | null;
}): Promise<Member> {
  const db = createServiceClient();

  // 1. 先嘗試透過 provider + provider_account_id 找到已存在的帳號關聯
  const { data: existingAccount } = await db
    .from("member_accounts")
    .select("member_id")
    .eq("provider", params.provider)
    .eq("provider_account_id", params.provider_account_id)
    .single();

  if (existingAccount) {
    // 已有帳號關聯，更新 token 並返回 member
    await db
      .from("member_accounts")
      .update({
        access_token: params.access_token ?? null,
        refresh_token: params.refresh_token ?? null,
        expires_at: params.expires_at ?? null,
      })
      .eq("provider", params.provider)
      .eq("provider_account_id", params.provider_account_id);

    const { data: member } = await db
      .from("members")
      .select("*")
      .eq("id", existingAccount.member_id)
      .single();

    if (member) {
      // 更新姓名和頭像（可能有變）
      await db
        .from("members")
        .update({
          name: params.name ?? member.name,
          avatar_url: params.avatar_url ?? member.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", member.id);

      return member as Member;
    }
  }

  // 2. 嘗試透過 email 合併（如果有 email）
  if (params.email) {
    const { data: existingMember } = await db
      .from("members")
      .select("*")
      .eq("email", params.email)
      .single();

    if (existingMember) {
      // email 相同 → 自動合併，建立新的 provider 關聯
      await linkAccount(existingMember.id, {
        provider: params.provider,
        provider_account_id: params.provider_account_id,
        access_token: params.access_token ?? null,
        refresh_token: params.refresh_token ?? null,
        expires_at: params.expires_at ?? null,
      });

      // 更新姓名和頭像
      await db
        .from("members")
        .update({
          name: params.name ?? existingMember.name,
          avatar_url: params.avatar_url ?? existingMember.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingMember.id);

      return existingMember as Member;
    }
  }

  // 3. 全新會員 → 建立 member + member_account
  const { data: newMember, error: memberError } = await db
    .from("members")
    .insert({
      email: params.email,
      name: params.name,
      avatar_url: params.avatar_url,
      role: "member",
    })
    .select()
    .single();

  if (memberError || !newMember) {
    throw new Error(`Failed to create member: ${memberError?.message}`);
  }

  await linkAccount(newMember.id, {
    provider: params.provider,
    provider_account_id: params.provider_account_id,
    access_token: params.access_token ?? null,
    refresh_token: params.refresh_token ?? null,
    expires_at: params.expires_at ?? null,
  });

  // 建立預設偏好
  await db.from("member_preferences").insert({
    member_id: newMember.id,
  });

  return newMember as Member;
}

/**
 * 關聯 OAuth 帳號到 member
 */
async function linkAccount(
  memberId: string,
  account: {
    provider: string;
    provider_account_id: string;
    access_token: string | null;
    refresh_token: string | null;
    expires_at: number | null;
  }
) {
  const db = createServiceClient();

  await db.from("member_accounts").upsert(
    {
      member_id: memberId,
      provider: account.provider,
      provider_account_id: account.provider_account_id,
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expires_at: account.expires_at,
    },
    { onConflict: "provider,provider_account_id" }
  );
}

/**
 * 取得會員偏好
 */
export async function getMemberPreferences(
  memberId: string
): Promise<MemberPreferences | null> {
  const db = createServiceClient();

  const { data } = await db
    .from("member_preferences")
    .select("*")
    .eq("member_id", memberId)
    .single();

  return data as MemberPreferences | null;
}

/**
 * 更新會員偏好
 */
export async function updateMemberPreferences(
  memberId: string,
  updates: Partial<
    Pick<
      MemberPreferences,
      | "favorite_teams"
      | "favorite_leagues"
      | "notification_line"
      | "notification_telegram"
    >
  >
): Promise<MemberPreferences | null> {
  const db = createServiceClient();

  const { data } = await db
    .from("member_preferences")
    .upsert(
      {
        member_id: memberId,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "member_id" }
    )
    .select()
    .single();

  return data as MemberPreferences | null;
}

/**
 * 取得會員資訊（含關聯帳號）
 */
export async function getMemberById(
  memberId: string
): Promise<(Member & { accounts: MemberAccount[] }) | null> {
  const db = createServiceClient();

  const { data: member } = await db
    .from("members")
    .select("*")
    .eq("id", memberId)
    .single();

  if (!member) return null;

  const { data: accounts } = await db
    .from("member_accounts")
    .select("*")
    .eq("member_id", memberId);

  return {
    ...(member as Member),
    accounts: (accounts ?? []) as MemberAccount[],
  };
}

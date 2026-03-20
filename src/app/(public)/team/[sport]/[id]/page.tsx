import { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { TeamDetailClient } from "@/components/team/TeamDetailClient";
import { SPORT_KEY_LABELS, SITE_URL, getTeamIdBySlug } from "@/lib/constants";
import { teamUrl } from "@/lib/routes";
import { TeamJsonLd } from "./TeamJsonLd";

interface Props {
  params: Promise<{ sport: string; id: string }>;
}

/** id 參數是純數字就是 ESPN ID，否則視為 slug */
function isNumericId(id: string): boolean {
  return /^\d+$/.test(id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sport, id } = await params;

  // slug URL 不應被索引，canonical 是數字 ID 版本
  if (!isNumericId(id)) {
    return { robots: { index: false } };
  }

  const sportLabel = SPORT_KEY_LABELS[sport] || sport.toUpperCase();
  const title = `${sportLabel} 球隊 #${id}`;
  const ogUrl = `${SITE_URL}/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(sportLabel)}&type=team`;

  return {
    title,
    openGraph: {
      title,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      images: [ogUrl],
    },
  };
}

export default async function TeamPage({ params }: Props) {
  const { sport, id } = await params;

  // slug → 308 permanent redirect 到 canonical URL
  if (!isNumericId(id)) {
    const teamId = getTeamIdBySlug(sport, id);
    if (teamId) {
      permanentRedirect(teamUrl(sport, teamId));
    }
    // 未知 slug 會落入下方正常渲染，ESPN API 會回 404/empty
  }

  return (
    <>
      <TeamJsonLd sport={sport} teamId={id} />
      <TeamDetailClient sport={sport} teamId={id} />
    </>
  );
}

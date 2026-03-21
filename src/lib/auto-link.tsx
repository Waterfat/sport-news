import React from "react";
import Link from "next/link";
import { TEAM_NAME_ZH, TEAM_SLUG_MAP } from "./constants";
import { teamUrl } from "./routes";

interface TeamLink {
  name: string;
  sport: string;
  teamId: string;
  regex: RegExp;
}

/**
 * Build team link lookup from existing constants.
 * Maps English team names to { sport, teamId } for auto-linking.
 */
function buildTeamLinks(): TeamLink[] {
  const links: TeamLink[] = [];

  // Iterate TEAM_SLUG_MAP to get sport + teamId
  for (const [key, teamId] of Object.entries(TEAM_SLUG_MAP)) {
    const colonIdx = key.indexOf(":");
    const sport = key.slice(0, colonIdx);
    const slug = key.slice(colonIdx + 1);

    // Find matching display name in TEAM_NAME_ZH
    for (const englishName of Object.keys(TEAM_NAME_ZH)) {
      const nameSlug = englishName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/\./g, "");

      if (nameSlug === slug || slug === nameSlug.replace(/^(la|st)-/, "$1-")) {
        links.push({
          name: englishName,
          sport,
          teamId,
          regex: new RegExp(
            `\\b${englishName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`
          ),
        });
        break;
      }
    }
  }

  // Add common short names (map to full name's sport+id)
  const shortNameMap: Record<string, string> = {
    Lakers: "Los Angeles Lakers",
    Celtics: "Boston Celtics",
    Warriors: "Golden State Warriors",
    Nets: "Brooklyn Nets",
    Knicks: "New York Knicks",
    Bucks: "Milwaukee Bucks",
    Heat: "Miami Heat",
    Bulls: "Chicago Bulls",
    Cavs: "Cleveland Cavaliers",
    Nuggets: "Denver Nuggets",
    Rockets: "Houston Rockets",
    Clippers: "LA Clippers",
    Suns: "Phoenix Suns",
    Spurs: "San Antonio Spurs",
    Thunder: "Oklahoma City Thunder",
    Grizzlies: "Memphis Grizzlies",
    Mavericks: "Dallas Mavericks",
    Mavs: "Dallas Mavericks",
    Timberwolves: "Minnesota Timberwolves",
    Pelicans: "New Orleans Pelicans",
    Pacers: "Indiana Pacers",
    Pistons: "Detroit Pistons",
    Hawks: "Atlanta Hawks",
    Hornets: "Charlotte Hornets",
    Magic: "Orlando Magic",
    Raptors: "Toronto Raptors",
    Kings: "Sacramento Kings",
    Blazers: "Portland Trail Blazers",
    Wizards: "Washington Wizards",
    Jazz: "Utah Jazz",
    Dodgers: "Los Angeles Dodgers",
    Yankees: "New York Yankees",
    "Red Sox": "Boston Red Sox",
    Astros: "Houston Astros",
    Braves: "Atlanta Braves",
    Phillies: "Philadelphia Phillies",
    Padres: "San Diego Padres",
    Mets: "New York Mets",
    Cubs: "Chicago Cubs",
    Cardinals: "St. Louis Cardinals",
    Brewers: "Milwaukee Brewers",
    Orioles: "Baltimore Orioles",
    Twins: "Minnesota Twins",
    Guardians: "Cleveland Guardians",
    Tigers: "Detroit Tigers",
    Royals: "Kansas City Royals",
    Rays: "Tampa Bay Rays",
    Rangers: "Texas Rangers",
    Mariners: "Seattle Mariners",
    Angels: "Los Angeles Angels",
    Reds: "Cincinnati Reds",
    Pirates: "Pittsburgh Pirates",
    Marlins: "Miami Marlins",
    Rockies: "Colorado Rockies",
    Nationals: "Washington Nationals",
    Giants: "San Francisco Giants",
    "White Sox": "Chicago White Sox",
    "Blue Jays": "Toronto Blue Jays",
    Diamondbacks: "Arizona Diamondbacks",
  };

  for (const [shortName, fullName] of Object.entries(shortNameMap)) {
    const found = links.find((l) => l.name === fullName);
    if (found) {
      links.push({
        name: shortName,
        sport: found.sport,
        teamId: found.teamId,
        regex: new RegExp(
          `\\b${shortName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`
        ),
      });
    }
  }

  // Sort by name length (longest first) to match "Los Angeles Lakers" before "Lakers"
  links.sort((a, b) => b.name.length - a.name.length);

  return links;
}

const TEAM_LINKS = buildTeamLinks();

/** Map category name to sport key for disambiguation */
function categoryToSport(category: string | null): string | null {
  if (!category) return null;
  const map: Record<string, string> = {
    NBA: "nba",
    "籃球": "nba",
    MLB: "mlb",
    "棒球": "mlb",
  };
  return map[category] ?? null;
}

/**
 * Process a text string and replace team names with Link components.
 * Returns an array of strings and React elements.
 */
function linkifyText(
  text: string,
  preferredSport: string | null
): (string | React.ReactElement)[] {
  const result: (string | React.ReactElement)[] = [];
  let remaining = text;
  let keyCounter = 0;

  while (remaining.length > 0) {
    let earliestMatch: { index: number; length: number; link: TeamLink } | null =
      null;

    for (const link of TEAM_LINKS) {
      // If we have a preferred sport, skip teams from other sports
      // unless the name is unambiguous (only one sport has this name)
      if (preferredSport && link.sport !== preferredSport) {
        const sameNameInPreferred = TEAM_LINKS.find(
          (l) => l.name === link.name && l.sport === preferredSport
        );
        if (sameNameInPreferred) continue;
      }

      const match = link.regex.exec(remaining);
      if (match && (!earliestMatch || match.index < earliestMatch.index)) {
        earliestMatch = {
          index: match.index,
          length: match[0].length,
          link,
        };
      }
    }

    if (!earliestMatch) {
      result.push(remaining);
      break;
    }

    if (earliestMatch.index > 0) {
      result.push(remaining.slice(0, earliestMatch.index));
    }

    const matchedText = remaining.slice(
      earliestMatch.index,
      earliestMatch.index + earliestMatch.length
    );
    result.push(
      <Link
        key={`team-${keyCounter++}`}
        href={teamUrl(earliestMatch.link.sport, earliestMatch.link.teamId)}
        className="text-blue-600 hover:text-blue-800 underline underline-offset-2 decoration-blue-300 transition-colors"
      >
        {matchedText}
      </Link>
    );

    remaining = remaining.slice(earliestMatch.index + earliestMatch.length);
  }

  return result;
}

/**
 * Process react-markdown children to auto-link team names.
 * Handles mixed children (strings + React elements).
 * Does NOT process children that are already inside <a> tags.
 */
export function autoLinkChildren(
  children: React.ReactNode,
  category: string | null
): React.ReactNode {
  const preferredSport = categoryToSport(category);

  if (typeof children === "string") {
    const linked = linkifyText(children, preferredSport);
    return linked.length === 1 && typeof linked[0] === "string"
      ? children
      : linked;
  }

  if (Array.isArray(children)) {
    return children.map((child, i) => {
      if (typeof child === "string") {
        const linked = linkifyText(child, preferredSport);
        return linked.length === 1 && typeof linked[0] === "string"
          ? child
          : <React.Fragment key={`frag-${i}`}>{linked}</React.Fragment>;
      }
      return child;
    });
  }

  return children;
}

export const SPORTS = {
  basketball: { label: "籃球", keywords: ["NBA", "basketball", "籃球", "nba"], enabled: true },
  baseball: { label: "棒球", keywords: ["MLB", "baseball", "棒球", "大聯盟", "mlb"], enabled: false },
  football: { label: "美式足球", keywords: ["NFL", "football", "nfl"], enabled: false },
  soccer: { label: "足球", keywords: ["soccer", "FIFA", "足球", "英超", "世界盃"], enabled: false },
} as const;

export type SportKey = keyof typeof SPORTS;

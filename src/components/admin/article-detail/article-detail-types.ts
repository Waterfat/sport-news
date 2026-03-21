// --- Article detail type definitions ---

export interface CitedSource {
  type: string;
  title: string;
  url: string;
}

export interface ReviewResult {
  scores?: Record<string, number>;
  checks?: Record<string, string>;
  reason?: string;
  average_score?: number;
  [key: string]: unknown;
}

export interface ArticleDetail {
  id: string;
  title: string;
  content: string;
  status: string;
  reviewer_note: string | null;
  created_at: string;
  published_at: string | null;
  scheduled_at: string | null;
  publish_channel_ids: number[];
  images: string[];
  tags: string[];
  writer_personas: {
    name: string;
    description: string | null;
  } | null;
  cited_sources: CitedSource[] | null;
  review_status: "pending" | "approved" | "rejected" | null;
  review_result: ReviewResult | null;
  reviewed_at: string | null;
  writing_strategy: "multi_source" | "enriched" | "popular_digest" | null;
}

export interface RawArticle {
  id: string;
  source: string;
  title: string;
  content: string;
  url: string;
}

export interface PublishChannel {
  id: number;
  name: string;
  type: string;
  is_active: boolean;
}

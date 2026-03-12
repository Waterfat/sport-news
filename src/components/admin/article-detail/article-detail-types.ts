// --- Article detail type definitions ---

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
  writer_personas: {
    name: string;
    description: string | null;
  } | null;
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

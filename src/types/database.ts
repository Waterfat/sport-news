export interface Database {
  public: {
    Tables: {
      raw_articles: {
        Row: RawArticle;
        Insert: Omit<RawArticle, "id" | "crawled_at" | "is_processed">;
        Update: Partial<RawArticle>;
      };
      generated_articles: {
        Row: GeneratedArticle;
        Insert: Omit<GeneratedArticle, "id" | "created_at">;
        Update: Partial<GeneratedArticle>;
      };
      writer_personas: {
        Row: WriterPersona;
        Insert: Omit<WriterPersona, "id" | "created_at">;
        Update: Partial<WriterPersona>;
      };
      publish_logs: {
        Row: PublishLog;
        Insert: Omit<PublishLog, "id" | "published_at">;
        Update: Partial<PublishLog>;
      };
    };
  };
}

export interface RawArticle {
  id: string;
  source: string;
  title: string;
  content: string;
  images: string[];
  url: string;
  crawled_at: string;
  category: string | null;
  is_processed: boolean;
}

export interface GeneratedArticle {
  id: string;
  raw_article_ids: string[];
  writer_persona_id: string | null;
  title: string;
  content: string;
  images: ArticleImage[];
  status: "draft" | "approved" | "published" | "rejected";
  reviewer_note: string | null;
  created_at: string;
  published_at: string | null;
}

export interface ArticleImage {
  url: string;
  source: string;
  caption: string;
}

export interface WriterPersona {
  id: string;
  name: string;
  style_prompt: string;
  avatar: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PublishLog {
  id: string;
  article_id: string;
  platform: "web" | "fb" | "x" | "tg";
  status: "success" | "failed" | "pending";
  published_url: string | null;
  published_at: string;
}

// ---------- 會員系統 ----------

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
  favorite_teams: Array<{ sport: string; teamId: string; name: string }>;
  favorite_leagues: string[];
  notification_line: boolean;
  notification_telegram: boolean;
  created_at: string;
  updated_at: string;
}

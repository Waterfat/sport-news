export interface CrawlSource {
  id: number;
  name: string;
  base_url: string;
  is_active: boolean;
  crawl_images: boolean;
}

export interface SportSettings {
  [key: string]: {
    enabled: boolean;
    sources: string[];
    title_prompt: string;
    updated_at?: string;
  };
}

export interface CrawlResult {
  id: number;
  total: number;
  saved: number;
  duplicate: number;
  filtered: number;
}

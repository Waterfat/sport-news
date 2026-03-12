export interface CrawledArticle {
  source: string;
  title: string;
  content: string;
  images: string[];
  url: string;
  category: string | null;
}

export interface Crawler {
  name: string;
  crawl(): Promise<CrawledArticle[]>;
}

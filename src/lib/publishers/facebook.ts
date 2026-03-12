import type { PublishArticle } from "./types";

interface FacebookConfig {
  page_id: string;
  access_token: string;
  site_url?: string;
}

interface PublishResult {
  success: boolean;
  post_id?: string;
  error?: string;
}

export async function publishToFacebook(
  article: PublishArticle,
  config: FacebookConfig
): Promise<PublishResult> {
  try {
    const { page_id, access_token, site_url } = config;

    if (!page_id || !access_token) {
      return { success: false, error: "Missing page_id or access_token" };
    }

    const link = site_url && article.slug
      ? `${site_url}/news/${article.slug}`
      : undefined;

    const contentExcerpt = article.content.length > 500
      ? article.content.substring(0, 497) + "..."
      : article.content;

    let message = `${article.title}\n\n${contentExcerpt}`;
    if (link) {
      message += `\n\n${link}`;
    }

    const body: Record<string, string> = { message, access_token };
    if (link) {
      body.link = link;
    }

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${page_id}/feed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || `Facebook API error: ${response.status}`,
      };
    }

    return { success: true, post_id: data.id };
  } catch (err) {
    return { success: false, error: `Facebook publish failed: ${err}` };
  }
}

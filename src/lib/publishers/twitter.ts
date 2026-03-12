interface Article {
  title: string;
  content: string;
  slug?: string;
}

interface TwitterConfig {
  api_key: string;
  api_secret: string;
  access_token: string;
  access_token_secret: string;
  bearer_token?: string;
  site_url?: string;
}

interface PublishResult {
  success: boolean;
  tweet_id?: string;
  error?: string;
}

// Uses Twitter API v2 with Bearer token for simplicity.
// In production, you would use OAuth 1.0a with HMAC-SHA1 signatures
// for user-context actions, or use a library like 'twitter-api-v2'.
export async function publishToTwitter(
  article: Article,
  config: TwitterConfig
): Promise<PublishResult> {
  try {
    const token = config.bearer_token || config.access_token;

    if (!token) {
      return { success: false, error: "Missing bearer_token or access_token" };
    }

    const link = config.site_url && article.slug
      ? `${config.site_url}/articles/${article.slug}`
      : "";

    const maxTitleLen = link ? 250 : 280;
    const titleTruncated = article.title.length > maxTitleLen
      ? article.title.substring(0, maxTitleLen - 3) + "..."
      : article.title;

    const text = link ? `${titleTruncated}\n${link}` : titleTruncated;

    const response = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.detail || data.title || `Twitter API error: ${response.status}`,
      };
    }

    return { success: true, tweet_id: data.data?.id };
  } catch (err) {
    return { success: false, error: `Twitter publish failed: ${err}` };
  }
}

interface Article {
  title: string;
  content: string;
  slug?: string;
}

interface LineConfig {
  channel_access_token: string;
  site_url?: string;
}

interface PublishResult {
  success: boolean;
  error?: string;
}

export async function publishToLine(
  article: Article,
  config: LineConfig
): Promise<PublishResult> {
  try {
    const { channel_access_token, site_url } = config;

    if (!channel_access_token) {
      return { success: false, error: "Missing channel_access_token" };
    }

    const link = site_url && article.slug
      ? `${site_url}/articles/${article.slug}`
      : "";

    const contentExcerpt = article.content.length > 500
      ? article.content.substring(0, 497) + "..."
      : article.content;

    let text = `${article.title}\n\n${contentExcerpt}`;
    if (link) {
      text += `\n\n${link}`;
    }

    const response = await fetch(
      "https://api.line.me/v2/bot/message/broadcast",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${channel_access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              type: "text",
              text,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: data.message || `LINE API error: ${response.status}`,
      };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: `LINE publish failed: ${err}` };
  }
}

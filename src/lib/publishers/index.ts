import { publishToFacebook } from "./facebook";
import { publishToTwitter } from "./twitter";
import { publishToTelegram } from "./telegram";
import { publishToLine } from "./line";

interface Article {
  title: string;
  content: string;
  slug?: string;
  images?: string[];
}

interface Channel {
  id: number;
  name: string;
  type: string;
  config: Record<string, string>;
  is_active: boolean;
}

interface PublishResult {
  channel_id: number;
  channel_name: string;
  channel_type: string;
  success: boolean;
  post_id?: string;
  tweet_id?: string;
  message_id?: number;
  error?: string;
}

export async function publishToChannel(
  article: Article,
  channel: Channel
): Promise<PublishResult> {
  const base = {
    channel_id: channel.id,
    channel_name: channel.name,
    channel_type: channel.type,
  };

  if (!channel.is_active) {
    return { ...base, success: false, error: "Channel is not active" };
  }

  try {
    switch (channel.type) {
      case "facebook": {
        const result = await publishToFacebook(article, channel.config as never);
        return { ...base, ...result };
      }
      case "twitter":
      case "x": {
        const result = await publishToTwitter(article, channel.config as never);
        return { ...base, ...result };
      }
      case "telegram": {
        const result = await publishToTelegram(article, channel.config as never);
        return { ...base, ...result };
      }
      case "line": {
        const result = await publishToLine(article, channel.config as never);
        return { ...base, ...result };
      }
      default:
        return {
          ...base,
          success: false,
          error: `Unsupported channel type: ${channel.type}`,
        };
    }
  } catch (err) {
    return { ...base, success: false, error: `Publish error: ${err}` };
  }
}

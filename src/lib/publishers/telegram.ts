import { TELEGRAM_CHANNEL_URL } from "@/lib/constants";

interface Article {
  title: string;
  content: string;
  slug?: string;
  images?: string[];
}

interface TelegramConfig {
  bot_token: string;
  chat_id: string;
  site_url?: string;
}

interface PublishResult {
  success: boolean;
  message_id?: number;
  error?: string;
}

export async function publishToTelegram(
  article: Article,
  config: TelegramConfig
): Promise<PublishResult> {
  try {
    const { bot_token, chat_id, site_url } = config;

    if (!bot_token || !chat_id) {
      return { success: false, error: "Missing bot_token or chat_id" };
    }

    const link = site_url && article.slug
      ? `${site_url}/news/${article.slug}`
      : "";

    // 完整內文，不截斷
    let text = `<b>${escapeHtml(article.title)}</b>\n\n${escapeHtml(article.content)}`;
    if (link) {
      text += `\n\n📖 <a href="${link}">在網站上閱讀</a>`;
    }
    text += `\n\n——————————————\n📢 <a href="${TELEGRAM_CHANNEL_URL}">跟著小豪哥一起看球</a>｜即時體育新聞直送手機`;

    const imageUrl = article.images?.[0];

    // 有圖片時用 sendPhoto，沒有時用 sendMessage
    if (imageUrl) {
      return await sendPhoto(bot_token, chat_id, imageUrl, text);
    }

    return await sendMessage(bot_token, chat_id, text);
  } catch (err) {
    return { success: false, error: `Telegram publish failed: ${err}` };
  }
}

/**
 * 發送純文字訊息
 */
async function sendMessage(
  bot_token: string,
  chat_id: string,
  text: string
): Promise<PublishResult> {
  const response = await fetch(
    `https://api.telegram.org/bot${bot_token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id,
        text,
        parse_mode: "HTML",
      }),
    }
  );

  const data = await response.json();

  if (!data.ok) {
    return {
      success: false,
      error: data.description || `Telegram API error: ${response.status}`,
    };
  }

  return { success: true, message_id: data.result?.message_id };
}

/**
 * 發送圖片 + caption 訊息
 * Telegram sendPhoto caption 上限 1024 字元，超過時先發圖片再發文字
 */
async function sendPhoto(
  bot_token: string,
  chat_id: string,
  imageUrl: string,
  text: string
): Promise<PublishResult> {
  const apiBase = `https://api.telegram.org/bot${bot_token}`;

  // caption 上限 1024 字元
  if (text.length <= 1024) {
    const response = await fetch(`${apiBase}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id,
        photo: imageUrl,
        caption: text,
        parse_mode: "HTML",
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      // 圖片發送失敗時 fallback 到純文字
      console.warn(`[Telegram] sendPhoto failed: ${data.description}, falling back to sendMessage`);
      return await sendMessage(bot_token, chat_id, text);
    }

    return { success: true, message_id: data.result?.message_id };
  }

  // 超過 1024 字元：先發圖片（無 caption），再發文字
  const photoResponse = await fetch(`${apiBase}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id,
      photo: imageUrl,
    }),
  });

  const photoData = await photoResponse.json();

  if (!photoData.ok) {
    // 圖片失敗，直接發純文字
    console.warn(`[Telegram] sendPhoto failed: ${photoData.description}, sending text only`);
    return await sendMessage(bot_token, chat_id, text);
  }

  // 再發文字
  return await sendMessage(bot_token, chat_id, text);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

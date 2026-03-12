import { createServiceClient } from "@/lib/supabase";

const BUCKET_NAME = "article-images";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * 確保 Storage bucket 存在（首次執行時自動建立）
 */
export async function ensureBucket(): Promise<void> {
  const supabase = createServiceClient();
  const { data } = await supabase.storage.getBucket(BUCKET_NAME);
  if (!data) {
    await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
    });
  }
}

/**
 * 從 URL 下載圖片並上傳到 Supabase Storage
 * @returns Storage 的公開 URL，失敗時回傳 null
 */
export async function downloadAndStoreImage(
  imageUrl: string,
  articleSource: string
): Promise<string | null> {
  try {
    // 下載圖片
    const response = await fetch(imageUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return null;

    const buffer = Buffer.from(await response.arrayBuffer());

    // 太小的圖片跳過（可能是 tracking pixel）
    if (buffer.length < 5000) return null;

    // 產生檔案路徑：source/YYYY-MM/hash.ext
    const ext = getExtension(contentType, imageUrl);
    const hash = simpleHash(imageUrl);
    const now = new Date();
    const folder = `${sanitize(articleSource)}/${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const filePath = `${folder}/${hash}.${ext}`;

    // 上傳到 Supabase Storage
    const supabase = createServiceClient();
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error(`[ImageStorage] Upload failed for ${imageUrl}: ${error.message}`);
      return null;
    }

    // 取得公開 URL
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    return data.publicUrl;
  } catch (err) {
    console.error(`[ImageStorage] Failed to process ${imageUrl}: ${err}`);
    return null;
  }
}

/**
 * 批次下載並儲存圖片
 * @returns 成功儲存的 Storage URL 陣列（保持原始順序，失敗的會被過濾掉）
 */
export async function downloadAndStoreImages(
  imageUrls: string[],
  articleSource: string
): Promise<string[]> {
  if (imageUrls.length === 0) return [];

  const results = await Promise.allSettled(
    imageUrls.map((url) => downloadAndStoreImage(url, articleSource))
  );

  return results
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((url): url is string => url !== null);
}

function getExtension(contentType: string, url: string): string {
  const mimeMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  };

  if (mimeMap[contentType]) return mimeMap[contentType];

  // 從 URL 猜測
  const match = url.match(/\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i);
  if (match) return match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();

  return "jpg"; // 預設
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
}

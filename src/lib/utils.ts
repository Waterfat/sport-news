import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 從 Markdown 內容中提取摘要文字
 * 跳過標題、列表、引用等非正文行，取第一段有意義的文字
 */
export function getExcerpt(content: string | null, maxLength = 120): string {
  if (!content) return "";
  const lines = content.split("\n").filter(Boolean);
  const firstParagraph = lines.find(
    (line) =>
      !line.startsWith("#") &&
      !line.startsWith("-") &&
      !line.startsWith(">") &&
      line.trim().length > 20
  );
  if (firstParagraph) {
    return firstParagraph
      .replace(/[#*_\[\]()>`~]/g, "")
      .trim()
      .slice(0, maxLength);
  }
  return content
    .replace(/[#*_>\-\n\[\]()>`~]/g, " ")
    .trim()
    .slice(0, maxLength);
}

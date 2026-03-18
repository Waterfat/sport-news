/** Extract headings from markdown content for TOC (server-safe, no "use client") */
export function extractHeadings(
  content: string
): { id: string; text: string; level: number }[] {
  const headings: { id: string; text: string; level: number }[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[#*_\[\]()>`~]/g, "").trim();
      const id = text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
      headings.push({ id, text, level });
    }
  }
  return headings;
}

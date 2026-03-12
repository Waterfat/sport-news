/**
 * 手動測試爬蟲腳本
 * 使用方式：npx tsx scripts/test-crawl.ts
 *
 * 注意：此腳本僅測試爬蟲邏輯，不寫入資料庫
 */

import { espnCrawler } from "../src/lib/crawlers/espn";
import { yahooSportsCrawler } from "../src/lib/crawlers/yahoo-sports";
import { ettodaySportCrawler } from "../src/lib/crawlers/ettoday-sport";

async function main() {
  console.log("=== 體育新聞爬蟲測試 ===\n");

  const crawlers = [espnCrawler, yahooSportsCrawler, ettodaySportCrawler];

  for (const crawler of crawlers) {
    console.log(`--- ${crawler.name} ---`);
    try {
      const articles = await crawler.crawl();
      console.log(`共抓取 ${articles.length} 篇文章\n`);

      for (const article of articles.slice(0, 3)) {
        console.log(`  標題: ${article.title}`);
        console.log(`  分類: ${article.category}`);
        console.log(`  圖片: ${article.images.length} 張`);
        console.log(`  內容: ${article.content.substring(0, 100)}...`);
        console.log(`  URL:  ${article.url}`);
        console.log();
      }
    } catch (error) {
      console.error(`  錯誤: ${error}`);
    }
    console.log();
  }
}

main().catch(console.error);

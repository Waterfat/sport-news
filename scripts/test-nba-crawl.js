const cheerio = require('cheerio');

async function test() {
  const res = await fetch('https://www.nba.com/news', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  // What generic crawler looks for
  const selectors = [
    'a[href*="/news/"]',
    'a[href*="/story/"]',
    'a[href*="/article/"]',
  ];

  const found = [];
  for (const sel of selectors) {
    $(sel).each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && text.length > 20 && !href.includes('category') && !href.includes('key-dates')) {
        found.push({ href, text: text.slice(0, 80) });
      }
    });
  }

  const unique = [...new Map(found.map(f => [f.href, f])).values()];
  console.log(`Found ${unique.length} article links:`);
  unique.slice(0, 10).forEach(l => console.log(`  ${l.href}`));
  console.log('');

  // Test crawling first article
  if (unique.length > 0) {
    const articlePath = unique[0].href;
    const articleUrl = articlePath.startsWith('http') ? articlePath : `https://www.nba.com${articlePath}`;
    console.log(`Testing article: ${articleUrl}`);

    const artRes = await fetch(articleUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    });
    const artHtml = await artRes.text();
    const art$ = cheerio.load(artHtml);

    // Title
    const title = art$('h1').first().text().trim() ||
                  art$('meta[property="og:title"]').attr('content') || '';
    console.log(`Title: ${title}`);

    // Content
    const contentSelectors = ['article p', '.article-body p', '.story-body p', 'main p', '.ArticleContent_content p'];
    for (const cs of contentSelectors) {
      const paragraphs = [];
      art$(cs).each((i, el) => {
        const t = art$(el).text().trim();
        if (t.length > 20) paragraphs.push(t);
      });
      if (paragraphs.length > 0) {
        console.log(`Content selector "${cs}": ${paragraphs.length} paragraphs, ${paragraphs.join(' ').length} chars`);
      }
    }

    // Images
    const images = [];
    art$('article img, main img, .article-body img').each((i, el) => {
      const src = art$(el).attr('src') || art$(el).attr('data-src');
      if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('svg')) {
        images.push(src);
      }
    });
    console.log(`Images: ${images.length}`);
    images.slice(0, 3).forEach(img => console.log(`  ${img.slice(0, 100)}`));
  }
}

test().catch(console.error);

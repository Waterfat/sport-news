-- 啟用 UUID 擴充
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 寫手人設
CREATE TABLE writer_personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  style_prompt TEXT NOT NULL,
  avatar VARCHAR(500),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 爬取的原始新聞
CREATE TABLE raw_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  url VARCHAR(1000) UNIQUE NOT NULL,
  crawled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  category VARCHAR(50),
  is_processed BOOLEAN DEFAULT FALSE
);

-- AI 產出的文章
CREATE TABLE generated_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raw_article_ids UUID[] DEFAULT '{}',
  writer_persona_id UUID REFERENCES writer_personas(id),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  images JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'rejected')),
  reviewer_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- 發布紀錄
CREATE TABLE publish_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES generated_articles(id),
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('web', 'fb', 'x', 'tg')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  published_url VARCHAR(1000),
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_raw_articles_crawled_at ON raw_articles(crawled_at DESC);
CREATE INDEX idx_raw_articles_source ON raw_articles(source);
CREATE INDEX idx_raw_articles_category ON raw_articles(category);
CREATE INDEX idx_raw_articles_is_processed ON raw_articles(is_processed);
CREATE INDEX idx_generated_articles_status ON generated_articles(status);
CREATE INDEX idx_generated_articles_created_at ON generated_articles(created_at DESC);
CREATE INDEX idx_publish_logs_article_id ON publish_logs(article_id);

-- 預設寫手人設
INSERT INTO writer_personas (name, style_prompt, description) VALUES
(
  '熱血阿翔',
  '你是「熱血阿翔」，一個充滿激情的體育新聞記者。你的寫作風格：
- 熱情奔放，善用驚嘆號和感嘆詞
- 像現場球賽轉播員一樣生動描述比賽過程
- 帶有台灣口語感，親切自然
- 善用比喻和誇張手法讓讀者身歷其境
- 會用「太扯了！」「不敢相信！」「這球簡直神了！」等口語
- 段落節奏明快，讓讀者感受到比賽的緊張刺激',
  '熱情奔放的體育轉播風格，帶有台灣口語感'
),
(
  '理性分析師 Rex',
  '你是「理性分析師 Rex」，一個專業的體育數據分析師。你的寫作風格：
- 數據導向，善用統計數字佐證觀點
- 冷靜客觀，避免過度情緒化用語
- 深入分析戰術佈局和策略調整
- 會引用歷史數據進行比較
- 使用專業術語但會適時解釋
- 結論有理有據，邏輯清晰
- 善用「從數據來看」「值得注意的是」「統計顯示」等用語',
  '數據導向、冷靜客觀的專業分析師'
),
(
  '毒舌球評老王',
  '你是「毒舌球評老王」，一個犀利直率的體育評論員。你的寫作風格：
- 犀利評論，敢講敢說，不怕得罪人
- 帶點幽默和諷刺，讓人又氣又笑
- 觀點鮮明，立場堅定
- 善用反問句和對比來加強論點
- 會直接點名批評表現不佳的球員或教練
- 用語直白但不粗俗
- 善用「說實話」「別再自欺欺人了」「醒醒吧」等用語',
  '犀利直率、帶點幽默諷刺的毒舌球評'
),
(
  '溫馨小編 Mia',
  '你是「溫馨小編 Mia」，一個溫暖親切的體育新聞編輯。你的寫作風格：
- 溫暖親切，關注選手背後的故事和人情味
- 善於挖掘感人細節和花絮
- 用語溫和，適合入門讀者閱讀
- 會帶入選手的成長背景、家庭故事
- 注重運動精神和正面價值觀
- 善用「令人感動的是」「背後的故事」「不為人知的一面」等用語
- 讓即使不懂體育的讀者也能感受到故事的溫度',
  '溫暖親切、關注選手故事與人情味'
);

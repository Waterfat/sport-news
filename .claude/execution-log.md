## Issue #140: fix: ESPN 爬蟲無法抓取文章圖片

### Phase 0: 評估 — 2026-03-21

- [x] 需求分級：**S** — 單一檔案 bug fix，根因已分析
- [x] 風險掃描：低風險，只影響圖片抓取邏輯
- [x] Phase 1-2 跳過：S 級別 + 根因分析已完成

### Phase 3: 工程 — 2026-03-21

- [x] Git-Ops 建立 branch fix/140-espn-crawler-images — 23:10
- [x] BE 完成修復（3 點修復）— 23:15
  1. `<picture><source srcset>` 解析：img 無 src 時從 picture source 取 srcset
  2. 放寬容器選擇器：增加 .story-body, .story, main
  3. og:image 降級：與 generic.ts 對齊
- [x] Review 完成（bugs + compliance）— 23:20
  - bugs: 2 Medium — 段落重複(已修)、authorExclude 不完整(已修)
  - compliance: CATEGORY_MAP 差異不適用，已統一 authorExclude regex
- [x] test-crawl.ts 驗證：ESPN 19 篇文章含圖片 ✓

### Phase 4: QA — 2026-03-21

- [x] TypeScript 編譯通過
- [x] 409 unit tests 全部通過
- [x] QA 3/3 通過（vitest + smoke + E2E 54 passed）

### Phase 5: 交付 — 2026-03-21

- [x] Git push + PR #149 merged — 23:25
- [x] Deploy（main → release）+ 部署後 QA 通過
- [x] Issue #140 已關閉
- [ ] Evolve: 待執行（autopilot 最後一個 PR 後統一執行）

---

## Issue #139: research: 研究總編輯 Skill 設計

### Phase 0: 評估 — 2026-03-22

- [x] 需求分級：研究類 Issue，無程式碼變更
- [x] 分析：研究目標已被 Issue #141 的詳細規格完全覆蓋
- [x] 決定：關閉 #139，實作統一在 #141 進行
- [x] Issue #139 已關閉（reason: not planned, superseded by #141）

---

## Issue #141: feature: 新增寫手+總編輯 Skill，重構產文流程

### Phase 0: 評估 — 2026-03-22

- [x] 需求分級：**XL** — 跨模組架構變更（Skill 定義 + DB + Scripts + API + FE）
- [x] 風險掃描：DB schema ⚠️ 高風險 + Pipeline 依賴 ⚠️ 高風險
- [x] Pipeline 現況分析完成：理解 plan-generator → local-rewriter → auto-pipeline → publish 完整流程
- [x] 拆分計畫：4 PR 交付（DB+Skill → Writer → Editor → Frontend）

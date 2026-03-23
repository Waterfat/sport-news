# Issue #193: 補 #192 hotfix 的 unit test + E2E test

## 級別：S

## 需求
補 #192 hotfix（排行榜頁 404 + .map TypeError）的防禦性測試：

### Unit Test
- GameSummaryTab：seasonSeries.games 為 undefined 時不 crash
- GameBoxScoreTab：boxScore.players 為 undefined 時不 crash
- ScoreboardClient：data.games 為 undefined/null 時顯示「暫無比賽」

### E2E Test
- 首頁側欄「完整排名」連結 → 點擊後正確導航到 /standings/nba
- /standings/nba 頁面正常載入排名資料

---

## QA Report

### 單元測試
- 新增 3 個測試檔案、16 個 test case，全部通過
- 完整套件：81 檔 / 1022 tests / 0 failed

### E2E 測試
- 新增排行榜頁 3 個 test case（導航 + 頁面載入 + API 格式）
- 位置：`e2e/public.spec.ts` 排行榜頁區段

### 品質判定
- **結果：PASS**

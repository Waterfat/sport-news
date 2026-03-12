# Sport News 專案規則

## 強制開發流程

- 每次 commit 前必須執行 `npx vitest run`，測試未通過不得 commit
- 新增/修改 `src/lib/*.ts` 或 `src/app/api/**/*.ts` → 必須同步新增/更新對應 unit test
- `/review` 重構完 → 執行 `/write-tests` 補齊測試覆蓋
- **部署後必須執行 `./scripts/smoke-test.sh`**，全部通過才算部署完成。不得手動挑選驗證項目。

## 測試指令

- 執行測試：`npx vitest run`
- 監聽模式：`npx vitest`
- 測試檔案位置：`src/__tests__/`
- 測試命名規則：`src/__tests__/lib/<module>.test.ts`、`src/__tests__/components/<Component>.test.tsx`

## 技術棧

- Next.js App Router + TypeScript
- Supabase (PostgreSQL) - Project Ref: `fmakjkvkmbltqgyndijb`
- Vitest + jsdom (測試)
- Tailwind CSS + shadcn/ui
- NextAuth.js (認證)

## 共用常數

新增常數統一放 `src/lib/constants.ts`，避免跨檔案重複定義。

## 發布邏輯

所有發布行為統一使用 `src/lib/publish-article.ts` 的 `publishArticle()` 函式，預設全頻道發布。

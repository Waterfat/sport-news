---
date: 2026-03-23
project: sport_news
trigger: manual
---

## 問題清單

### 1. docs/ 文件產出後未自動同步 Notion
- **根因**：PM skill 流程規則沒有明確要求 docs/ 更新後同步 Notion
- **修改**：`~/.claude/skills/pm/SKILL.md` Rules 新增「docs/ 文件產出後必須同步 Notion」
- **重要度**：高

### 2. Twitter publisher 測試斷言基於外部規格而非程式邏輯
- **根因**：寫測試時假設推文 ≤ 280 字元（Twitter 限制），但程式碼只截斷標題不限制總長
- **修改**：新增 instinct `qa-verify-actual-logic-before-assertion.md`
- **重要度**：低

### 3. 批次文件補齊無標準 SOP（未執行）
- **根因**：PM 只有 Mode A（新專案）和 Mode B（繼續），沒有 docs-audit 模式
- **修改**：使用者決定不執行
- **重要度**：中

## 修改摘要
- `~/.claude/skills/pm/SKILL.md`：Rules 新增 Notion 同步規則
- `~/.claude/instincts/qa-verify-actual-logic-before-assertion.md`：新增 instinct

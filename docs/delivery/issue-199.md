# Issue #199: refactor: 優化 Skill 讀取規格書的 token 消耗 — 依 Issue 級別分層讀取

**級別**：M

---

## PM 交接

依 Issue 級別（S/M/L/XL）決定各 skill 讀取文件的深度，降低 S/M 級 token 消耗。

修改範圍：PM、SA、SD、DBA、FE、BE、QA 共 7 個 skill 的 SKILL.md。

---

## SA 交接

### SRS — Skill 文件分層讀取策略

**目標**：依 Issue 級別（S/M/L/XL）控制各 skill 讀取文件的深度，S/M 級不讀完整規格書。

---

### US-1: 依級別決定文件讀取深度

**As a** PM（調度者）
**I want** 各 skill 根據 Issue 級別自動決定讀取深度
**So that** S/M 級任務不浪費 token 讀完整規格書

**AC：**

正向：
- Given Issue 級別為 S，When PM 調度 FE，Then FE 只讀 `docs/delivery/issue-N.md` + 專案 `CLAUDE.md`，不讀 `docs/specs/` 下任何規格書
- Given Issue 級別為 M，When PM 調度 QA，Then QA 讀 delivery log + 僅讀 SRS 中與本次變更相關的 US 段落（由 delivery log 指引），不讀完整 SRS
- Given Issue 級別為 L/XL，When PM 調度任何 skill，Then 維持現行行為（讀完整規格書）

負向：
- Given Issue 級別為 S，When FE 在 delivery log 中找不到足夠資訊，Then FE 向 PM 回報「資訊不足」，PM 決定是否升級讀取深度，FE 不可自行去讀完整規格書
- Given Issue 級別為 M，When QA 發現 delivery log 指引的 US 不完整，Then QA 向 PM 回報，PM 決定是否升級為 L 級完整讀取

邊界：
- Given Issue 級別為 HOTFIX，When PM 調度 QA，Then QA 使用 S 級讀取深度（只讀 delivery log），但必須讀完整 E2E 測試清單確保迴歸
- Given Issue 級別為 OPS（無程式碼變更），When PM 調度 skill，Then 只讀 `CLAUDE.md` + delivery log

---

### US-2: PM 在 delivery log 中標註讀取指引

**As a** PM
**I want** 在建立 `docs/delivery/issue-N.md` 時標註相關規格段落的引用路徑
**So that** M 級 skill 能精準讀取相關段落而非全文

**AC：**

正向：
- Given PM 建立 delivery log，When Issue 為 M 級以上，Then delivery log 包含「相關規格引用」區段，列出相關的 US 編號和 API endpoint 路徑
- Given delivery log 有引用 `US-3, US-7`，When SD 讀取，Then SD 只讀 SRS 中 US-3 和 US-7 的段落

負向：
- Given PM 漏填引用區段，When skill 讀取 delivery log 找不到引用，Then skill 回報 PM 補填，不自行猜測

邊界：
- Given Issue 為 S 級，When PM 建立 delivery log，Then 不需要「相關規格引用」區段（S 級不讀規格書）

---

### 分層讀取策略表

| 級別 | delivery log | CLAUDE.md | SRS | API_SPEC | SCHEMA | INTERACTION_SPEC | 備註 |
|------|-------------|-----------|-----|----------|--------|-------------------|------|
| **S** | 全文 | 全文 | 不讀 | 不讀 | 不讀 | 不讀 | 資訊全在 delivery log |
| **HOTFIX** | 全文 | 全文 | 不讀 | 不讀 | 不讀 | 不讀 | 同 S，但 QA 需讀既有 E2E |
| **OPS** | 全文 | 全文 | 不讀 | 不讀 | 不讀 | 不讀 | 無程式碼變更 |
| **M** | 全文 | 全文 | 相關 US 段落 | 相關 endpoint | 相關 table | 相關頁面段落 | 由 delivery log 引用指引 |
| **L** | 全文 | 全文 | 全文 | 全文 | 全文 | 全文 | 完整讀取 |
| **XL** | 全文 | 全文 | 全文 | 全文 | 全文 | 全文 | 完整讀取 |

---

### 各 Skill 具體改動

| Skill | 目前行為 | 改動內容 |
|-------|---------|---------|
| **PM** | Step 0.project 建立 delivery log，無引用指引 | M 級以上：delivery log 新增「相關規格引用」區段（`related_specs:`），列出相關 US 編號、API endpoint、DB table、頁面 |
| **SA** | 固定寫入 `docs/specs/需求規格書(SRS).md` 全文 | 無需改動（SA 是規格書的產出者，不是消費者） |
| **SD** | 輸入段寫「讀 SRS + 技術棧」，無級別判斷 | 開工前加級別判斷：S 級跳過（PM 不會調度）、M 級只讀 delivery log 引用的 US 段落、L/XL 讀全文 |
| **DBA** | 輸入段寫「讀 SD 資料需求清單」，無級別判斷 | 開工前加級別判斷：S 級跳過、M 級只讀 delivery log 引用的 table、L/XL 讀全文 SCHEMA |
| **FE** | 「三份聖經」固定全讀，無級別判斷 | 開工前「工作模式判斷」段落加入讀取深度邏輯：小型（≤3 檔）只讀 delivery log、中型讀引用段落、大型讀全文。與既有的小/中/大型模式對齊 |
| **BE** | 輸入段寫「讀 API 文件 + ERD + Schema」，無級別判斷 | 同 FE 邏輯：輕量模式只讀 delivery log、標準模式讀引用段落、完整模式讀全文 |
| **QA** | Rules 寫「QA 必須讀完整規格書」，無級別判斷 | 修改 Step 0 級別判斷表：S 級快速模式不讀規格書、M 級讀 delivery log + 引用段落、L/XL 維持「必須讀完整規格書」。同時修改 Rules 中的「QA 必須讀完整規格書」加上「（M 級以上）」限定 |

---

### NFR

| 項目 | 值 |
|------|-----|
| 向下相容 | 改動不影響既有 L/XL 流程 |
| 可觀測性 | PM execution-log 記錄實際讀取深度（如「QA: M 級讀取，引用 US-3」） |
| 回退機制 | skill 遇到資訊不足時向 PM 回報，PM 可升級讀取深度 |

---

### 範圍外

- 不改 delivery log 的檔案格式（只新增 `related_specs` 區段）
- 不改規格書本身的結構
- 不改 Architect、UI/UX、Review、Git-Ops、OPS、Doc、Retro、Evolve 等非目標 skill
- 不實作自動 token 計算或監控

---

### 給 SD 的注意事項

- 這是純 SKILL.md 文字修改，無 API/DB/UI 變更
- 每個 skill 的改動互相獨立，可並行修改
- PM 的 delivery log 模板改動是所有下游 skill 的前提，應先改 PM

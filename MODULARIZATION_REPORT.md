# Preview 拆檔報告（2026-09-24）

基準：`chatgpt-dev` 的 `35a4b4c5388f422e8342ec7d22da767ad4399096`。遊戲拆檔只套用到測試版；正式遊戲 `main/index.html` 與獨立的私有平衡設計器均未修改，`main` 的部署 workflow 另有必要的資產複製調整。

## 原本與目前結構

原本只有 `index.html`（8,319 行）、`DEVELOPMENT.md` 與既有報告；HTML 含 18 段樣式、39 段傳統腳本。現在 HTML 仍是入口，樣式依原來的 cascade 順序連結 `css/` 下 18 個檔案，腳本依原來的解析順序連結 `js/` 下 39 個檔案。沒有改成 ES Module，仍使用原本共用的全域介面。

| 目錄／主要檔案 | 責任及常用修改入口 |
| --- | --- |
| `index.html` | DOM 骨架、按原順序載入資產；新檔案需留意相鄰載入順序。 |
| `css/base.css`、其他 `css/*.css` | 基礎樣式及各既有系統的後續覆蓋；按 HTML 載入順序決定 cascade。 |
| `js/core/core-game.js` | 既有主流程、狀態、角色、戰鬥、裝備、存檔及歷史相容層；仍有 1,595 行。`startup-guard.js` 顯示啟動錯誤。 |
| `js/character/class-growth.js` | 各職業成長的後續設定。 |
| `js/combat/*.js` | 戰鬥統計、冷卻、手動 BOSS、回合時間、貢獻、控制與召喚。 |
| `js/equipment/*.js` | 裝備屬性、品質、洗鍊、分解、鍛造導覽、待領裝備、詞綴。 |
| `js/world/*.js` | 怪物掉落、動態地圖、終局地圖及其後續修補。 |
| `js/items/*.js` | 藥水、商店與消耗品。 |
| `js/skills/*.js` | 技能提示、輔助與減益、專精、自訂狀態。 |
| `js/ui/*.js` | 文字設定、遠征、戰報版面、背包控制及專精介面。 |
| `js/balance/*.js` | 遊戲端平衡設定 schema、匯入執行、數值壓縮與公式；私有設計器不在此 Repository。 |

### 檔案對照

| 檔案 | 原有區塊的用途 |
| --- | --- |
| `css/ally-row.css` | 隊員列可讀性樣式 |
| `css/base.css` | 既有基礎與主要版面樣式 |
| `css/battle-statistics.css` | 戰鬥統計樣式 |
| `css/combat-contribution.css` | 戰鬥貢獻條樣式 |
| `css/economy-inventory.css` | 經濟與背包樣式 |
| `css/equipment-identity.css` | 裝備識別與品質樣式 |
| `css/forge-navigation.css` | 鍛造列表導覽樣式 |
| `css/healing-potions.css` | 治療藥水樣式 |
| `css/inventory-controls.css` | 背包控制樣式 |
| `css/json-description.css` | JSON 描述區樣式 |
| `css/mastery-ui.css` | 專精介面樣式 |
| `css/pending-gear-compact.css` | 待領裝備精簡列樣式 |
| `css/pending-gear-detail.css` | 待領裝備詳細列表樣式 |
| `css/pending-gear-loot.css` | 待領掉落樣式 |
| `css/shop-inventory.css` | 商店背包樣式 |
| `css/skill-rules-help.css` | 技能規則說明樣式 |
| `css/skill-tooltip-reroll.css` | 技能提示與洗鍊樣式 |
| `css/status-maker.css` | 自訂狀態介面樣式 |
| `js/balance/balance-runtime.js` | 平衡設定匯入與執行時套用 |
| `js/balance/balance-schema.js` | 平衡設定結構與驗證 |
| `js/balance/numeric-compression-formula.js` | 現有壓縮數值與傷害公式覆寫 |
| `js/character/class-growth.js` | 各職業初始與每級成長 |
| `js/combat/action-turn-cooldown.js` | 行動回合冷卻與敵方技能 |
| `js/combat/battle-statistics.js` | 戰鬥、死亡與掉落統計 |
| `js/combat/combat-contribution.js` | 隊員傷害、治療、減傷貢獻 |
| `js/combat/control-status-summon.js` | 控制狀態與召喚 |
| `js/combat/manual-boss.js` | 手動 BOSS 挑戰 |
| `js/combat/turn-duration.js` | 戰鬥回合節奏 |
| `js/core/core-game.js` | 原有主流程、資料、渲染、存檔與相容層 |
| `js/core/startup-guard.js` | 啟動失敗畫面 |
| `js/equipment/affix-pool.js` | 分部位、等級的詞綴池 |
| `js/equipment/economy-salvage.js` | 經濟、販售與分解 |
| `js/equipment/equipment-identity.js` | 裝備識別、穿戴與品質 |
| `js/equipment/equipment-stat-source.js` | 裝備屬性來源調整 |
| `js/equipment/forge-navigation.js` | 鍛造列表導覽 |
| `js/equipment/pending-gear-compact.js` | 待領裝備精簡操作 |
| `js/equipment/pending-gear-detail.js` | 待領裝備詳細清單 |
| `js/equipment/pending-gear-loot.js` | 戰鬥裝備暫存領取 |
| `js/items/healing-potions.js` | 治療藥水規則 |
| `js/items/shop-inventory.js` | 商店與物品背包 |
| `js/skills/mastery-cleanup.js` | 專精後續相容清理 |
| `js/skills/mastery-core.js` | 專精規則與資料 |
| `js/skills/skill-tooltip-reroll.js` | 技能提示與自動洗鍊 |
| `js/skills/status-maker.js` | 自訂狀態定義與套用 |
| `js/skills/support-debuff.js` | 輔助技能與減益 |
| `js/ui/expedition-density.js` | 遠征畫面密度 |
| `js/ui/expedition-layout.js` | 遠征版面穩定 |
| `js/ui/expedition-ui.js` | 遠征介面整理 |
| `js/ui/inventory-controls.js` | 背包控制折疊 |
| `js/ui/journal-split.js` | 戰報分割尺寸 |
| `js/ui/mastery-ui.js` | 專精介面 |
| `js/ui/ui-text-config.js` | 畫面文字設定 |
| `js/world/custom-final-stage.js` | 自訂終局關卡 |
| `js/world/dynamic-world.js` | 動態地圖與怪物 |
| `js/world/final-map.js` | 終局地圖類型 |
| `js/world/monster-drop-tables.js` | 怪物掉落表 |
| `js/world/world-followup.js` | 世界執行時後續修補 |

這些檔案代表原有載入區塊，並非重新建立獨立狀態。部分檔案會包裝或覆寫前面定義的函式；依賴以 `index.html` 的先後次序為準。公式與其後續覆寫位於 `core-game.js` 和 `js/balance/numeric-compression-formula.js`，設計器的 JSON 契約沒有改動。沒有新增 JSON 資料檔，因為原資料與執行時覆寫交織，這次不冒險改 schema。

## 驗證

- 逐段比對原版與拆版：18 段 CSS、39 段 JS 的文字內容與出現次序完全相同；以資產佔位符還原後，其餘 HTML 內容相同。沒有修改公式、數值、DOM id、LocalStorage key、存檔或 JSON schema。
- 39 個 JS 檔全部通過 `node --check`；HTTP 實際提供 `index.html` 與 57 個資產，所有資產均為 200，回傳位元組與檔案相同。
- 使用 jsdom 對基準版與拆版做固定時間與固定 RNG 的同一流程比較：啟動、建角、遭遇生成、自動戰鬥 50 次 tick、戰利品結算、存讀檔、JSON 匯出與匯入、平衡設定匯出、自訂狀態自測。UI、狀態、敵人、戰報、存檔、匯出資料與 RNG 呼叫次數逐項一致；兩版無執行錯誤。
- 線上 `/preview/` 的 57 個 CSS/JS 資產逐一 HTTP 取回並與提交內容比對相同。以雲端 Chrome 實際建立角色、啟動自動戰鬥、觀察技能與戰報更新、檢查死亡統計、存檔後重新整理讀回角色；遊戲來源沒有 console error。瀏覽器擴充元件自身有與遊戲無關的訊息。

沒有在這次驗證中確認可歸因於原版的遊戲 Bug；原本的死亡統計問題未在本次拆檔中修改，也沒有宣稱已修復。`core-game.js` 與若干後續覆寫層仍偏大，未做函式內部重構或移除歷史包裝。

## 部署

依本次追加授權，`main` 的 Pages workflow 在 `c1a6ce9` 增加複製 preview 的 `css/` 與 `js/`；正式遊戲的 `main/index.html` 沒有變動。測試版拆檔提交已快轉至 `chatgpt-dev`，線上 `/preview/` 已提供全部 57 個資產並可啟動。獨立平衡設計器維持原樣。

## 提交

| Commit | 內容 |
| --- | --- |
| `28aa04c` | 原順序抽出 CSS。 |
| `596bf42` | 抽出啟動保護與原核心腳本。 |
| `15bff03` | 抽出裝備、戰鬥、世界、設定等既有層。 |
| `976f8bb` | 抽出 UI、道具、戰鬥顯示層。 |
| `89e3508` | 抽出公式、專精、成長、自訂狀態層。 |

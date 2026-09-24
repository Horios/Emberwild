# Preview 拆檔報告（2026-09-24）

基準：`chatgpt-dev` 的 `35a4b4c5388f422e8342ec7d22da767ad4399096`。此分支只整理測試版；正式版 `main` 與獨立的私有平衡設計器均未修改。

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

這些檔案代表原有載入區塊，並非重新建立獨立狀態。部分檔案會包裝或覆寫前面定義的函式；依賴以 `index.html` 的先後次序為準。公式與其後續覆寫位於 `core-game.js` 和 `js/balance/numeric-compression-formula.js`，設計器的 JSON 契約沒有改動。沒有新增 JSON 資料檔，因為原資料與執行時覆寫交織，這次不冒險改 schema。

## 驗證

- 逐段比對原版與拆版：18 段 CSS、39 段 JS 的文字內容與出現次序完全相同；以資產佔位符還原後，其餘 HTML 內容相同。沒有修改公式、數值、DOM id、LocalStorage key、存檔或 JSON schema。
- 39 個 JS 檔全部通過 `node --check`；HTTP 實際提供 `index.html` 與 57 個資產，所有資產均為 200，回傳位元組與檔案相同。
- 使用 jsdom 對基準版與拆版做固定時間與固定 RNG 的同一流程比較：啟動、建角、遭遇生成、自動戰鬥 50 次 tick、戰利品結算、存讀檔、JSON 匯出與匯入、平衡設定匯出、自訂狀態自測。UI、狀態、敵人、戰報、存檔、匯出資料與 RNG 呼叫次數逐項一致；兩版無執行錯誤。
- 環境沒有可用的 Chromium；下載瀏覽器失敗。因此未完成真正瀏覽器中的視覺與 console 驗收。jsdom 比對不能取代這項驗收。

沒有在這次驗證中確認可歸因於原版的遊戲 Bug；原本的死亡統計問題未在本次拆檔中修改，也沒有宣稱已修復。`core-game.js` 與若干後續覆寫層仍偏大，未做函式內部重構或移除歷史包裝。

## 部署阻礙

`main` 的 `.github/workflows/deploy-preview.yml` 目前只複製 `preview-source/index.html` 到 `_site/preview/index.html`。如果直接把此分支推到 `chatgpt-dev`，線上 `/preview/` 會缺少 `css/` 和 `js/`，遊戲會停在啟動畫面。要讓新結構能在 GitHub Pages 使用，該 workflow 至少需要在組裝 artifact 時增加：

```sh
cp -R preview-source/css preview-source/js _site/preview/
```

`main` 的正式遊戲內容不能修改，而該 workflow 只從 `main` context 執行；因此目前先在獨立檢查分支保留拆檔提交，未更新 `chatgpt-dev`。完成部署資產複製和瀏覽器驗收後，才能安全推進預覽分支。

## 提交

| Commit | 內容 |
| --- | --- |
| `3ad2135` | 原順序抽出 CSS。 |
| `6db17e3` | 抽出啟動保護與原核心腳本。 |
| `c89ab0e` | 抽出裝備、戰鬥、世界、設定等既有層。 |
| `3df192c` | 抽出 UI、道具、戰鬥顯示層。 |
| `c18c72a` | 抽出公式、專精、成長、自訂狀態層。 |

# Emberwild 開發與修改說明

本 Repository 為《餘燼荒野 · Emberwild》主遊戲專案。

## 正式版本

- `main`：公開正式版本。
- GitHub Pages 由 `main` 分支根目錄的 `index.html` 自動部署。
- 正式網站：https://horios.github.io/Emberwild/

## ChatGPT 修改流程

後續請勿直接以舊的對話附件作為最新版本來源。

每次要修改遊戲時：

1. 先開啟本 Repository。
2. 以 `chatgpt-dev` 分支目前的檔案作為修改基準。
3. 修改 `index.html` 時，先讀取該分支的最新版本與 SHA，避免覆蓋較新的變更。
4. 完成修改後提交至 `chatgpt-dev`。
5. 測試確認後，再將變更合併至 `main`，由 GitHub Pages 自動部署正式版本。

若 `main` 有在其他地方直接修改，開始下一次工作前應先確認 `chatgpt-dev` 是否仍與最新正式版本同步；不可假設舊內容仍是最新版。

## 平衡設計器

平衡／設計器不放在此公開 Repository。

其原始碼位於 Private Repository：

`Horios/Emberwild-Balance`

主要檔案：

`balance-editor.html`

修改平衡器時應直接讀取該 Private Repository 的最新版本，不以過去下載或上傳的 HTML 附件作為最新來源。

## 原則

GitHub Repository 是目前專案的版本來源。對話中的舊附件只作歷史參考；除非使用者明確指定某個附件版本，否則後續修改一律先取得 GitHub 上指定分支的最新檔案。

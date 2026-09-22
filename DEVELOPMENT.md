# Emberwild 開發與修改說明

本 Repository 為《餘燼荒野 · Emberwild》主遊戲專案，GitHub Repository 是目前版本的唯一最新版來源。
過去對話中的附件只作歷史參考；除非使用者明確指定附件版本，否則不得以舊附件覆蓋 Repository 的最新內容。

## Branch 角色

- `main`：正式穩定版本。只接受已確認發布的正式遊戲修改，以及正式環境必要的設定。
- `chatgpt-dev`：GPT／開發修改的預設工作分支。所有尚未確認發布的遊戲功能、修正、UI 或數值修改都先提交到此分支。
- 不得為了讓 ahead/behind 歸零而重寫歷史、強制覆蓋分支，或把未測試內容直接帶入 `main`。

## 修改前的版本基準

每次修改前必須：

1. 讀取目標 branch 的最新 commit SHA。
2. 讀取要修改檔案的最新 blob SHA／內容。
3. 確認 branch 在寫入前沒有被其他修改推進；若 SHA 已變更，重新讀取並重新套用修改。
4. 以 GitHub Repository 的最新內容為基準，不以舊對話附件作為最新版。

## 開發流程

1. 所有遊戲修改預設只提交至 `chatgpt-dev`。
2. Push `chatgpt-dev` 後，由 GitHub Actions 重新部署 Preview。
3. 在 Preview 測試並確認修改。
4. 確認正式發布後，才用正常 commit／merge 將已測試的遊戲修改發布到 `main`。
5. 不得直接將未測試的 `chatgpt-dev` 內容發布至 `main`。
6. 不使用 reset、force push、rebase 或刪除既有歷史來整理分支差異。

## GitHub Pages 與 Preview

- GitHub Pages 的 publishing source 應設定為 **GitHub Actions**。
- `.github/workflows/deploy-preview.yml` 同時讀取 `main` 與 `chatgpt-dev`，組成單一 Pages artifact：
  - 網站根目錄 `/` 使用 `main/index.html`，永遠代表正式版。
  - `/preview/` 使用 `chatgpt-dev/index.html`，代表測試版。
- Preview 的「測試版本」標示只在部署階段寫入 `_site/preview/index.html`；不得修改 `chatgpt-dev/index.html` 原始遊戲檔案。
- Preview deployment 永遠不得 commit、push 或以其他方式修改 `main`。
- Preview 部署產物不得存在於任何開發 branch 的 Git 歷史中。
- 每次部署 artifact 都同時包含正式版根頁與 Preview，因此更新 Preview 不得用測試版覆蓋正式網站。

## 正式發布

正式發布只處理已確認的遊戲差異。不要因為 `main` 與 `chatgpt-dev` 的 commit 數量或 ahead/behind 顯示不同，就直接整枝 merge 或覆蓋。
發布前應先比較實際 `index.html` 內容，辨識哪些差異是已測試遊戲修改，哪些只是部署／文件歷史。

## 平衡設計器

平衡／設計器不放在此公開 Repository。
其原始碼位於 Private Repository：`Horios/Emberwild-Balance`，主要檔案為 `balance-editor.html`。
修改平衡器時同樣先讀取該 Repository 的最新 branch／檔案 SHA，不以舊附件作為最新版。

# 成長曲線驗證

這個基準版本原本沒有可執行的自動測試套件；本次加入純公式測試、完整頁面整合測試，以及實際三人隊模擬。完整結果與有效載入來源見 `../docs/PROGRESSION_REDESIGN.md`。

使用 Node.js 20 以上，先安裝依賴與 Chromium：

```sh
npm ci
npx playwright install --with-deps chromium
```

整合測試需要對應的私有平衡器開發版本。預設位置為同層 `../Emberwild-Balance/balance-editor.html`；也可指定其他路徑：

```sh
EMBERWILD_BALANCE_ROOT=/absolute/path/Emberwild-Balance npm test
npm run test:simulation
node tests/collect-progression.cjs /tmp/progression-rows.json
```

只有純公式測試時可執行 `npm run test:unit`。已有 Chromium／Chrome 的環境，可用 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指定瀏覽器執行檔。

- 整合測試載入 `index.html` 的完整 script 順序，檢查最終的 `stats`、怪物生成、BOSS／突破關卡、EXP 分配、設計器欄位、JSON 往返、舊存檔重載與恢復預設。
- 夥伴透過真正的招募流程取得固定配點與技能；沒有另外建造模擬版戰鬥 AI。
- 主模擬使用六種隊伍、七個等級、三種難度、3／6 普通怪、單菁英、同級 BOSS，以及 LV30 突破關卡，共 522 組，每組 24 個固定種子。模擬呼叫真正的 `pacedRound()`，停用藥水、EXP 與畫面更新，以便固定比較等級。每場上限 70 回合。
- 普通／困難／地獄分別採 T2 +0／T5 +5／T9 +10，同等級地區裝備，移除可選詞綴、寶石與 BOSS 專屬裝。玩家配置可用的 1 級技能，熟練度設定為足以滿足解鎖門檻；夥伴保留既有固定技能配置。這是完成基本養成的比較基準，並不代表所有配裝的保證勝率。
- 另用真正的創角、新手禮包與原始 3～6 隻隨機遭遇，每隊抽樣 256 場驗證 LV1。`--ungeared` 保留同地區 T1 +0 裝備，以量測高難度的養成需求。
- 模擬有瀏覽器錯誤、新手隊伍敗場、正常養成隊伍敗場，或平均超過 25 回合時會回傳失敗。低養成探索用的 `--ungeared` 容許敗場，仍禁止瀏覽器錯誤。

原始統計另存於 `../docs/progression-battles.csv`、`../docs/progression-curves.csv` 與 `../docs/progression-xp.csv`。CSV 的回合、HP 壓力等為固定種子平均值，人物與怪物的 HP／攻擊／防禦仍是整數。

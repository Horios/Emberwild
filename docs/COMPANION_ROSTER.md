# 夥伴名冊、裝備管理與設計評級

## 實際生效來源

本次延伸既有角色、共用背包與技能資料，沒有建立第二套角色或裝備庫。

| 責任 | 有效來源與函式 |
| --- | --- |
| 夥伴定義、取得 | 平衡 JSON `companions[]`；`js/character/companions.js` 的 `parsePlans`、`recruitCompanion`／`acquireCompanion` |
| 預設與評級設定 | `js/character/companion-model.js`；私有設計器 `companion-model-v1` 嵌入完全相同內容 |
| 已取得角色 | `party.members`；原有完整角色物件與穩定 `companionId`，主角沿用原本職業 key |
| 現役、上陣 | `party.enlisted`、`party.active`；`setPartnerEnlisted`、`toggleMember`、`confirmMemberReplacement` |
| 一般角色頁 | `enlistedHeroes`、`sortedEnlistedHeroes`、`pageHero`／`pageSelector` |
| 裝備物件與穿戴 | `party.sharedGear.items`、綁定的 `state.bag`、各角色 `equipped[]` UID；`ensureSharedGear`、`gearWearer` |
| 裝備欄位、限制 | 既有五格 `EQUIP_POSITION_NAMES`、`gearEquipPositions`、`gearWearableJobs`、`eligibleWearers` |
| 穿戴、替換、卸下 | `equipSharedGear`、`unequipSharedGear`、`previewEquip`／`confirmEquipComparison` |
| 詳細與比較 | 既有 `equipmentAttributeDetailsHTML`、`equipmentTotalSummaryHTML`、`equipmentComparison` 與最後生效的 `stats(h)` |
| 最終角色能力 | `equipment-identity.js` 的 `stats`；`heroGrowthDefinition` 提供職業／夥伴基礎成長，使用既有 `naturalStats`、配點、進階、裝備與技能計算 |
| 存讀檔 | `packParty`／`save`、`validateParty`／`loadParty`；version 3 增加選用欄位 |
| 技能唯一資料 | 核心 `classes[].skills[]`／`CLASSES[job].skills[index][6]` 與既有 `supportSkills`／`SUPPORT`；新增使用限制 `partnerId` |

## 名冊與舊資料

- `members` 是持有清單；移出現役只修改 `enlisted`，名稱、熟練度、裝備 UID 與其他個人資料保留。所有夥伴的 `lv` 同步第一名成員（主角），夥伴的 `xp` 為 0，不保存獨立經驗進度。
- `active` 維持原有一至三人規則，必須是 `enlisted` 子集。上陣角色須先移至後備／替換，才能移出現役。
- 現役上限只有 `companionSettings.activeLimit` 一個來源，預設 6，平衡器可調整。額滿拒絕編入並提示「現役夥伴已達上限」，不替換其他人。
- 舊存檔缺少 `enlisted` 時，全部已取得角色預設現役。降低上限也不驅逐既有人員，超額期間禁止增加。
- 開局沿用原本創角與招募流程。劇情、任務、活動可使用 `acquireCompanion(definitionId)`；現役有空位則編入，額滿則加入名冊。重複取得同一 ID 不建立副本。
- 名冊只列已取得角色。招募清單另開視窗，從實際平衡定義動態生成。
- 定義上限 512、已取得角色上限 513（含主角）是資料安全界線，並非固定角色清單。名字與職業不參與 ID 判斷。
- `companionProfiles` 只保存已取得夥伴快照。平衡器移除定義後，持有夥伴繼續使用與存讀檔；尚未取得的舊快照不會變成第二份招募清單。既有 ID 若變更職業，原角色保留原職業快照。
- 等級相同時讀檔不重新套用自動養成模板；等級不同時依主角等級更新固定配點、已解鎖技能、配置與自動二轉。舊存檔中較高級夥伴的超等裝備回到背包，因降級鎖定的技能寶石退回共用庫存。
- 探索每隻怪只向主角結算一次 EXP，即使主角未上陣也能取得；數量沿用原本單名出戰角色的 `round(怪物 EXP / 出戰人數)`，限時 EXP 增益只套用一次。名冊內與下陣夥伴也即時同步成長；未招募清單顯示主角等級，實際取得時依該等級建立完整技能與成長資料。

## 裝備責任與 UID

原「已穿戴裝備」頁擴充為「夥伴裝備」。左列現役夥伴，排序上陣、後備，再依戰士、法師、弓箭手、祭司與穩定 ID；名稱旁另列職業、等級與評級。

選人 → 選既有五格部位（空格可選）→ 部位／職業／等級均符合的未穿戴背包候選 → 既有比較 → 既有 UID 操作。空格直接穿戴；替換解除舊 UID 穿戴，卸下也只解除穿戴。共用裝備物件一直只有一份，不複製物件回背包。

`gearWearer` 檢查所有已取得角色，包括名冊。名冊角色裝備仍有主人，不能出現在正常候選與一般背包／強化清單；重新編入即可操作。待確認洗鍊結果不列入候選；鎖定、分解與掉落暫存仍使用原核心。

背包保留詳細能力、基底、前後綴、詞條、評級、強化／洗鍊入口、鎖定與分解；移除所有「給某人穿戴」按鈕。兩處後載入的冗餘 `filteredGear` 覆寫已移除，避免蓋掉名冊裝備過濾。

## 評級與差距依據

`companions[].rating` 為 D、C、B、A、S、SS、SSS 的設計分類，不加入戰鬥倍率、使用限制或養成後升級。舊資料與既有夥伴先用 D，不依目前戰力猜測評級。名稱、裝備與等級不會改變設計評級。

夥伴可沿用職業，或設定獨立 `initialStats`、`growthPerLevel`、`growthSteps`。可編輯 HP、攻擊、防禦、暴擊、暴傷與速度，不要求單項能力隨評級升高。專屬技能、機制與能力分布由設計者綜合判斷，不靠總量自動評級。

總量提示使用既有 `EmberwildProgression.naturalStats`，以 LV1→60 的 59 次成長差計算平均值，包括整數階梯、取整與實際循環配點。初始能力點造成的配點偏移也納入成長分布。這是未穿裝、未進階的設計比較，不是包含裝備、技能、進階的動態戰力。

權重預設：HP = 1/3、攻擊 = 1、防禦 = 1（依現行每能力點收益）；暴擊 = 100、暴傷 = 10、速度 = 0.1。後三者是可調設計輔助權重，不宣稱戰鬥價值等價。原始 HP＋攻擊＋防禦總量也獨立顯示。

| 既有夥伴定位 | 加權基礎總量 | 加權平均總成長／級 |
| --- | ---: | ---: |
| 攻擊戰士 | 58.250 | 7.039 |
| 保護戰士 | 58.250 | 7.039 |
| 法師 | 55.183 | 6.372 |
| 祭司 | 55.650 | 6.197 |
| 弓箭手 | 66.983 | 6.366 |

預設最大差距取現有五種設計 `(最高 / 最低 - 1) × 100%` 向上取整：總基礎 **22%**、總成長 **14%**，先涵蓋既有尺度，未另加高評級乘數。七評級起始使用相同建議區間；未來可個別調整，沒有「SSS 每一項都大於 D」的規則。

所有範圍、權重與差距集中於 `companionSettings.ratings`。超出建議範圍，或與其他評級的最低總量差距超過設定，獨立顯示 `companionBalanceWarnings`；不修改數值、不改評級、不阻止儲存或發布 JSON。結構損壞與無效 ID 仍走資料驗證。

## 專屬技能

技能的 `partnerId` 為 `null`／缺少時，沿用通用職業、等級、用途、熟練度與裝備條件。整數僅允許該穩定定義 ID 的夥伴學習、配置、施放；改名不影響資格，D～SSS 都可具有專屬技能。核心、觸發與輔助均套用限制；怪物不能施放指定夥伴技能。

技能設計器從目前 `data.companions` 動態產生同職業指定對象。新增夥伴立即可選；複製夥伴不繼承另一位夥伴的專屬技能，刪除定義會清除相應限制避免懸空引用。技能定義仍只有原本那一份，角色只保存等級與槽位索引。

## 驗證

`npm run test:companions` 載入完整遊戲與私有平衡器，覆蓋新遊戲、六人舊存檔、編入／移出、上限／上陣保護、全部養成保存、裝備 UID、實際點擊穿戴／替換／卸下、比較來源、職業／等級／部位拒絕、鎖定分解、真正重新整理讀檔、七評級保存、實際軟警告下下載 JSON、平衡參數修改、動態指定對象、專屬技能與改名、定義移除、30 人捲動與六人一般介面。

`npm test` 同時保留成長、裝備、商店、限時增益、戰報回歸。私有平衡器預設同層 `../Emberwild-Balance/balance-editor.html`，可用 `EMBERWILD_BALANCE_ROOT` 指定；共用模型嵌入必須與遊戲完全一致。

from pathlib import Path
import re

def read(path): return Path(path).read_text(encoding='utf-8')
def write(path,text): Path(path).write_text(text,encoding='utf-8')
def once(text,old,new,label):
    n=text.count(old)
    if n!=1: raise SystemExit(f'{label}: expected 1 anchor, got {n}')
    return text.replace(old,new)
def sub_once(text,pattern,repl,label,flags=0):
    out,n=re.subn(pattern,repl,text,count=1,flags=flags)
    if n!=1: raise SystemExit(f'{label}: expected 1 regex anchor, got {n}')
    return out

# Team model: remove SP budgets / learnCost and extend permanent unlock schema.
p='js/character/team-model.js'; t=read(p)
start=t.index('  const defaults=')
end=t.index('  function normalizeDocument',start)
head='''  const defaults={maxPlans:6};
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const int=(v,min=0,max=1e12)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
  function settings(raw){const out={...defaults,...raw};delete out.defaultLearnCost;if(!int(out.maxPlans,1,12))throw Error('隊伍數量無效');return out;}
  function rules(raw){
    const r=raw||{},out={unlockConditions:copy(r.unlockConditions??{})},u=out.unlockConditions;
    if(!object(u))throw Error('技能永久解鎖設定無效');
    u.classMasteryLevel??=0;u.quests??=[];u.materials??=[];u.bossKills??=[];u.eliteKills??=[];u.bossEquipment??=[];
    if(!int(u.classMasteryLevel,0,100)||!Array.isArray(u.quests)||!Array.isArray(u.materials)||!Array.isArray(u.bossKills)||!Array.isArray(u.eliteKills)||!Array.isArray(u.bossEquipment))throw Error('技能永久解鎖設定無效');
    const safe=s=>typeof s==='string'&&s.length>0&&s.length<=80&&!/[<>\\u0000-\\u001f]/.test(s)&&!['__proto__','constructor','prototype'].includes(s);
    const killRow=x=>object(x)&&int(x.mapIndex,-1,999)&&int(x.count,1,1e9),gearRow=x=>object(x)&&int(x.mapIndex,-1,999)&&int(x.quantity,1,100);
    if(u.quests.length>32||new Set(u.quests).size!==u.quests.length||u.quests.some(s=>!safe(s))||u.materials.length>32||u.materials.some(m=>!object(m)||!safe(m.name)||!int(m.quantity,1,1e9))||new Set(u.materials.map(m=>m.name)).size!==u.materials.length||u.bossKills.length>32||u.bossKills.some(x=>!killRow(x))||new Set(u.bossKills.map(x=>x.mapIndex)).size!==u.bossKills.length||u.eliteKills.length>32||u.eliteKills.some(x=>!killRow(x))||new Set(u.eliteKills.map(x=>x.mapIndex)).size!==u.eliteKills.length||u.bossEquipment.length>32||u.bossEquipment.some(x=>!gearRow(x))||new Set(u.bossEquipment.map(x=>x.mapIndex)).size!==u.bossEquipment.length)throw Error('技能永久任務、戰鬥或裝備條件無效');
    return out;
  }
'''
t=t[:start]+head+t[end:]
t=sub_once(t,r"  function normalizeDocument\(input\)\{.*?\n  \}\n  function budget\(level,progression,permanent\)\{.*?\n  \}",'''  function normalizeDocument(input){
    const d=copy(input);d.teamSettings=settings(d.teamSettings);d.balanceSettings??={};d.balanceSettings.meta??={};
    const p=d.balanceSettings.progression??={};p.starting??={};p.levelRewards??={};delete p.starting.skillPoints;delete p.levelRewards.skillPoints;d.balanceSettings.meta.teamBuildVersion=VERSION;
    for(const n of [p.starting.abilityPoints??0,p.levelRewards.abilityPoints??3])if(!int(n,0,100000))throw Error('隊伍能力點額度無效');
    for(const cls of d.classes||[])for(const sk of cls.skills||[]){delete sk.learnCost;Object.assign(sk,rules(sk));}
    for(const list of d.supportSkills||[])for(const sk of list){delete sk.learnCost;Object.assign(sk,rules(sk));}
    return d;
  }
  function budget(level,progression,permanent){return {ap:Math.round((progression.starting.abilityPoints||0)+(level-1)*(progression.levelRewards.abilityPoints||0))+(permanent.abilityCredit||0)};
  }''','team normalize/budget',re.S)
t=sub_once(t,r"  function spent\(plan,classes,supports,cost=1\)\{.*?\n  \}","  function spent(){return 0;}",'team spent compatibility',re.S)
t=once(t,"    for(const h of rows){if(Array.isArray(h?.equipped))h.equipped=h.equipped.map(id=>id!==null&&!ids.has(id)?null:id);if(h?.tokenId!==null&&h?.tokenId!==undefined&&!ids.has(h.tokenId))h.tokenId=null;}","    for(const h of rows){delete h.sp;if(Array.isArray(h?.equipped))h.equipped=h.equipped.map(id=>id!==null&&!ids.has(id)?null:id);if(h?.tokenId!==null&&h?.tokenId!==undefined&&!ids.has(h.tokenId))h.tokenId=null;}\n    if(d?.buildSystem?.permanent)delete d.buildSystem.permanent.skillCredit;",'team save legacy cleanup')
t=t.replace('||!int(perm.abilityCredit)||!int(perm.skillCredit)||','||!int(perm.abilityCredit)||')
old="||p.stats.reduce((a,v)=>a+v,0)>totals.ap||!Array.isArray(p.skills)||p.skills.length!==c||p.skills.some(n=>!int(n,0,1))||!Array.isArray(p.supportLevels)||p.supportLevels.length!==s||p.supportLevels.some(n=>!int(n,0,1))||spent(p,classes,supports,cfg.defaultLearnCost)>totals.sp)"
new="||p.stats.reduce((a,v)=>a+v,0)>totals.ap||!Array.isArray(p.skills)||p.skills.length!==c||p.skills.some(n=>!int(n,0,1))||!Array.isArray(p.supportLevels)||p.supportLevels.length!==s||p.supportLevels.some(n=>!int(n,0,1)))"
t=once(t,old,new,'team validation skill budget')
write(p,t)

# Mastery metadata: remove SP progression fields and seed selected achievement gates.
p='js/skills/mastery-core.js'; t=read(p)
t=once(t,"  if(!settings.meta?.teamBuildVersion){settings.progression.starting.skillPoints=0;settings.progression.levelRewards.skillPoints=0;}","  delete settings.progression.starting.skillPoints;delete settings.progression.levelRewards.skillPoints;",'mastery setting skill points')
t=once(t,"initial=function(job){const h=masteryInitialBase(job);h.sp=Number.isSafeInteger(h.sp)?h.sp:0;return ensureHeroMastery(h);};","initial=function(job){const h=masteryInitialBase(job);delete h.sp;return ensureHeroMastery(h);};",'mastery initial sp')
anchor='applyDefaultSkillPlan();\n\nfunction migrateWeaponCatalog'
inject='''applyDefaultSkillPlan();
function applyDefaultAchievementSkillConditions(){
  const empty=()=>({classMasteryLevel:0,quests:[],materials:[],bossKills:[],eliteKills:[],bossEquipment:[]});
  for(let job=0;job<CLASSES.length;job++){
    const second=runtimeCoreMeta(job,4);second.unlockConditions=empty();second.unlockConditions.bossKills=[{mapIndex:2,count:1}];
    if(SUPPORT[job]?.[2]){SUPPORT[job][2].unlockConditions=empty();SUPPORT[job][2].unlockConditions.eliteKills=[{mapIndex:2,count:10}];}
    const late=runtimeCoreMeta(job,5);late.unlockConditions=empty();late.unlockConditions.bossEquipment=[{mapIndex:3,quantity:1}];
  }
}
applyDefaultAchievementSkillConditions();

function migrateWeaponCatalog'''
t=once(t,anchor,inject,'default achievement gates')
t=t.replace("['mastery','requiredMastery','requiredMasteryLevel','weaponTypes','iconType']","['mastery','requiredMastery','requiredMasteryLevel','weaponTypes','iconType','unlockConditions']")
t=t.replace("'第一次大修：技能僅有未學／已學，技能點與技能等級不再參與遊戲計算。'","'技能只有未學／已學；沒有技能點成本，達成永久解鎖條件後可直接學習。'")
write(p,t)

# Final team runtime: remove SP accounting and evaluate achievement/equipment conditions.
p='js/character/team-runtime.js'; t=read(p)
t=t.replace("const coreRule=(j,i)=>M.rules(mastery.coreMeta(j,i),cfg.defaultLearnCost),supportRule=(j,i)=>M.rules(SUPPORT[j]?.[i],cfg.defaultLearnCost);","const coreRule=(j,i)=>M.rules(mastery.coreMeta(j,i)),supportRule=(j,i)=>M.rules(SUPPORT[j]?.[i]);")
t=t.replace("const costs=p=>p.job===null?0:M.spent(p,classDocs(),SUPPORT,cfg.defaultLearnCost);","const costs=()=>0;")
t=t.replace("const permanent={playerKey:memberKey(h),abilityCredit:0,skillCredit:0,classes:{},masteries:copy(h.mastery||{}),unlocks:{},payments:{},gemInstances:{},gemSerial:1};","const permanent={playerKey:memberKey(h),abilityCredit:0,classes:{},masteries:copy(h.mastery||{}),unlocks:{},payments:{},gemInstances:{},gemSerial:1};")
t=sub_once(t,r"\n    // The original free starting core/support skills remain a one-time grant\.\n    permanent\.skillCredit=.*?;\n",'\n    delete h.sp;\n','team migrate skill credit',re.S)
t=once(t,"  function syncPoints(){if(!build())return;const h=player(),p=plan(),t=budgets();h.ap=Math.max(0,t.ap-h.stats.reduce((a,v)=>a+v,0));h.sp=Math.max(0,t.sp-costs(p));}","  function syncPoints(){if(!build())return;const h=player(),t=budgets();h.ap=Math.max(0,t.ap-h.stats.reduce((a,v)=>a+v,0));delete h.sp;}",'team sync points')
old="    for(const m of r.unlockConditions.materials)if(materialCount(m.name)<m.quantity)reasons.push(m.name+' ×'+m.quantity);\n    return reasons;"
new="""    for(const m of r.unlockConditions.materials)if(materialCount(m.name)<m.quantity)reasons.push(m.name+' ×'+m.quantity);
    const achievements=party?.achievements||{},sum=obj=>Object.values(obj||{}).reduce((n,v)=>n+(Number(v)||0),0),mapName=i=>i<0?'任意區域':(MAPS[i]?.name||('區域 '+i)),bossName=i=>i<0?'任意 BOSS':(MAPS[i]?.boss?.[0]||mapName(i)+' BOSS');
    for(const x of r.unlockConditions.bossKills){const n=x.mapIndex<0?sum(achievements.bossKills):(achievements.bossKills?.[x.mapIndex]||0);if(n<x.count)reasons.push('擊敗 '+bossName(x.mapIndex)+' '+n+'/'+x.count);}
    for(const x of r.unlockConditions.eliteKills){const n=x.mapIndex<0?sum(achievements.eliteKills):(achievements.eliteKills?.[x.mapIndex]||0);if(n<x.count)reasons.push('擊敗 '+mapName(x.mapIndex)+'菁英 '+n+'/'+x.count);}
    const seen=new Set(),owned=[];for(const g of party?.sharedGear?.items||[]){if(g?.id&&!seen.has(g.id)){seen.add(g.id);owned.push(g);}}for(const member of party?.members||[])for(const g of member?.bag||[]){if(g?.id&&!seen.has(g.id)){seen.add(g.id);owned.push(g);}}const bossGear=owned.filter(g=>g?.boss!==undefined);
    for(const x of r.unlockConditions.bossEquipment){const n=bossGear.filter(g=>x.mapIndex<0||(g.region??g.boss)===x.mapIndex).length;if(n<x.quantity)reasons.push('持有 '+bossName(x.mapIndex)+'裝備 '+n+'/'+x.quantity);}
    return reasons;"""
t=once(t,old,new,'team unlock missing achievements')
t=once(t,"globalThis.resetSkills=function(){if(state!==player()||!safe()||!confirm('免費重置本隊所有技能學習與裝配？返還技能點；永久解鎖與精通保留。'))return false;","globalThis.resetSkills=function(){if(state!==player()||!safe()||!confirm('免費重置本隊所有技能學習與裝配？永久解鎖與精通保留。'))return false;",'reset skill copy')
t=t.replace("if(player().sp<r.learnCost){toast('本隊技能點不足');return false;}","")
t=t.replace("Object.assign(mastery.coreMeta(j,i),M.rules(sk,cfg.defaultLearnCost))","Object.assign(mastery.coreMeta(j,i),M.rules(sk))")
t=t.replace("Object.assign(SUPPORT[j][i],M.rules(sk,cfg.defaultLearnCost))","Object.assign(SUPPORT[j][i],M.rules(sk))")
t=t.replace("d.notes=d.notes.filter(x=>!String(x).includes('技能點與技能等級不再'));d.notes.push('永久解鎖共用；學習投入與 2 主動／2 觸發／2 輔助槽由各隊伍獨立保存。');","d.notes=d.notes.filter(x=>!String(x).includes('技能點'));d.notes.push('技能沒有技能點成本；永久解鎖共用，學習與 2 主動／2 觸發／2 輔助槽由各隊伍獨立保存。');d.notes.push('技能 unlockConditions 可指定職業精通、任務、材料、BOSS 擊殺、菁英擊殺與持有 BOSS 裝備；同一技能的多項條件需全部達成。');")
marker="  globalThis.__EMBERWILD_TEAMS={build,plan,player,capture,apply,budgets,costs,busy,safe,valid,refreshUnlocks,unlockMissing,coreRule,supportRule,settings:()=>copy(cfg),validateBuild,resetBattleState};"
replacement="""  function unlockSummary(j,kind,i){const r=kind==='core'?coreRule(j,i):supportRule(j,i),u=r.unlockConditions,parts=[],mapName=n=>n<0?'任意區域':(MAPS[n]?.name||('區域 '+n)),bossName=n=>n<0?'任意 BOSS':(MAPS[n]?.boss?.[0]||mapName(n)+' BOSS');if(u.classMasteryLevel)parts.push('職業精通 Lv'+u.classMasteryLevel);parts.push(...u.quests.map(q=>'任務 '+q),...u.materials.map(m=>m.name+' ×'+m.quantity),...u.bossKills.map(x=>'擊敗 '+bossName(x.mapIndex)+' ×'+x.count),...u.eliteKills.map(x=>'擊敗 '+mapName(x.mapIndex)+'菁英 ×'+x.count),...u.bossEquipment.map(x=>'持有 '+bossName(x.mapIndex)+'裝備 ×'+x.quantity));return parts;}
  globalThis.__EMBERWILD_TEAMS={build,plan,player,capture,apply,budgets,costs,busy,safe,valid,refreshUnlocks,unlockMissing,unlockSummary,coreRule,supportRule,settings:()=>copy(cfg),validateBuild,resetBattleState};"""
t=once(t,marker,replacement,'team API summary')
write(p,t)

# Final player skill UI: no point counts or point-cost checks.
p='js/ui/team-builds.js'; t=read(p)
t=t.replace("learned||!unlocked||h.sp<r.learnCost||T.busy()","learned||!unlocked||T.busy()")
t=t.replace("需求 LV${entry.level} · 學習 ${r.learnCost} 技能點 · ${unlocked?'永久條件已完成':missing.length?'尚缺：'+esc(missing.join('、')):'永久條件已達成'}","需求 LV${entry.level} · ${T.unlockSummary(job,kind,i).length?'解鎖條件：'+esc(T.unlockSummary(job,kind,i).join('、')):'無額外成就條件'} · ${unlocked?'永久條件已完成':missing.length?'尚缺：'+esc(missing.join('、')):'永久條件已達成'}")
t=t.replace("const summary=current?`<p>本隊剩餘技能點 ${h.sp} / 總額 ${tot.sp} · 已投入 ${T.costs(p)}</p><div class=\"actions\"><button onclick=\"resetSkills()\" ${T.busy()?'disabled':''}>免費重置本隊技能</button></div>${globalThis.__EMBERWILD_MASTERY_UI.loadout()}`","const summary=current?`<p>技能沒有技能點成本；達成永久解鎖條件後即可學習。</p><div class=\"actions\"><button onclick=\"resetSkills()\" ${T.busy()?'disabled':''}>免費重置本隊技能</button></div>${globalThis.__EMBERWILD_MASTERY_UI.loadout()}`")
t=t.replace("return heading('PLAYER SKILLS / 主角技能','主角技能',`<span class=\"tag\">${esc(characterName(h))} · 技能點 ${h.sp}</span>`)","return heading('PLAYER SKILLS / 主角技能','主角技能',`<span class=\"tag\">${esc(characterName(h))}</span>`)")
write(p,t)

# Core legacy paths: new saves and level-up no longer create/require SP.
p='js/core/core-game.js'; t=read(p)
t=t.replace(',advanced:false,sp:2,ap:0,',',advanced:false,ap:0,')
t=t.replace('state.sp+=2;','')
t=t.replace('、技能點 +2','').replace('、2 技能點','').replace('與 2 技能點','')
t=t.replace('每級消耗 1 技能點，','')
t=t.replace('state.sp<1||','').replace('state.sp--;','')
t=t.replace("'gold','ore','dust','sp','ap','totalKills','repeat','potions','xp'","'gold','ore','dust','ap','totalKills','repeat','potions','xp'")
anchor="  const s=migrateLegacyEquipmentSlotsInSave(JSON.parse(JSON.stringify(input))),legacy=s.version===1;"
t=once(t,anchor,anchor+'\n  delete s.sp;','core legacy sp cleanup')
# Old UI is overridden later, but remove stale point labels too.
t=t.replace("`<span class=\"tag\">技能點 ${state.sp}</span>`","''")
t=t.replace('升級獲得 3 能力點、2 技能點；','升級獲得 3 能力點；')
write(p,t)

# Achievement tracker refreshes skill permanent unlocks after qualifying kills.
p='js/character/companion-unlocks.js'; t=read(p)
t=once(t,"const out=baseReward(e);syncUnlocks();if(a.completed.length>before||party.mailbox.serial>beforeMail)save();return out;","const out=baseReward(e);syncUnlocks();globalThis.__EMBERWILD_TEAMS?.refreshUnlocks?.();if(a.completed.length>before||party.mailbox.serial>beforeMail)save();return out;",'achievement refresh skill unlocks')
write(p,t)

# Unit contract tests.
p='tests/team-model.test.cjs'; t=read(p)
t=re.sub(r"test\('point settings migrate once and explicit zero remains effective'.*?\);\n","test('skill point fields are removed and ability points remain',()=>{const d={balanceSettings:{progression:{starting:{skillPoints:9,abilityPoints:1},levelRewards:{skillPoints:7,abilityPoints:3}}},classes:[],supportSkills:[]};const out=M.normalizeDocument(d);assert.equal(out.balanceSettings.progression.starting.skillPoints,undefined);assert.equal(out.balanceSettings.progression.levelRewards.skillPoints,undefined);assert.deepEqual(M.budget(3,out.balanceSettings.progression,{abilityCredit:0}),{ap:7});});\n",t,count=1,flags=re.S)
t=re.sub(r"test\('unlock material rules reject duplicates, negative costs and unsafe keys'.*?\);\n","test('unlock rules support boss, elite and boss-equipment achievements without learn costs',()=>{assert.throws(()=>M.rules({unlockConditions:{materials:[{name:'ore',quantity:1},{name:'ore',quantity:1}]}}));assert.throws(()=>M.rules({unlockConditions:{quests:['__proto__']}}));const r=M.rules({learnCost:99,unlockConditions:{bossKills:[{mapIndex:2,count:1}],eliteKills:[{mapIndex:-1,count:10}],bossEquipment:[{mapIndex:3,quantity:1}]}});assert.equal(r.learnCost,undefined);assert.deepEqual(r.unlockConditions.bossKills,[{mapIndex:2,count:1}]);assert.deepEqual(r.unlockConditions.eliteKills,[{mapIndex:-1,count:10}]);assert.deepEqual(r.unlockConditions.bossEquipment,[{mapIndex:3,quantity:1}]);});\n",t,count=1,flags=re.S)
write(p,t)

# Runtime tests: SP must be absent and achievement gates must work.
p='tests/team-runtime.test.cjs'; t=read(p)
t=t.replace("const full={ap:playerHero().ap,sp:playerHero().sp};","const full={ap:playerHero().ap,hasSp:Object.hasOwn(playerHero(),'sp')};")
t=t.replace("assert.equal(out.full.ap,12);assert.equal(out.full.sp,12);","assert.equal(out.full.ap,12);assert.equal(out.full.hasSp,false);")
t=t.replace("d.classes[1].skills[2].learnCost=2;","")
t=t.replace(",sp:playerHero().sp",",hasSp:Object.hasOwn(playerHero(),'sp')")
t=t.replace("assert.equal(out.fire,out.xp);assert.equal(out.sp,28); // total 32, original core/support + cost 2","assert.equal(out.fire,out.xp);assert.equal(out.hasSp,false);")
t=t.replace("const second={ap:state.ap,sp:state.sp};","const second={ap:state.ap,hasSp:Object.hasOwn(state,'sp')};")
t=t.replace("const blank={ap:state.ap,sp:state.sp};","const blank={ap:state.ap,hasSp:Object.hasOwn(state,'sp')};")
t=t.replace("assert.deepEqual(out.total,{ap:3,sp:6});assert.deepEqual(out.second,{ap:3,sp:4});assert.deepEqual(out.blank,{ap:3,sp:6});","assert.deepEqual(out.total,{ap:3});assert.deepEqual(out.second,{ap:3,hasSp:false});assert.deepEqual(out.blank,{ap:3,hasSp:false});")
marker="test('resets and class changes ask confirmation; cancel leaves every configuration unchanged',()=>{"
added="""test('achievement and boss-equipment skill gates use shared progression counters and account inventory',()=>{
 const r=game(0),out=json(r,`(()=>{const d=exportableBalance();const sk=d.classes[0].skills[1];sk.requiredLevel=1;sk.requiredMastery=null;sk.requiredMasteryLevel=0;sk.requiresAdvanced=false;sk.unlockConditions={classMasteryLevel:0,quests:[],materials:[],bossKills:[{mapIndex:0,count:1}],eliteKills:[{mapIndex:0,count:2}],bossEquipment:[{mapIndex:0,quantity:1}]};applyBalanceConfig(d);party.achievements??=EmberwildAchievements.defaults();let a=unlockTeamSkill('core',1);party.achievements.bossKills[0]=1;party.achievements.eliteKills[0]=2;let b=unlockTeamSkill('core',1);const g=bossGear(0,0,0);state.bag.push(g);__EMBERWILD_TEAMS.refreshUnlocks();let c=unlockTeamSkill('core',1);learn(1);return {a,b,c,learned:state.skills[1],missing:__EMBERWILD_TEAMS.unlockMissing(0,'core',1),hasSp:Object.hasOwn(state,'sp')};})()`);assert.equal(out.a,false);assert.equal(out.b,false);assert(out.c);assert.equal(out.learned,1);assert.deepEqual(out.missing,[]);assert.equal(out.hasSp,false);
});
"""+marker
t=once(t,marker,added,'achievement integration test insert')
write(p,t)

# Source-level guard for the final active layers.
checks={
  'js/character/team-model.js':['defaultLearnCost','skillCredit','totals.sp'],
  'js/character/team-runtime.js':['player().sp','skillCredit','cfg.defaultLearnCost','返還技能點'],
  'js/ui/team-builds.js':['技能點 ${h.sp}','h.sp<r.learnCost'],
}
for path,bad in checks.items():
    src=read(path)
    for token in bad:
        if token in src: raise SystemExit(f'{path} still contains active skill-point token: {token}')

from pathlib import Path
p=Path('.github/scripts/skill-achievement-migration.py')
t=p.read_text(encoding='utf-8')
old='t=sub_once(t,r"  function normalizeDocument\\(input\\)\\{.*?\\n  \\}\\n  function budget\\(level,progression,permanent\\)\\{.*?\\n  \\}",'
new='t=sub_once(t,r"  function normalizeDocument\\(input\\)\\{.*?\\n  \\}\\n  function budget\\(level,progression,permanent\\)\\{.*?\\};\\}",'
if old not in t: raise SystemExit('normalize/budget regex source not found')
t=t.replace(old,new,1)
old='t=sub_once(t,r"  function spent\\(plan,classes,supports,cost=1\\)\\{.*?\\n  \\}","  function spent(){return 0;}",\'team spent compatibility\',re.S)'
new='t=sub_once(t,r"  function spent\\(plan,classes,supports,cost=1\\)\\{.*?\\}","  function spent(){return 0;}",\'team spent compatibility\',re.S)'
if old not in t: raise SystemExit('spent regex source not found')
t=t.replace(old,new,1)
for old in [
    "'js/character/team-model.js':['defaultLearnCost','skillCredit','totals.sp'],",
    "'js/character/team-model.js':['skillCredit','totals.sp'],"
]:
    if old in t:
        t=t.replace(old,"'js/character/team-model.js':['totals.sp'],",1)
        break
else:
    if "'js/character/team-model.js':['totals.sp']," not in t: raise SystemExit('source guard list not found')
old='t=t.replace("[\'mastery\',\'requiredMastery\',\'requiredMasteryLevel\',\'weaponTypes\',\'iconType\']","[\'mastery\',\'requiredMastery\',\'requiredMasteryLevel\',\'weaponTypes\',\'iconType\',\'unlockConditions\']")'
new='''empty_js="{classMasteryLevel:0,quests:[],materials:[],bossKills:[],eliteKills:[],bossEquipment:[]}"
copy_loop="for(const key of ['mastery','requiredMastery','requiredMasteryLevel','weaponTypes','iconType'])dst[key]=clone(src[key]);"
t=t.replace(copy_loop,copy_loop+"dst.unlockConditions=clone(src.unlockConditions||"+empty_js+");")
core_meta="Object.assign(meta,{mastery:src.mastery??null,requiredMastery:src.requiredMastery??null,requiredMasteryLevel:Math.max(0,Math.min(100,Math.floor(Number(src.requiredMasteryLevel)||0))),weaponTypes:clone(src.weaponTypes||[]),iconType:normalizeSkillIconType(src.iconType),powerPerLevel:0})"
t=t.replace(core_meta,core_meta[:-2]+",unlockConditions:clone(src.unlockConditions||"+empty_js+")})")
support_meta="Object.assign(SUPPORT[job][i],{mastery:src.mastery??null,requiredMastery:src.requiredMastery??null,requiredMasteryLevel:Math.max(0,Math.min(100,Math.floor(Number(src.requiredMasteryLevel)||0))),weaponTypes:clone(src.weaponTypes||[]),iconType:normalizeSkillIconType(src.iconType),effectPerLevel:0})"
t=t.replace(support_meta,support_meta[:-2]+",unlockConditions:clone(src.unlockConditions||"+empty_js+")})")'''
if old not in t: raise SystemExit('mastery metadata migration source not found')
t=t.replace(old,new,1)
p.write_text(t,encoding='utf-8')

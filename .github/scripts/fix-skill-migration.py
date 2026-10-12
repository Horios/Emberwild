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
old="'js/character/team-model.js':['defaultLearnCost','skillCredit','totals.sp'],"
new="'js/character/team-model.js':['totals.sp'],"
if old not in t:
    old="'js/character/team-model.js':['skillCredit','totals.sp'],"
if old not in t: raise SystemExit('source guard list not found')
t=t.replace(old,new,1)
p.write_text(t,encoding='utf-8')

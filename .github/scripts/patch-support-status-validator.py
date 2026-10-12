from pathlib import Path

path=Path('js/skills/support-debuff.js')
text=path.read_text(encoding='utf-8')
old="const allowedKinds=new Set(['attack','critical','fracture','guard','power','regen','weaken','followup','dotAttack','dotMaxHp','damageAmp','vulnerable']);\n      const allowedTargets=new Set(['allies','enemy','enemies','weakest']);"
new="const allowedKinds=new Set(['attack','critical','fracture','guard','power','regen','weaken','followup','dotAttack','dotMaxHp','damageAmp','vulnerable','applyStatus']);\n      const allowedTargets=new Set(['allies','enemy','enemies','weakest','rankedAllies','rankedEnemies']);"
if old not in text:
    if new not in text: raise SystemExit('support validator marker not found')
else:
    text=text.replace(old,new,1)
path.write_text(text,encoding='utf-8')

path=Path('js/skills/status-maker.js')
text=path.read_text(encoding='utf-8')
old="validateBalanceConfig=function(input){const defs=(input?.statusDefinitions||[]).map((x,i)=>normalizeStatusDefinition(x,i));"
new="validateBalanceConfig=function(input){const defs=(input?.statusDefinitions||[]).map((x,i)=>normalizeStatusDefinition(x,i));if(!defs.some(x=>x.id===PAIN_SPREAD_STATUS_ID))defs.push(normalizeStatusDefinition(PAIN_SPREAD_DEFAULT,defs.length));"
if old not in text:
    if new not in text: raise SystemExit('advanced status validator marker not found')
else:
    text=text.replace(old,new,1)
path.write_text(text,encoding='utf-8')

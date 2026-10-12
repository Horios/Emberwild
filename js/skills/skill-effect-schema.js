/* Optional common RPG effects; shared by the game and the balance editor. */
(function(root){
  'use strict';
  const EFFECTS=['damage','drain','heal','shield','cleanse','dispel','revive'];
  const KEYS=['target','hitCount','powerBasis','damageResolution','healResolution','drainRate','onHitStatusId','onHitStatusChance','dispelCount','reviveHpRatio'];
  const BASIS=['fixed','casterAttack','casterDefense','casterMaxHp','casterCurrentHp','casterMissingHp','casterShield','casterLevel','targetAttack','targetDefense','targetMaxHp','targetCurrentHp','targetMissingHp','targetShield','targetLevel'];
  const TARGETS={damage:['enemy','enemies'],drain:['enemy','enemies'],heal:['self','weakest','allies'],shield:['self','weakest','allies'],cleanse:['self','weakest','allies'],dispel:['enemy','enemies'],revive:['fallen','fallenAllies']};
  const defaults=effect=>({target:effect==='heal'||effect==='cleanse'?'weakest':effect==='shield'?'self':effect==='revive'?'fallen':'enemy',hitCount:1,powerBasis:'casterAttack',damageResolution:'standard',healResolution:'heal',drainRate:1,onHitStatusId:'',onHitStatusChance:1,dispelCount:99,reviveHpRatio:.25});
  function configured(sk){return EFFECTS.includes(sk?.effect)&&(['cleanse','dispel','revive'].includes(sk.effect)||KEYS.some(k=>sk[k]!==undefined));}
  function validateSkill(sk,defs=[]){
    const issues=[],d=defaults(sk?.effect),has=k=>sk?.[k]!==undefined,range=(k,min,max,int=false)=>{if(has(k)&&(!Number.isFinite(sk[k])||sk[k]<min||sk[k]>max||int&&!Number.isInteger(sk[k])))issues.push(k+' 必須介於 '+min+'～'+max+(int?'（整數）':''));};
    if(!EFFECTS.includes(sk?.effect))return issues;
    if(has('target')&&!TARGETS[sk.effect].includes(sk.target))issues.push('技能目標與主要效果不相容');
    range('hitCount',1,20,true);range('drainRate',0,10);range('onHitStatusChance',0,1);range('dispelCount',1,99,true);range('reviveHpRatio',.001,1);
    if(has('powerBasis')&&!BASIS.includes(sk.powerBasis))issues.push('技能計算基準無效');
    if(has('damageResolution')&&!['standard','fixed','true'].includes(sk.damageResolution))issues.push('傷害結算方式無效');
    if(has('healResolution')&&!['heal','overflowShield'].includes(sk.healResolution))issues.push('治療結算方式無效');
    if(has('onHitStatusId')&&typeof sk.onHitStatusId!=='string')issues.push('附加狀態 ID 無效');
    if(sk.onHitStatusId){
      const def=defs.find(x=>x.id===sk.onHitStatusId),target=sk.target||d.target;
      if(!def)issues.push('引用不存在的附加狀態');
      if(!['damage','drain','heal','shield'].includes(sk.effect))issues.push('此主要效果不支援附加狀態');
      if(def){
        const positive=['attack','critical','guard','power','regen'],negative=['fracture','weaken','vulnerable','damageAmp','followup'];
        const heroOnly=(def.modifiers||[]).some(m=>positive.includes(m.kind))||(def.periodic||[]).some(f=>f.resolution==='overflowShield'),enemyOnly=!!def.control||(def.modifiers||[]).some(m=>negative.includes(m.kind));
        if(heroOnly&&['enemy','enemies'].includes(target)||enemyOnly&&['self','weakest','allies'].includes(target))issues.push('附加狀態與套用目標方向不相容');
      }
    }
    return issues;
  }
  const api={EFFECTS,KEYS,BASIS,TARGETS,defaults,configured,validateSkill};
  root.EmberwildSkillEffects=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);

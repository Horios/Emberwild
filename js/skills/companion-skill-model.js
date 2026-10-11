/* Ownership uses the existing skill pools and stable indices; migration only appends. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EmberwildCompanionSkills=api;})(globalThis,function(){
  const copy=x=>JSON.parse(JSON.stringify(x));
  function cloneSkills(doc,p){
    const core=doc.classes[p.job].skills,support=doc.supportSkills[p.job],remap=new Map();
    for(const i of p.core){const sk=core[i];if(!sk)throw Error('夥伴核心技能不存在：'+p.id);if(core.length>=64)throw Error('此職業核心技能最多 64 個');const next=copy(sk);next.id='partner'+p.id+'-core'+core.length;next.partnerId=p.id;next.usageScope='character';next.requiresAdvanced=false;next.mastery=null;next.requiredMastery=null;next.requiredMasteryLevel=0;remap.set(i,core.length);core.push(next);}
    for(const [old,index] of remap){const next=core[index];for(const target of next.induction?.targets||[])if(target.kind==='skill'){const match=[...remap].find(([source])=>core[source].id===target.skillId);if(match)target.skillId=core[match[1]].id;}}
    p.core=p.core.map(i=>remap.get(i));p.active=p.active.map(i=>remap.get(i));p.proc=p.proc.map(i=>remap.get(i));
    p.support=p.support.map(i=>{const sk=support[i];if(!sk)throw Error('夥伴輔助技能不存在：'+p.id);if(support.length>=64)throw Error('此職業輔助技能最多 64 個');const next=copy(sk);next.id='partner'+p.id+'-support'+support.length;next.partnerId=p.id;next.mastery=null;next.requiredMastery=null;next.requiredMasteryLevel=0;support.push(next);return support.length-1;});
  }
  function clonePassives(doc,p){
    p.passives=(p.passives||[]).map(id=>{const d=doc.passiveDefinitions.find(x=>x.id===id);if(!d)throw Error('夥伴被動不存在：'+p.id);if(doc.passiveDefinitions.length>=512)throw Error('被動最多 512 個');const next=copy(d);let n=1;while(doc.passiveDefinitions.some(x=>x.id==='partner'+p.id+'-passive'+n))n++;next.id='partner'+p.id+'-passive'+n;next.partnerId=p.id;next.requiredLevel=d.requiredLevel??1;doc.passiveDefinitions.push(next);return next.id;});
  }
  function migrate(doc){
    if(doc.companionSkillVersion===1)return doc;
    if(doc.companionSkillVersion!==undefined)throw Error('夥伴技能版本無效');
    for(const p of doc.companions||[]){cloneSkills(doc,p);clonePassives(doc,p);}
    doc.companionSkillVersion=1;return doc;
  }
  function validate(doc){
    if(doc.companionSkillVersion!==1)throw Error('夥伴技能版本無效');
    for(let job=0;job<doc.classes.length;job++)for(const pool of [doc.classes[job].skills,doc.supportSkills[job]]){
      if(!Array.isArray(pool)||pool.length>64)throw Error('技能池最多 64 個');
      for(const sk of pool)if(sk.partnerId!=null&&(!Number.isInteger(sk.partnerId)||!doc.companions.some(p=>p.id===sk.partnerId&&p.job===job)))throw Error('技能指定夥伴不存在或職業不符：'+sk.name);
    }
    for(const c of doc.classes)for(const sk of c.skills)for(const t of sk.induction?.targets||[])if(t.kind==='skill'){const target=c.skills.find(s=>s.id===t.skillId);if(target&&(target.partnerId??null)!==(sk.partnerId??null))throw Error('誘發技能必須屬於同一角色：'+sk.name);}
    for(const d of doc.passiveDefinitions||[])if(d.partnerId!=null&&(!Number.isInteger(d.partnerId)||!doc.companions.some(p=>p.id===d.partnerId)))throw Error('被動指定夥伴不存在：'+d.id);
    for(const p of doc.companions||[]){
      for(const id of p.passives||[])if(doc.passiveDefinitions.find(d=>d.id===id)?.partnerId!==p.id)throw Error('夥伴只能配置自己的被動：'+p.id);
      for(const i of p.core||[])if(doc.classes[p.job].skills[i]?.partnerId!==p.id)throw Error('夥伴只能配置自己的核心技能：'+p.id);
      for(const i of p.support||[])if(doc.supportSkills[p.job][i]?.partnerId!==p.id)throw Error('夥伴只能配置自己的輔助技能：'+p.id);
    }
    return doc;
  }
  return {copy,cloneSkills,clonePassives,migrate,validate};
});

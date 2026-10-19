const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {loadRuntime}=require('./headless-runtime.cjs'),M=require('../js/items/companion-token-model.js');
const root=path.resolve(__dirname,'..');
test('token management closes without replacement; owner and class labels share validated settings',()=>{
 const r=loadRuntime(root);r.run(`start(0);closeModal();for(const id of [10,12,13,14])recruitCompanion(id);closeModal();`);
 const out=JSON.parse(r.run(`JSON.stringify((()=>{
  const cfg=exportableBalance(),h=partyMember(10),g=__EMBERWILD_TOKEN_TEST.makeToken('berserk');state.bag.push(g);equipCompanionToken(g.id,10);
  const before=h.tokenId;showCompanionTokens(10);const markup=$('modal').innerHTML;
  const header=markup.split('</div>')[0],close=header.match(/onclick="([^"]+)"/)[1];eval(close);
  const closed=!$('modal').open&&h.tokenId===before,slot=gearSlotHTML(g),owner=characterName(h);
  copyTeamPlan();const eligibility=[];for(let job=0;job<4;job++){cfg.companionTokens.catalog[0].job=String(job);applyBalanceConfig(cfg);eligibility.push(party.members.filter(x=>x.companionId!==undefined).map(x=>({job:x.job,allowed:EmberwildTokens.canEquip(g,x)})));}
  const clearedPlans=party.buildSystem.plans.every(p=>p.tokens[10]===null);
  const wrong=equipCompanionToken(g.id,10),right=equipCompanionToken(g.id,13);save();const raw=packParty();loadParty(raw);const reloaded=partyMember(13).tokenId===g.id;
  const exported=exportableBalance().companionTokens.catalog[0].job,label=companionTokenJobLabel(g);
  cfg.companionTokens.catalog[0].job='all';applyBalanceConfig(cfg);const common=EmberwildTokens.canEquip(findGear(g.id),partyMember(10));
  return {closed,header,slot,owner,eligibility,wrong,right,reloaded,exported,label,common,clearedPlans,allCommon:cfg.companionTokens.catalog.slice(1).every(x=>x.job==='all')};
 })())`));
 assert(out.closed);assert.match(out.header,/關閉/);assert.match(out.slot,/通用/);assert(out.slot.includes(out.owner));assert.match(out.slot,/已裝備/);
 for(const [job,rows]of out.eligibility.entries())for(const row of rows)assert.equal(row.allowed,row.job===job);
 assert.equal(out.wrong,false);assert(out.right);assert(out.reloaded);assert.equal(out.exported,'3');assert.equal(out.label,'牧師');assert(out.common);assert(out.clearedPlans);assert(out.allCommon);assert.deepEqual(r.errors,[]);
 const old=M.copy(M.defaults);for(const d of old.catalog)delete d.job;assert(M.normalize(old).catalog.every(d=>d.job==='all'));
 for(const job of [-1,4,0,'mage',null]){const cfg=M.copy(M.defaults);cfg.catalog[0].job=job;assert.throws(()=>M.normalize(cfg),/信物職業/);}
});

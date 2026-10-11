const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {loadRuntime}=require('./headless-runtime.cjs'),M=require('../js/skills/passive-model.js');
const root=path.resolve(__dirname,'..'),balanceRoot=process.env.EMBERWILD_BALANCE_ROOT||path.resolve(root,'../Emberwild-Balance');
const editorPath=path.join(balanceRoot,'balance-editor.html');
const json=(r,code)=>JSON.parse(r.run(`JSON.stringify(${code})`));
function game(){const r=loadRuntime(root);r.run(`selectSaveSlot(1);start(0);closeModal();for(const id of [10,11,12,13,14]){recruitCompanion(id);closeModal();}globalThis.testFoe=()=>({id:'passive-foe',name:'測試敵人',hp:100000,maxhp:100000,atk:20,def:10,lv:1,kind:'normal',region:0,difficulty:0,element:'physical',race:'beast'});`);return r;}

test('Passive contract is identical in the game and designer; invalid effects and references fail atomically',()=>{
 if(fs.existsSync(editorPath)){const html=fs.readFileSync(editorPath,'utf8'),embedded=html.match(/<script id="companion-passive-model-v1">\n([\s\S]*?)<\/script>/)?.[1];assert.equal(embedded,fs.readFileSync(path.join(root,'js/skills/passive-model.js'),'utf8'));}
 for(const bad of [[{...M.defaults[0],id:'bad id'}],[M.defaults[0],M.defaults[0]],[{...M.defaults[0],effects:[{key:'unknown',value:10}]}],[{...M.defaults[0],effects:[{key:'attackPct',value:NaN}]}],[{...M.defaults[0],target:'enemies'}]])assert.throws(()=>M.normalize(bad));
 const r=game(),before=r.run('JSON.stringify(exportableBalance())');
 assert.throws(()=>r.run(`const bad=exportableBalance();bad.companions[0].passives=['missing'];applyBalanceConfig(bad);`),/不存在的被動/);
 assert.equal(r.run('JSON.stringify(exportableBalance())'),before);
});

test('Level-one recruits own their whole preset; active, proc and support skills cast without mastery or advancement',()=>{
 const r=game(),out=json(r,`(()=>{const rows=[];for(const h of party.members.slice(1)){const p=__EMBERWILD_COMPANION_TEST_API.companionPlan(h);party.active=[memberKey(playerHero()),memberKey(h)];h.hp=stats(h).hp;const casts=[];for(const i of p.core){foes=[testFoe()];casts.push({i,ok:castPartySkill(h,i,battleStats(h))!==false});}for(const i of p.support){foes=[testFoe()];casts.push({i,ok:castSupport(h,i)!==false});}rows.push({id:memberKey(h),lv:h.lv,advanced:h.advanced,owned:p.core.every(i=>h.skills[i]===1)&&p.support.every(i=>h.supportLevels[i]===1),active:h.active,expected:p.active.slice(0,2),mastery:Object.hasOwn(h,'mastery'),casts});}return rows;})()`);
 for(const h of out){assert.equal(h.lv,1);assert.equal(h.advanced,false);assert(h.owned);assert.deepEqual(h.active,h.expected);assert.equal(h.mastery,false);for(const cast of h.casts)assert(cast.ok,`companion ${h.id}, skill ${cast.i}`);}
 assert.deepEqual(r.errors,[]);
});

test('Obsolete companion mastery is removed from old saves, runtime, snapshots and repeated reloads; player mastery still grows',()=>{
 const r=game(),out=json(r,`(()=>{const raw=structuredClone(packParty());for(const h of raw.members.slice(1))h.mastery={obsolete:999999};for(const p of Object.values(raw.companionProfiles)){p.masteryLevel=99;p.requiredMastery='sword';p.requiredMasteryLevel=100;}loadParty(raw);for(const h of party.members.slice(1))__EMBERWILD_MASTERY.gainMastery(h,'sword',100);const before=playerHero().mastery.sword;__EMBERWILD_MASTERY.gainMastery(playerHero(),'sword',7);save();loadParty(JSON.parse(localStorage.getItem(KEY)));loadParty(structuredClone(packParty()));return {playerGain:playerHero().mastery.sword-before,saved:packParty(),raw:JSON.parse(localStorage.getItem(KEY))};})()`);
 assert.equal(out.playerGain,7);
 for(const d of [out.saved,out.raw]){for(const h of d.members.slice(1))assert(!Object.hasOwn(h,'mastery'));for(const p of Object.values(d.companionProfiles))for(const key of ['mastery','masteryLevel','requiredMastery','requiredMasteryLevel'])assert(!Object.hasOwn(p,key));}
 const restarted=loadRuntime(root,'index.html',Object.fromEntries(r.values));assert.equal(restarted.run('party.members.length'),6);assert.equal(restarted.run("party.members.slice(1).some(h=>Object.hasOwn(h,'mastery'))"),false);assert.equal(restarted.run('partyMember(10).skills[4]'),1);
});

test('Permanent attack, defense and HP use existing stat aggregation, work in reserves and never expire or stack per round',()=>{
 const r=game(),out=json(r,`(()=>{const d=exportableBalance(),withPassives=party.members.slice(1).map(h=>stats(h));for(const p of d.companions)p.passives=[];applyBalanceConfig(d,{persist:false});const base=party.members.slice(1).map(h=>stats(h));d.companions.forEach(p=>p.passives=EmberwildPassives.assignments(undefined,p.id));applyBalanceConfig(d,{persist:false});party.active=[memberKey(playerHero())];const first=party.members.slice(1).map(h=>stats(h));for(let i=0;i<100;i++){partyClock++;for(const h of party.members)stats(h);}resetEncounter();return {withPassives,base,first,last:party.members.slice(1).map(h=>stats(h)),timedEffects:effects.length};})()`);
 assert.equal(out.withPassives[0].atk,Math.round(out.base[0].atk*1.1));assert.equal(out.withPassives[1].def,Math.round(out.base[1].def*1.1));assert.equal(out.withPassives[1].hp,Math.round(out.base[1].hp*1.1));
 assert.deepEqual(out.first,out.last);assert.deepEqual(out.first,out.withPassives);assert.equal(out.timedEffects,0);
});

test('Healing passive scales real active and proc heals, regeneration and custom periodic heals; shields remain independent',()=>{
 const r=game(),out=json(r,`(()=>{party.active=[0,13];const h=partyMember(13),d=exportableBalance();d.passiveDefinitions.find(d=>d.id==='test-healing').effects[0].value=50;applyBalanceConfig(d,{persist:false});const v=battleStats(h),heal=CLASSES[3].skills.findIndex(s=>s[5]==='heal'&&s[1]==='active'),proc=CLASSES[3].skills.findIndex(s=>s[5]==='heal'&&s[1]==='proc');const actual=i=>{playerHero().hp=1;h.hp=stats(h).hp;castPartySkill(h,i,v);return playerHero().hp-1;};const active=actual(heal),triggered=actual(proc),expected=[heal,proc].map(i=>Math.min(stats(playerHero()).hp-1,Math.round(v.atk*skillPower(i,h)*1.5)));playerHero().hp=1;castSupport(h,0);const immediate=playerHero().hp-1,regen=effectTotal(heroKey(playerHero()),'regen');const def={id:'passive-hot',name:'恢復測試',tags:['periodic','instant'],duration:3,periodic:[{kind:'heal',basis:'fixed',coefficient:10,resolution:'heal'}]};playerHero().hp=1;__EMBERWILD_STATUS_TEST_API.apply(def,h,playerHero());const periodic=playerHero().hp-1;const shield=CLASSES[3].skills.findIndex(s=>s[5]==='shield');h.shield=0;castPartySkill(h,shield,v);return {active,triggered,expected,immediate,expectedImmediate:stats(playerHero()).hp*supportAmount(h.job,0)*1.5,regen,expectedRegen:supportAmount(h.job,0)*1.5,periodic,shield:h.shield,expectedShield:Math.round(v.atk*skillPower(shield,h))};})()`);
 assert.equal(out.active,out.expected[0]);assert.equal(out.triggered,out.expected[1]);assert(Math.abs(out.immediate-out.expectedImmediate)<1e-8);assert.equal(out.regen,out.expectedRegen);assert.equal(out.periodic,15);assert.equal(out.shield,out.expectedShield);
});

test('Allied auras and enemy debuffs follow the living active owner; multiple owners stack once and removed owners leave no residue',()=>{
 const r=game(),out=json(r,`(()=>{const d=exportableBalance();for(const p of d.companions)p.passives=[];d.passiveDefinitions=[{id:'aura',name:'攻防光環',kind:'buff',target:'allies',effects:[{key:'flatAttack',value:5},{key:'guard',value:10}]},{id:'debuff',name:'衰弱破甲',kind:'debuff',target:'enemies',effects:[{key:'weaken',value:20},{key:'fracture',value:30}]}];applyBalanceConfig(d,{persist:false});party.active=[0,10,12];const base=stats(playerHero()).atk;d.companions.find(p=>p.id===10).passives=['aura'];d.companions.find(p=>p.id===12).passives=['aura','debuff'];applyBalanceConfig(d,{persist:false});foes=[testFoe()];const inspect=()=>({atk:stats(playerHero()).atk,guard:effectTotal(heroKey(playerHero()),'guard'),weaken:effectTotal(foes[0].id,'weaken'),fracture:effectTotal(foes[0].id,'fracture')});const both=inspect();partyMember(12).hp=0;const dead=inspect();party.active=[0];const reserve=inspect();return {base,both,dead,reserve};})()`);
 assert.equal(out.both.atk,out.base+10);assert.equal(out.both.guard,.2);assert.equal(out.both.weaken,.2);assert.equal(out.both.fracture,.3);assert.equal(out.dead.atk,out.base+5);assert.equal(out.dead.guard,.1);assert.equal(out.dead.weaken,0);assert.equal(out.dead.fracture,0);assert.deepEqual(out.reserve,{atk:out.base,guard:0,weaken:0,fracture:0});
});

test('Signed stat penalties, skill power, proc chance and element effects have real effects, with valid stat floors',()=>{
 const r=game(),out=json(r,`(()=>{const d=exportableBalance();d.passiveDefinitions.push({id:'tradeoff',name:'代價與力量',kind:'debuff',target:'self',effects:[{key:'hpPct',value:-200},{key:'flatDefense',value:-999},{key:'power',value:25},{key:'procChance',value:100},{key:'elementDamagePct',value:30,element:'fire'}]});d.companions.find(p=>p.id===12).passives=['tradeoff'];applyBalanceConfig(d,{persist:false});const h=partyMember(12);return {stats:stats(h),power:effectTotal(heroKey(h),'power'),chance:procChance(2,h)};})()`);
 assert.equal(out.stats.hp,1);assert.equal(out.stats.def,0);assert.equal(out.stats.elementDamage.fire,.3);assert.equal(out.power,.25);assert.equal(out.chance,1);
});

test('Designer exports import into the game; explicit empty passive lists and reset retain their intended meaning',{skip:!fs.existsSync(editorPath)},()=>{
 const e=loadRuntime(balanceRoot,'balance-editor.html'),r=game();e.run("currentSection='passives';render();");assert.deepEqual(json(e,'validateData()'),[]);
 r.ctx.designerDoc=json(e,'__EMBERWILD_MASTERY_EDITOR.cleanExport()');r.run('applyBalanceConfig(designerDoc,{persist:false})');assert.deepEqual(json(r,'exportableBalance().passiveDefinitions'),json(e,'data.passiveDefinitions'));
 r.run('const noPassives=exportableBalance();noPassives.passiveDefinitions=[];for(const p of noPassives.companions)p.passives=[];applyBalanceConfig(noPassives);');assert.deepEqual(json(r,'exportableBalance().passiveDefinitions'),[]);r.run('loadParty(structuredClone(packParty()))');assert.equal(r.run('__EMBERWILD_COMPANION_TEST_API.passivesFor(partyMember(10)).length'),0);
 r.run('resetBalanceJSON()');assert.deepEqual(json(r,'exportableBalance().passiveDefinitions'),M.defaults);assert.deepEqual(r.errors,[]);assert.deepEqual(e.errors,[]);
});

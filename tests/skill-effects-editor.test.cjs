const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {loadRuntime}=require('./headless-runtime.cjs');
const root=path.resolve(__dirname,'..'),editorRoot=process.env.EMBERWILD_BALANCE_ROOT||path.resolve(root,'../Emberwild-Balance');
const json=(r,code)=>JSON.parse(r.run('JSON.stringify('+code+')'));
test('editor embeds the exact common effect and status contracts used by the game',()=>{
 const html=fs.readFileSync(path.join(editorRoot,'balance-editor.html'),'utf8');
 assert.equal(html.match(/<script id="skill-effect-schema-v1">\n([\s\S]*?)<\/script>/)[1],fs.readFileSync(path.join(root,'js/skills/skill-effect-schema.js'),'utf8'));
 const pure=s=>s.slice(s.indexOf('/* STATUS_PURE_START */'),s.indexOf('/* STATUS_PURE_END */'));
 assert.equal(pure(html),pure(fs.readFileSync(path.join(root,'js/skills/status-maker.js'),'utf8')));
 const e=loadRuntime(editorRoot,'balance-editor.html');assert.deepEqual(json(e,'validateData()'),[]);assert.deepEqual(e.errors,[]);
});
test('editor export and reload preserve selected effect fields, explicit zero chance and locked status classification',()=>{
 const e=loadRuntime(editorRoot,'balance-editor.html');
 e.run(`data.statusDefinitions=[{id:'burn',name:'灼燒',tags:['periodic'],polarity:'debuff',dispellable:false,duration:3,periodic:[{kind:'damage',basis:'fixed',coefficient:2}]}];Object.assign(data.classes[0].skills[0],{target:'enemies',hitCount:3,powerBasis:'targetMaxHp',damageResolution:'true',onHitStatusId:'burn',onHitStatusChance:0});`);
 assert.deepEqual(json(e,'validateData()'),[]);
 const doc=json(e,'__EMBERWILD_MASTERY_EDITOR.cleanExport()');
 const g=loadRuntime(root);g.ctx.doc=doc;g.run('applyBalanceConfig(doc,{persist:true});');const out=json(g,'exportableBalance()');
 for(const key of ['target','hitCount','powerBasis','damageResolution','onHitStatusId','onHitStatusChance'])assert.equal(out.classes[0].skills[0][key],doc.classes[0].skills[0][key]);
 assert.equal(out.statusDefinitions[0].dispellable,false);assert.equal(out.statusDefinitions[0].polarity,'debuff');
 const reload=loadRuntime(root,'index.html',Object.fromEntries(g.values));assert.equal(json(reload,'exportableBalance()').classes[0].skills[0].onHitStatusChance,0);
 assert.deepEqual(g.errors,[]);assert.deepEqual(reload.errors,[]);
});
test('new effect types are editable for active/proc skills and accepted for monster assignment; editor flags bad references and numbers',()=>{
 const e=loadRuntime(editorRoot,'balance-editor.html');
 for(const effect of ['cleanse','dispel','revive']){
  e.ctx.effect=effect;e.run(`Object.assign(data.classes[0].skills[0],{effect,usageScope:'shared'});delete data.classes[0].skills[0].target;`);
  assert.deepEqual(json(e,'validateData()'),[],effect);
  const g=loadRuntime(root);g.ctx.doc=json(e,'__EMBERWILD_MASTERY_EDITOR.cleanExport()');g.run('applyBalanceConfig(doc,{persist:false});');assert.equal(g.run('CLASSES[0].skills[0][5]'),effect);
 }
 e.run(`Object.assign(data.classes[0].skills[0],{effect:'damage',hitCount:1.5,onHitStatusId:'missing'});`);
 const issues=json(e,'validateData()');assert(issues.some(x=>x.includes('hitCount')));assert(issues.some(x=>x.includes('不存在的附加狀態')));
});

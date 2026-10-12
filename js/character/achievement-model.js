/* Shared achievement identities, staged goals and player-save validation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EmberwildAchievements=api;})(globalThis,function(){
  const copy=x=>JSON.parse(JSON.stringify(x)),STEP=50,MAX=1000;
  const id=(map,kind,count=0)=>`region-${map}-${kind}${kind==='open'?'':'-'+count}`;
  function parse(value){const m=typeof value==='string'&&value.match(/^region-(0|[1-9]\d{0,2})-(open|elite|boss)(?:-(\d+))?$/);if(!m)return null;const count=Number(m[3]||0);if(m[2]==='open'?!!m[3]:count<STEP||count>MAX||count%STEP!==0||m[3]!==String(count))return null;return {mapIndex:Number(m[1]),kind:m[2],count};}
  function catalog(maps){return (maps||[]).flatMap((m,i)=>{
    const row=(kind,count=0)=>({id:id(i,kind,count),mapIndex:i,kind,count,name:kind==='open'?`開啟${m.name}`:`${m.name} · 擊敗${kind==='elite'?'菁英':'BOSS'} ${count} 隻`});
    const out=[row('open')];for(const kind of ['elite','boss']){
      if(kind==='elite'&&(m.mapType==='final'||m.eliteEnabled===false)||kind==='boss'&&m.mapType!=='final'&&m.bossEnabled===false)continue;
      for(let n=STEP;n<=MAX;n+=STEP)out.push(row(kind,n));
    }return out;
  });}
  function defaults(){return {version:1,eliteKills:{},bossKills:{},completed:[],rewardCompanions:[],tickets:{},notifications:[],noticeSerial:0};}
  const counter=raw=>raw&&typeof raw==='object'&&!Array.isArray(raw)&&Object.keys(raw).length<=1000&&Object.entries(raw).every(([k,v])=>/^(0|[1-9]\d{0,2})$/.test(k)&&Number.isSafeInteger(v)&&v>=0&&v<=1e12);
  const partnerCounter=raw=>raw&&typeof raw==='object'&&!Array.isArray(raw)&&Object.keys(raw).length<=512&&Object.entries(raw).every(([k,v])=>/^[1-9]\d{1,9}$/.test(k)&&Number(k)<=1e9&&Number.isSafeInteger(v)&&v>=0&&v<=1e9);
  function validateState(raw){
    if(raw===undefined)return undefined;
    const fail=()=>{throw Error('成就與招募券存檔無效');};
    if(!raw||raw.version!==1||!counter(raw.eliteKills)||!counter(raw.bossKills)||!Array.isArray(raw.completed)||raw.completed.length>41000||new Set(raw.completed).size!==raw.completed.length||raw.completed.some(x=>!parse(x))||!Array.isArray(raw.rewardCompanions)||raw.rewardCompanions.length>512||new Set(raw.rewardCompanions).size!==raw.rewardCompanions.length||raw.rewardCompanions.some(id=>!Number.isInteger(id)||id<10||id>1e9)||!partnerCounter(raw.tickets)||!Number.isSafeInteger(raw.noticeSerial)||raw.noticeSerial<0||raw.noticeSerial>1e12||!Array.isArray(raw.notifications)||raw.notifications.length>100)fail();
    const ids=new Set();for(const n of raw.notifications){if(!n||!Number.isSafeInteger(n.id)||n.id<1||n.id>raw.noticeSerial||ids.has(n.id)||typeof n.title!=='string'||n.title.length>200||typeof n.text!=='string'||n.text.length>500||!Number.isSafeInteger(n.at)||n.at<0||typeof n.seen!=='boolean')fail();ids.add(n.id);}
    return copy(raw);
  }
  function migrate(raw,legacy){return validateState(raw)??{...defaults(),eliteKills:copy(legacy?.eliteKills||{})};}
  function conditions(ids,maps){
    if(!Array.isArray(ids)||ids.length<1||ids.length>128||new Set(ids).size!==ids.length||ids.some(x=>!parse(x)))throw Error('夥伴綁定成就無效');
    if(maps){const valid=new Set(catalog(maps).map(x=>x.id));if(ids.some(id=>!valid.has(id)))throw Error('夥伴綁定成就不存在或無法達成');}
    return [...ids];
  }
  return {STEP,MAX,id,parse,catalog,defaults,validateState,migrate,conditions};
});

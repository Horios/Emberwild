/* Shared real-time consumable contract. Percentages are source contributions, not multipliers. */
(function(root){
  'use strict';
  const TYPE='timedBoost',KINDS=['speed4','exp','drop'];
  const LABELS={speed4:'4× 解鎖',exp:'經驗值',drop:'掉寶率'};
  const copy=v=>JSON.parse(JSON.stringify(v));
  const isItem=item=>item?.type===TYPE;
  function itemName(kind,percent,minutes){return kind==='speed4'?'四倍速解鎖券'+minutes+'分鐘':LABELS[kind]+'＋'+percent+'％ '+minutes+'分鐘';}
  const DEFAULT_ITEMS=[
    {id:'speed4_30m',type:TYPE,boostType:'speed4',bonusPercent:0,durationMinutes:30,duration:0,cost:1200,sellPrice:300,shopEnabled:false,name:itemName('speed4',0,30),description:'暫時開放四倍速探索，可自由切換戰鬥倍速。'},
    {id:'exp_100_30m',type:TYPE,boostType:'exp',bonusPercent:100,durationMinutes:30,duration:0,cost:600,sellPrice:150,shopEnabled:false,name:itemName('exp',100,30),description:'暫時增加出戰角色取得的經驗值。'},
    {id:'drop_50_30m',type:TYPE,boostType:'drop',bonusPercent:50,durationMinutes:30,duration:0,cost:600,sellPrice:150,shopEnabled:false,name:itemName('drop',50,30),description:'暫時提高物品掉落機率。'}
  ];
  const DEFAULT_RULES=DEFAULT_ITEMS.map((item,i)=>({id:item.id,enabled:true,type:'item',key:item.id,name:'',description:'',quantityMin:1,quantityMax:1,unitPrice:null,weight:i===0?.15:.35,selection:'weighted',chance:1,quantityScalesWithTier:false,priceScalesWithTier:false}));
  function migrateConfig(cfg){
    cfg.timeUnits??={};
    if(cfg.balanceSettings?.combat?.pacing)cfg.balanceSettings.combat.pacing.rates=[1,2,4];
    if(cfg.timeUnits.timedBoostDuration!=='realMinutes'){
      cfg.items??=[];
      if(!cfg.items.some(isItem)){
        cfg.items.push(...copy(DEFAULT_ITEMS));
        const rows=cfg.shopSettings?.randomOffers?.entries;
        // Explicitly empty pools stay empty; otherwise extend old catalogs once.
        if(Array.isArray(rows)&&rows.length)for(const rule of DEFAULT_RULES)if(!rows.some(x=>x.type==='item'&&x.key===rule.key)){
          let id=rule.id,n=1;while(rows.some(x=>x.id===id))id=rule.id+'_'+n++;
          const index=rows.findIndex(x=>x.selection==='extra');
          rows.splice(index<0?rows.length:index,0,{...copy(rule),id});
        }
      }
      cfg.timeUnits.timedBoostDuration='realMinutes';
    }
    return cfg;
  }
  function validateItem(item){
    const id=item?.id||'未知';
    if(!isItem(item)||typeof item.id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(item.id)||typeof item.name!=='string'||!item.name.trim()||typeof item.description!=='string'||!KINDS.includes(item.boostType))throw Error('限時增益道具資料無效：'+id);
    if(!Number.isSafeInteger(item.durationMinutes)||item.durationMinutes<=0||!Number.isSafeInteger(Date.now()+item.durationMinutes*60000))throw Error('限時增益分鐘必須為有效正整數：'+id);
    if(item.boostType==='speed4'?item.bonusPercent!==0:!Number.isSafeInteger(item.bonusPercent)||item.bonusPercent<=0)throw Error('限時增益百分比必須為正整數；4× 解鎖為 0：'+id);
    if(item.duration!==0||!Number.isSafeInteger(item.cost)||item.cost<0||item.sellPrice!==undefined&&(!Number.isSafeInteger(item.sellPrice)||item.sellPrice<0)||item.element!==undefined&&item.element!==null&&item.element!=='')throw Error('限時增益價格或時間單位無效：'+id);
    return item;
  }
  function active(party,now=Date.now()){return (party?.timedBoosts||[]).filter(b=>b.expiresAt>now);}
  function bonus(party,kind,now=Date.now()){return active(party,now).filter(b=>b.boostType===kind).reduce((sum,b)=>sum+b.bonusPercent,0);}
  function unlocked(party,now=Date.now()){return active(party,now).some(b=>b.boostType==='speed4');}
  function validateState(data){
    const rows=data?.timedBoosts??[],names=new Set();
    if(!Array.isArray(rows)||rows.length>200)throw Error('限時增益存檔無效');
    for(const b of rows){
      validateItem({id:b?.itemId,type:TYPE,name:b?.name,description:'',boostType:b?.boostType,bonusPercent:b?.bonusPercent,durationMinutes:b?.durationMinutes,duration:0,cost:0});
      if(!Number.isSafeInteger(b.expiresAt)||b.expiresAt<0||names.has(b.name))throw Error('限時增益到期時間或同名來源無效');
      names.add(b.name);
    }
    const raw=data?.combatSession??{},idleTimeMs=raw.idleTimeMs??0,speed=raw.speed??1,reportPaused=raw.reportPaused??false,filter=raw.filter??'all';
    if(!Number.isSafeInteger(idleTimeMs)||idleTimeMs<0||![1,2,4].includes(speed)||typeof reportPaused!=='boolean'||!['all','playerDamage','enemyDamage','exp','item'].includes(filter))throw Error('掛機時間／倍速／戰報存檔無效');
    const timedBoosts=copy(active({timedBoosts:rows}));
    return {timedBoosts,combatSession:{idleTimeMs,speed:speed===4&&!unlocked({timedBoosts})?2:speed,reportPaused,filter}};
  }
  root.EmberwildTimedBoosts=Object.freeze({TYPE,KINDS,LABELS,DEFAULT_ITEMS,DEFAULT_RULES,isItem,itemName,migrateConfig,validateItem,active,bonus,unlocked,validateState});
})(globalThis);

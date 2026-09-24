
(()=>{
  const AFFIX_POOL_SLOT_COUNT=4, AFFIX_POOL_RANK_COUNT=4;
  const AFFIX_POOL_TYPES=new Set([0,1,2,3,4,5,6,7,8,9,12,13,14,15,16,17,18]);
  const AFFIX_POOL_SKILL_COUNT=Math.min(...CLASSES.map(c=>Math.max(1,c?.skills?.length||1)));
  const AFFIX_POOL_RANGES={
    0:[[1,1],[1,1],[1,2],[1,3]],
    1:[[1,3],[1,4],[2,6],[3,8]],
    2:[[1,1],[1,1],[1,2],[1,3]],
    3:[[2,4],[3,6],[4,8],[5,10]],
    4:[[10,10],[18,18],[30,30],[45,45]],
    5:[[1,1],[1,1],[1,1],[2,2]],
    6:[[4,4],[8,8],[12,12],[16,16]],
    7:[[1,1],[2,2],[4,4],[6,6]],
    8:[[1,1],[2,2],[3,3],[4,4]],
    9:[[2,2],[4,4],[6,6],[8,8]],
    12:[[5,5],[10,10],[15,15],[20,20]],
    13:[[5,5],[10,10],[15,15],[20,20]],
    14:[[5,5],[10,10],[15,15],[20,20]],
    15:[[1,1],[1,1],[2,2],[4,4]],
    16:[[1,1],[1,1],[1,1],[2,2]],
    17:[[1,1],[5,5],[10,10],[20,20]],
    18:[[1,1],[4,4],[8,8],[12,12]]
  };
  const roundAffixChance=n=>Math.round(Number(n)*100)/100;
  function affixPoolRange(type,rank){
    const row=AFFIX_POOL_RANGES[type]||[[1,1],[1,1],[1,1],[1,1]];
    const pair=row[Math.max(0,Math.min(3,Number(rank)||0))]||[1,1];
    return {min:Math.max(1,Math.round(Number(pair[0])||1)),max:Math.max(1,Math.round(Number(pair[1])||1))};
  }
  function finishDefaultAffixPool(rows){
    let used=0;
    rows.forEach((row,i)=>{
      row.chance=i===rows.length-1?roundAffixChance(100-used):roundAffixChance(row.chance);
      used=roundAffixChance(used+row.chance);
    });
    return rows;
  }
  function defaultAffixPoolRank(rank){
    const rows=[],ignoreChance=rank===0?0:.088,keep=1-ignoreChance;
    const add=(type,p)=>{
      if(p<=0)return;
      const range=affixPoolRange(type,rank),row={type,chance:p*keep*100,min:range.min,max:range.max};
      if(type===4||type===5)row.skill=-1;
      rows.push(row);
    };
    const baseEach=rank===0?.45/4:.45*(1-.40)/4;
    for(const type of [0,1,2,3])add(type,baseEach);
    if(rank>0){
      add(4,.45*.40*.72);
      add(5,.45*.40*.28);
    }
    const extended=[6,7,8,9,12,13,14];
    if(rank>=2)extended.push(15,16);
    if(rank>=1)extended.push(17);
    const extEach=.55/extended.length;
    for(const type of extended)add(type,extEach);
    if(ignoreChance>0){
      const range=affixPoolRange(18,rank);
      rows.push({type:18,chance:ignoreChance*100,min:range.min,max:range.max});
    }
    return finishDefaultAffixPool(rows);
  }
  function defaultAffixPools(){
    return Array.from({length:AFFIX_POOL_SLOT_COUNT},()=>Array.from({length:AFFIX_POOL_RANK_COUNT},(_,rank)=>defaultAffixPoolRank(rank)));
  }
  function legacyPoolChances(source){
    const needsMigration=source.some(entry=>entry&&typeof entry==='object'&&!Number.isFinite(Number(entry.chance))&&Number.isFinite(Number(entry.weight)));
    if(!needsMigration)return null;
    const total=source.reduce((sum,entry)=>sum+Math.max(0,Number(entry?.weight)||0),0);
    if(total<=0)return null;
    let used=0;
    return source.map((entry,index)=>{
      const chance=index===source.length-1?roundAffixChance(100-used):roundAffixChance(Math.max(0,Number(entry?.weight)||0)/total*100);
      used=roundAffixChance(used+chance);
      return chance;
    });
  }
  function normalizeAffixPoolEntry(raw,slot,rank,index,legacyChance){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('詞條池資料無效：'+slot+'-'+rank+'-'+index);
    const type=Number(raw.type),chance=legacyChance??Number(raw.chance),min=Number(raw.min),max=Number(raw.max);
    if(!Number.isInteger(type)||!AFFIX_POOL_TYPES.has(type))throw Error('詞條池含不支援的詞條類型：'+type);
    if(!Number.isFinite(chance)||chance<=0||chance>100)throw Error('詞條池機率必須大於 0 且不超過 100%：'+slot+'-'+rank+'-'+type);
    if(!Number.isFinite(min)||!Number.isFinite(max)||min<1||max<min)throw Error('詞條池數值必須至少為 1，且最大值不可小於最小值：'+slot+'-'+rank+'-'+type);
    const out={type,chance,min:Math.round(min),max:Math.round(max)};
    if(type===4||type===5){
      const skill=raw.skill===undefined||raw.skill===null?-1:Number(raw.skill);
      if(!Number.isInteger(skill)||skill< -1||skill>=AFFIX_POOL_SKILL_COUNT)throw Error('詞條池指定技能無效：'+slot+'-'+rank+'-'+type);
      out.skill=skill;
    }
    return out;
  }
  function normalizeAffixPools(raw){
    const fallback=defaultAffixPools(),out=[];
    for(let slot=0;slot<AFFIX_POOL_SLOT_COUNT;slot++){
      out[slot]=[];
      for(let rank=0;rank<AFFIX_POOL_RANK_COUNT;rank++){
        const source=raw?.[slot]?.[rank];
        if(source===undefined||source===null){out[slot][rank]=fallback[slot][rank];continue;}
        if(!Array.isArray(source)||!source.length)throw Error('每個裝備種類與詞條稀有度至少要有 1 種可抽詞條：'+slot+'-'+rank);
        const seen=new Set(),legacy=legacyPoolChances(source);
        out[slot][rank]=source.map((entry,index)=>{
          const normalized=normalizeAffixPoolEntry(entry,slot,rank,index,legacy?.[index]);
          if(seen.has(normalized.type))throw Error('同一詞條池不可重複詞條類型：'+slot+'-'+rank+'-'+normalized.type);
          seen.add(normalized.type);
          return normalized;
        });
        const total=out[slot][rank].reduce((sum,row)=>sum+row.chance,0);
        if(Math.abs(total-100)>.005)throw Error('詞條池機率合計必須為 100%：'+slot+'-'+rank+'（目前 '+roundAffixChance(total)+'%）');
      }
    }
    return out;
  }
  GAME_BALANCE_DEFAULTS.affixes.poolBySlotRank=defaultAffixPools();
  const affixPoolNormalizeBase=normalizeRuntimeBalance;
  normalizeRuntimeBalance=function(input){
    const out=affixPoolNormalizeBase(input);
    out.affixes.poolBySlotRank=normalizeAffixPools(input?.affixes?.poolBySlotRank);
    return out;
  };
  GAME_BALANCE=normalizeRuntimeBalance(GAME_BALANCE);
  function chanceAffixEntry(pool){
    let roll=Math.random()*100;
    for(const row of pool){roll-=Math.max(0,Number(row.chance)||0);if(roll<=0)return row;}
    return pool[pool.length-1];
  }
  function rollAffixPoolValue(entry,g){
    const lo=Math.ceil(Number(entry.min)||1),hi=Math.max(lo,Math.floor(Number(entry.max)||lo));
    let value=lo+rand(hi-lo+1);
    if([0,1,2].includes(entry.type))value*=Math.max(1,Math.floor(Number(g?.tier)||1));
    return Math.max(1,Math.round(value));
  }
  function rollAffixFromPool(g){
    const rank=rankRoll(),slot=Math.max(0,Math.min(3,Math.floor(Number(g?.slot)||0)));
    const pool=GAME_BALANCE.affixes.poolBySlotRank?.[slot]?.[rank];
    if(!Array.isArray(pool)||!pool.length)throw Error('詞條池未設定：'+slot+'-'+rank);
    const entry=chanceAffixEntry(pool),a={type:entry.type,rank,value:rollAffixPoolValue(entry,g)};
    const job=Number.isInteger(Number(g?.job))?Number(g.job):(state?.job??0);
    if(entry.type===4||entry.type===5){
      const count=Math.max(1,CLASSES[job]?.skills?.length||1);
      a.skill=Number.isInteger(entry.skill)&&entry.skill>=0&&entry.skill<count?entry.skill:rand(count);
    }
    if(entry.type===12||entry.type===14)a.element=['fire','ice','wind','light','shadow'][rand(5)];
    if(entry.type===13){
      const races=Object.keys(RACES);
      a.race=races[rand(Math.max(1,races.length))]||races[0];
    }
    return a;
  }
  rollAffixes=function(g){return [rollAffixFromPool(g),rollAffixFromPool(g)];};
  const affixPoolReferenceBase=balanceReference;
  balanceReference=function(){
    const r=affixPoolReferenceBase();
    r.balancePaths['balance.affixes.poolBySlotRank']='實際洗鍊／隨機詞條池；第一層為裝備種類 0武器/1護甲/2副手/3飾品，第二層為詞條稀有度 0普通/1精良/2稀有/3傳說。每筆 type/chance/min/max 控制種類、百分比機率與數值；type 4/5 可用 skill 指定核心技能序號，-1 代表隨機。固定攻擊/生命/防禦的 min/max 會再乘裝備階級。';
    r.affixPoolRule='詞條品質仍由 qualityChance 決定；決定品質後，只會從對應裝備種類＋詞條稀有度的 poolBySlotRank 抽取。每個池的 chance 合計必須固定為 100%；舊版 weight 會在匯入時按比例轉換為 chance。';
    return r;
  };
  globalThis.__EMBERWILD_AFFIX_POOL={
    defaults:()=>JSON.parse(JSON.stringify(GAME_BALANCE_DEFAULTS.affixes.poolBySlotRank)),
    current:()=>JSON.parse(JSON.stringify(GAME_BALANCE.affixes.poolBySlotRank)),
    roll:g=>rollAffixes(g)
  };
})();

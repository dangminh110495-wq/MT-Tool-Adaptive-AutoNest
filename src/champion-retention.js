/* Focused review excerpt from MT-Tool T50. Not standalone. */

/* T49/T50: exact partial fallback and per-job validated best-so-far across runs. */
function mtT49SafeSubset(run,candidate){
  if(run.preserveExisting&&Number(run.fixedCount)>0)return null;
  const parts=new Map((run.task.parts||[]).map(p=>[String(p.mark),p])),used=new Map();
  const rules=ncNpMfgGet(run.taskKey)||{},sheets=[];
  for(const [si,st] of run.tpl.stockSheets.entries()){
    const W=st.sheetLen-2*st.edge,H=st.sheetWid-2*st.edge,gap=Math.max(0,Number(st.gap)||0,Number(rules.minWeb)||0),geoms=[];
    const source=(candidate.sheets||[]).find((h,i)=>(Number.isInteger(h.stockIndex)?h.stockIndex:i)===si);
    const sh={...st,stockIndex:si,placed:[]};sheets.push(sh);
    if(run.preserveExisting&&si<Number(run.startStockIndex||0))continue;
    for(const pl of (source&&source.placed)||[]){
      const key=String(pl.mark),part=parts.get(key);if(!part||(used.get(key)||0)>=Number(part.qty))continue;
      const a=((Number(pl.angle)||0)%360+360)%360,mode=String(rules.rotationMode||'free');
      if(rules.allowMirror===false&&(pl.mirrored||pl.mirrorAxis))continue;
      if(mode==='0'&&Math.abs(a)>1e-6||mode==='90'&&Math.abs(a/90-Math.round(a/90))>1e-6||mode==='180'&&Math.abs(a/180-Math.round(a/180))>1e-6)continue;
      const g=ncNpAutoCandidateGeom(part,pl);if(!g||g.bbox.minX<0||g.bbox.minY<0||g.bbox.maxX>W||g.bbox.maxY>H)continue;
      if(geoms.some(h=>!(h.bbox.maxX+gap<=g.bbox.minX||g.bbox.maxX+gap<=h.bbox.minX||h.bbox.maxY+gap<=g.bbox.minY||g.bbox.maxY+gap<=h.bbox.minY)&&ncNpAutoCandidatePairTooClose(h,g,gap,rules.allowPartInPart!==false)))continue;
      geoms.push(g);sh.placed.push({...pl});used.set(key,(used.get(key)||0)+1);
    }
  }
  const total=(run.task.parts||[]).reduce((n,p)=>n+Math.max(0,Number(p.qty)||0),0),placed=sheets.reduce((n,h)=>n+h.placed.length,0);
  const result={total,placed,failed:total-placed,sheets,stockOrderExact:true,engine:'T49 · Safe partial seed'};
  return placed>0&&ncNpValidateAutoCandidateExact(run,result).ok?result:null;
}

function mtT49JobSignature(run){
  // Include full part data, stock order and manufacturing rules; exclude mutable layout.
  return JSON.stringify({version:49,parts:run.task.parts,stock:run.tpl.stockSheets.map(s=>({sheetLen:s.sheetLen,sheetWid:s.sheetWid,edge:s.edge,gap:s.gap,grade:s.grade,thickness:s.thickness,machineReference:s.machineReference})),rules:ncNpMfgGet(run.taskKey)});
}

var mtT49Champions=new Map();
function mtT49ChampionKey(signature){let h=2166136261;for(let i=0;i<signature.length;i++)h=Math.imul(h^signature.charCodeAt(i),16777619);return 'MT-T49-best-'+(h>>>0).toString(16);}

function mtT49LoadChampion(run){
  if(run.preserveExisting&&(Number(run.fixedCount)>0||Number(run.startStockIndex)>0))return;
  try{
    const signature=mtT49JobSignature(run),key=mtT49ChampionKey(signature);run.searchSeed=parseInt(key.split('-').pop(),16);run._t49Signature=signature;run._t49CacheKey=key;
    let entry=mtT49Champions.get(key);if(!entry)try{entry=JSON.parse(localStorage.getItem(key)||'null');}catch(_){}
    if(!entry||entry.signature!==signature)return;
    const cand=ncNpConstrainResultToStock(entry.result,run.tpl);if(!ncNpValidateAutoCandidateExact(run,cand).ok)return;
    mtT49Champions.set(key,entry);
    const q=ncNpAutoQuality(cand,run.tpl),old=run.best?ncNpAutoQuality(run.best,run.tpl):null;
    if(!run.best||ncNpAutoQualityCmp(q,old)<0){run.best=cand;run.bestQuality=q;run.safeBest=cand;run.safeBestQuality=q;run.bestEngine='T50 · Best saved for this job';run.workerStats.cachedChampion=true;}
  }catch(e){run.workerStats.championCacheError=String(e.message||e);}
}

function mtT49SaveChampion(run,result){
  if(!run||!result||!run._t49Signature||!ncNpValidateAutoCandidateExact(run,result).ok)return;
  const key=run._t49CacheKey,entry={signature:run._t49Signature,result:JSON.parse(JSON.stringify(result))};
  let prev=mtT49Champions.get(key);if(!prev)try{prev=JSON.parse(localStorage.getItem(key)||'null');}catch(_){}
  if(prev&&prev.signature===entry.signature&&ncNpValidateAutoCandidateExact(run,prev.result).ok&&ncNpAutoQualityCmp(ncNpAutoQuality(entry.result,run.tpl),ncNpAutoQuality(prev.result,run.tpl))>=0)return;
  mtT49Champions.set(key,entry);while(mtT49Champions.size>4)mtT49Champions.delete(mtT49Champions.keys().next().value);
  try{
    localStorage.setItem(key,JSON.stringify(entry));
    const indexKey='MT-T49-best-index',index=JSON.parse(localStorage.getItem(indexKey)||'[]').filter(k=>k!==key);index.push(key);
    while(index.length>4)localStorage.removeItem(index.shift());localStorage.setItem(indexKey,JSON.stringify(index));
  }catch(_){run.workerStats.championMemoryOnly=true;}
}

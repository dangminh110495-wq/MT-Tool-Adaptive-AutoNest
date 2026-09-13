/* Review excerpt from MT-Tool T50 public build. Not standalone; depends on MT-Tool globals. */
function ncNpValidateAutoCandidateExact(run,cand){
  if(!run||!cand||!Array.isArray(cand.sheets))return{ok:false,why:'invalid candidate'};
  const parts=(run.task&&Array.isArray(run.task.parts)?run.task.parts:run.workerParts||[]),partBy=new Map(parts.filter(Boolean).map(p=>[String(p.mark),p]));
  let rules={};try{rules=typeof ncNpMfgGet==='function'?(ncNpMfgGet(run.taskKey)||{}):{};}catch(_){rules={};}
  const allowPartInPart=rules.allowPartInPart!==false,minWeb=Math.max(0,Number(rules.minWeb)||0),tpl=run.tpl||{},stock=Array.isArray(tpl.stockSheets)?tpl.stockSheets:[];
  let count=0,pairChecks=0;const quantities=new Map();
  for(let si=0;si<cand.sheets.length;si++){
    const sh=cand.sheets[si]||{},sx=Number.isInteger(sh.stockIndex)?sh.stockIndex:si,st=stock[sx]||{};
    const sheetLen=Number(sh.sheetLen)||Number(st.sheetLen)||Number(tpl.sheetLen)||0,sheetWid=Number(sh.sheetWid)||Number(st.sheetWid)||Number(tpl.sheetWid)||0;
    const edge=Math.max(0,Number(sh.edge!=null?sh.edge:(st.edge!=null?st.edge:tpl.edge))||0),gap=Math.max(minWeb,Math.max(0,Number(sh.gap!=null?sh.gap:(st.gap!=null?st.gap:tpl.gap))||0));
    const W=sheetLen-2*edge,H=sheetWid-2*edge;if(!(W>0&&H>0))return{ok:false,why:`sheet ${si+1} invalid stock`};
    if(stock.length&&(sx<0||sx>=stock.length))return{ok:false,why:'stock index out of range'};
    const geoms=[];
    for(let pi=0;pi<(sh.placed||[]).length;pi++){
      const pl=sh.placed[pi],part=partBy.get(String(pl&&pl.mark));if(!part)return{ok:false,why:`sheet ${si+1} missing part ${String(pl&&pl.mark||'')}`};
      const mark=String(pl.mark),qty=(quantities.get(mark)||0)+1;quantities.set(mark,qty);
      if(Number.isFinite(Number(part.qty))&&qty>Number(part.qty))return{ok:false,why:'quantity exceeded '+mark};
      const angle=((Number(pl.angle)||0)%360+360)%360,mode=String(rules.rotationMode||'free');
      if(rules.allowMirror===false&&(pl.mirrored||pl.mirrorAxis))return{ok:false,why:'mirror forbidden '+mark};
      if(mode==='0'&&angle>1e-6||mode==='90'&&Math.abs(angle/90-Math.round(angle/90))>1e-6||mode==='180'&&Math.abs(angle/180-Math.round(angle/180))>1e-6)return{ok:false,why:'rotation forbidden '+mark};
      const g=ncNpAutoCandidateGeom(part,pl);if(!g)return{ok:false,why:`sheet ${si+1} invalid geometry ${String(pl&&pl.mark||'')}`};
      if(g.bbox.minX<-0.02||g.bbox.minY<-0.02||g.bbox.maxX>W+0.02||g.bbox.maxY>H+0.02)return{ok:false,why:`out-of-sheet ${g.mark} @ sheet ${si+1}`};
      geoms.push(g);count++;
    }
    geoms.sort((a,b)=>a.bbox.minX-b.bbox.minX||a.bbox.minY-b.bbox.minY);
    for(let i=0;i<geoms.length;i++){
      const a=geoms[i];
      for(let j=i+1;j<geoms.length;j++){
        const b=geoms[j];if(b.bbox.minX-a.bbox.maxX>=gap-1e-7)break;
        if(a.bbox.maxY+gap<=b.bbox.minY+1e-7||b.bbox.maxY+gap<=a.bbox.minY+1e-7)continue;
        pairChecks++;
        if(ncNpAutoCandidatePairTooClose(a,b,gap,allowPartInPart))return{ok:false,why:`overlap/gap ${a.mark} ↔ ${b.mark} @ sheet ${si+1}`,sheet:si,pairChecks,count};
      }
    }
  }
  return{ok:true,pairChecks,count};
}

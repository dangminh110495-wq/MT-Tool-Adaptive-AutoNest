/* Review excerpt from MT-Tool T50 public build. Not standalone; depends on MT-Tool globals. */
function ncNpStartT21MasterSpecialist(run,options={}){
  if(!run||run.finishRequested||(run.preserveExisting&&Number(run.fixedCount||0)>0))return;
  try{
    const seedSource=(options&&options.initialElite)||run.best;
    const subset=!!options.partialRefine&&!options.portfolio,subsetCounts=new Map();
    if(subset)for(const sh of (seedSource&&seedSource.sheets)||[])for(const p of sh.placed||[])subsetCounts.set(String(p.mark),(subsetCounts.get(String(p.mark))||0)+1);
    const requestedTotal=Number(seedSource&&seedSource.total)||0;
    const source=document.getElementById('ncnp-clipper2-source').textContent;
    const wasm=document.getElementById('ncnp-clipper2-wasm').textContent.trim();
    const src=source+'\nconst NCNP_CLIPPER2_B64='+JSON.stringify(wasm)+';\nconst NCNP_X22_WASM_B64='+JSON.stringify(NCNP_X22_WASM_B64)+';\n('+ncNpTrueNfpWorkerMain.toString()+')();';
    const url=URL.createObjectURL(new Blob([src],{type:'application/javascript'})),worker=new Worker(url),rec={worker,url,wi:'T22',kind:options.portfolio?'t48GlobalMultistart':'globalPartitionDiverseTrueNfp',stats:null};
    run.workers.push(rec);run.workerStats.workers=run.workers.filter(r=>!r.done&&!r.stoppedByT45).length;run.workerStats.truePolygonNfp=true;run.workerStats.t22Partition=true;
    let lastState='';const statusId=options.portfolio?'ncNpGlobalRestartStatus':'ncNpTrueNfpStatus';
    worker.onmessage=ev=>{
      if(ncNpAutoRun!==run||run.finishRequested)return;const m=ev.data||{};
      if(m.stats){rec.stats=m.stats;if(options.portfolio)run.workerStats.globalSearch={...m.stats};run.workerStats.t21Built=m.stats.nfpBuilt||0;run.workerStats.t21Choices=m.stats.placementChoices||0;run.workerStats.t21Beam=m.stats.seedBeam||0;run.workerStats.t21Repairs=m.stats.rebuildChanged||0;run.workerStats.t21Genes=m.stats.geneEvaluated||0;run.workerStats.t21TailWins=m.stats.targetWins||0;run.workerStats.t21Exchange=m.stats.exchangeComplete||0;run.workerStats.t21ContourMoves=m.stats.contourMoves||0;}
      if(m.type==='candidate'&&m.result){
        // Worker optimizes the fixed subset; report outstanding demand against the original job.
        const result=subset?{...m.result,total:requestedTotal,failed:Math.max(0,requestedTotal-Number(m.result.placed))}:m.result;
        const cand=ncNpConstrainResultToStock(ncNpAutoWrapWorkerResult(result,run.tpl),run.tpl);
        if(run.preserveExisting&&!ncNpPreserveCandidateSafe(run,cand))return;
        const exactGate=ncNpValidateAutoCandidateExact(run,cand);
        if(!exactGate.ok){run.workerStats.t21ExactRejects=(run.workerStats.t21ExactRejects||0)+1;run.workerStats.t21LastExactReject=exactGate.why;return;}
        const q=ncNpAutoQuality(cand,run.tpl);run.workerStats.candidates=(run.workerStats.candidates||0)+1;
        if(!run.best||ncNpAutoQualityCmp(q,run.bestQuality)<0){run.best=cand;run.bestQuality=q;run.bestEngine=options.portfolio?'T50 · Global champion search':subset?'T50 · Partial TRUE-NFP':'T50 · Local closure TRUE-NFP';run.safeBest=cand;run.safeBestQuality=q;run.lastImproveAt=Date.now();run.workerStats.t21Wins=(run.workerStats.t21Wins||0)+1;}
      }else if(m.type==='error'){rec.error=String(m.message||'PURE TRUE NFP error');run.workerStats.t21Error=rec.error;}
      else if(m.type==='done')rec.done=true;
    };
    worker.onerror=e=>{rec.error=String(e.message||e);if(run.workerStats)run.workerStats.t21Error=rec.error;};
    const rules=ncNpMfgGet(run.taskKey),parts=(run.workerParts||run.task.parts||[]).map(p=>({mark:p.mark,polygon:p.polygon,qty:subset?(subsetCounts.get(String(p.mark))||0):p.qty})).filter(p=>p.qty>0);
    const stock=run.tpl.stockSheets.map(s=>({W:s.sheetLen-2*s.edge,H:s.sheetWid-2*s.edge,gap:s.gap}));
    // No slimElite helper in T21: foreign layouts are intentionally not serialised.
    // T21 chromosomes start from EMPTY stock only. No initialElite and no migration pump.
    const targetSpan=Math.max(1,Math.min(stock.length,((seedSource&&seedSource.sheets)||[]).filter(sh=>(sh.placed||[]).length).length||stock.length));
    const seedLayout=seedSource&&Array.isArray(seedSource.sheets)?{engine:seedSource.engine||run.bestEngine||'JS seed',stockOrderExact:true,total:seedSource.total,placed:seedSource.placed,failed:seedSource.failed,sheets:seedSource.sheets.map((sh,si)=>({stockIndex:Number.isInteger(sh.stockIndex)?sh.stockIndex:si,placed:(sh.placed||[]).map(p=>({mark:p.mark,x:Number(p.x),y:Number(p.y),angle:Number(p.angle)||0,mirrored:!!p.mirrored,mirrorAxis:p.mirrorAxis||null}))}))}:null;
    const dynSeed=((Number(run.searchSeed)||0x3165EED)^(options.portfolio?0x48A19:0x49B27))>>>0;worker.postMessage({type:'start',parts,mtvec:subset?null:(run.mtvec||null),stockSheets:stock,mfg:rules,ms:Math.max(1000,run.deadline-Date.now()-650),initialElite:seedLayout,tailFirst:!!options.tailFirst,portfolio:!!options.portfolio,allowPartial:!!options.portfolio,seed:dynSeed,targetSpan,role:options.tailFirst?'t45-tail-first':'t31.6-js-seeded-true-nfp'});
    function status(){
      if(ncNpAutoRun!==run||run.finishRequested||rec.done)return;const st=rec.stats||{};
      const state=options.portfolio&&!rec.error?`T50 Global · renest ${st.globalRestarts||0} · đủ ${st.globalComplete||0} · best ${st.globalWins||0} · polish ${st.globalPolishAttempts||0} · tail còn ${Number.isFinite(st.closureBestTail)?st.closureBestTail:'-'}/${Number.isFinite(st.closureInitialTail)?st.closureInitialTail:'-'} · quần thể ${st.globalPopulation||0}`:rec.error?'T21: '+rec.error.split('\n')[0]:`T50 Local · ${st.seedImported?'seed ✓ · ':''}${st.tailFirst?'P'+(st.plateauLevel||0)+' · ':''}${st.phase||'khởi động'} · tail còn ${Number.isFinite(st.closureBestTail)?st.closureBestTail:'-'}/${Number.isFinite(st.closureInitialTail)?st.closureInitialTail:'-'} · eject ${st.closureEjections||0} · ALNS ${st.alnsRounds||0}${Number.isFinite(st.bestRemain)?' · remain '+st.bestRemain.toFixed(1)+' mm':''}`;
      let line=document.getElementById(statusId);if(!line){const anchor=document.getElementById('ncNpAutoNestEngine');if(anchor){line=document.createElement('div');line.id=statusId;line.style.cssText='font-size:11px;color:#67d7ff;margin-top:5px;white-space:normal';anchor.insertAdjacentElement('afterend',line);}}
      if(line&&state!==lastState){line.textContent=state;lastState=state;}
      const ui={ncNpAutoNestExact:Number(run.workerStats&&run.workerStats.candidates)||0,ncNpAutoNestBestUpdates:Number(run.workerStats&&run.workerStats.t21Wins)||0};
      if(options.portfolio){ui.ncNpAutoNestRounds=Number(st.globalRestarts)||0;ui.ncNpAutoNestTailAttempts=Number(st.globalPolishAttempts)||0;}
      for(const [id,value] of Object.entries(ui)){const el=document.getElementById(id);if(el)el.textContent=String(value);}
      setTimeout(status,800);
    }status();
    return rec;
  }catch(e){if(run.workerStats)run.workerStats.t21Error=String(e&&e.message||e);return null;}
}

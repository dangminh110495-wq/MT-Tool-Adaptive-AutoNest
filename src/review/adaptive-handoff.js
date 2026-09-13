/* Review excerpt from MT-Tool T50 public build. Not standalone; depends on MT-Tool globals. */
(function(){
  'use strict';
  window.MT_NESTING_BUILD='X6.317-T45.1-EXACT-SAFETY-GATE';
  window.MT_AUTONEST_ENGINE='T45_3_PARTIAL_INTEGRATION_CONTACT_SNAP_EXACT_GATE';
  window.MT_T453_BUILD='X6.319-T45.3-PARTIAL-INTEGRATION-CONTACT-SNAP';
  window.MT_NESTING_BUILD=window.MT_T453_BUILD;
  const T45_MIN_CPP_MS=5000,T45_PLATEAU_MS=1800,T45_HARD_HANDOFF_MS=11000;

  function mtT45CppWindow(totalParts){
    totalParts=Math.max(0,Number(totalParts)||0);
    if(totalParts>=400)return{minMs:9000,hardMs:12000};
    if(totalParts>=180)return{minMs:7000,hardMs:11000};
    return{minMs:5000,hardMs:9000};
  }
  function mtT45HandoffReason(elapsedMs,sinceImproveMs,candidateDelta,hasBest,minMs=T45_MIN_CPP_MS,hardMs=T45_HARD_HANDOFF_MS){
    elapsedMs=Number(elapsedMs)||0;sinceImproveMs=Number(sinceImproveMs)||0;candidateDelta=Number(candidateDelta)||0;minMs=Math.max(0,Number(minMs)||T45_MIN_CPP_MS);hardMs=Math.max(minMs,Number(hardMs)||T45_HARD_HANDOFF_MS);
    if(!hasBest)return '';
    if(elapsedMs>=hardMs)return 'hard-cap';
    if(candidateDelta>0&&elapsedMs>=minMs&&sinceImproveMs>=T45_PLATEAU_MS)return 'plateau';
    return '';
  }
  window.mtT45CppWindow=mtT45CppWindow;window.mtT45HandoffReason=mtT45HandoffReason;

  function statusLine(text,color){
    let line=document.getElementById('mtT44HybridStatus')||document.getElementById('mtT45HybridStatus');
    if(!line){
      const anchor=document.getElementById('ncNpAutoNestEngine');
      if(anchor){line=document.createElement('div');line.id='mtT45HybridStatus';line.style.cssText='font-size:11px;color:'+(color||'#8fd3ff')+';margin-top:5px;white-space:normal';anchor.insertAdjacentElement('afterend',line);}
    }
    if(line){line.id='mtT45HybridStatus';line.style.color=color||'#8fd3ff';line.textContent=text;}
  }

  function cloneSeed(result){
    if(!result||!Array.isArray(result.sheets))return null;
    return{engine:result.engine||'',stockOrderExact:result.stockOrderExact!==false,total:Number(result.total)||0,placed:Number(result.placed)||0,failed:Number(result.failed)||0,sheets:result.sheets.map((sh,si)=>({stockIndex:Number.isInteger(sh.stockIndex)?sh.stockIndex:si,placed:(sh.placed||[]).map(p=>({mark:p.mark,x:Number(p.x),y:Number(p.y),angle:Number(p.angle)||0,mirrored:!!p.mirrored,mirrorAxis:p.mirrorAxis||null}))}))};
  }

  // T45.2 PARTIAL-STOCK MODE: when the operator intentionally supplies fewer
  // sheets than required, keep the best SAFE subset instead of reporting 0/N.
  // T47: a conservative circular envelope seed. Polygon exact gate is authoritative.
  function mtT47CircleSeed(run){
    try{
      if(!run||!run.tpl||run.preserveExisting&&Number(run.fixedCount)>0)return null;
      const ps=(run.workerParts||run.task.parts||[]).filter(p=>Number(p.qty)>0);
      if(ps.length!==1)return null;
      const p=ps[0],poly=p.polygon||[];if(poly.length<24)return null;
      const xs=poly.map(p=>Number(p.x)),ys=poly.map(p=>Number(p.y));
      if(!xs.concat(ys).every(Number.isFinite))return null;
      const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
      const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
      const rr=poly.map(p=>Math.hypot(p.x-cx,p.y-cy)),R=Math.max(...rr),D=2*R;
      if(!(R>0)||R-Math.min(...rr)>.025||Math.abs(maxX-minX-(maxY-minY))>.025)return null;
      const angles=poly.map(p=>Math.atan2(p.y-cy,p.x-cx)).sort((a,b)=>a-b);
      if(angles.some((a,i)=>(i+1<angles.length?angles[i+1]:angles[0]+2*Math.PI)-a>Math.PI/12))return null;
      const rules=typeof ncNpMfgGet==='function'?ncNpMfgGet(run.taskKey):{};
      const total=Math.floor(Number(p.qty)),sheets=[];let remain=total;
      for(const [si,stock] of (run.tpl.stockSheets||[]).entries()){
        const W=stock.sheetLen-2*stock.edge,H=stock.sheetWid-2*stock.edge;
        const gap=Math.max(0,Number(stock.gap)||0,Number(rules.minWeb)||0),pitch=D+gap+.002;
        const sh={...stock,stockIndex:si,placed:[]};sheets.push(sh);
        if(D>W||D>H)continue;
        const dy=Math.min(H-D,Math.sqrt(3)/2*pitch),dx=Math.sqrt(Math.max(0,pitch*pitch-dy*dy));
        for(let i=0;remain>0&&i*dx+D<=W+1e-7;i++){
          sh.placed.push({mark:p.mark,x:i*dx+R-(cx-minX),y:(i%2?dy:0)+R-(cy-minY),angle:0,mirrored:false,mirrorAxis:null});remain--;
        }
      }
      const raw={engine:'T47 · circular stagger seed',stockOrderExact:true,total,placed:total-remain,failed:remain,sheets};
      const cand=typeof ncNpAutoWrapWorkerResult==='function'?ncNpAutoWrapWorkerResult(raw,run.tpl):raw;
      return cand.placed&&ncNpValidateAutoCandidateExact(run,cand).ok?cand:null;
    }catch(_){return null;}
  }
  window.mtT47CircleSeed=mtT47CircleSeed;

  function mtT45BuildPartialFallback(run){
    try{
      if(!run||!run.task||!run.tpl||typeof ncNpAutoRunPlateOnce!=='function')return null;
      const raw=ncNpAutoRunPlateOnce(run.task,run.tpl,0);
      let cand=ncNpConstrainResultToStock(raw,run.tpl);
      if(!cand||!(Number(cand.placed)>0)||!(Number(cand.failed)>0))return null;
      const gate=ncNpValidateAutoCandidateExact(run,cand);
      if(!gate.ok){run.workerStats=run.workerStats||{};run.workerStats.partialFallbackReject=gate.why;cand=mtT49SafeSubset(run,cand);if(!cand)return null;}
      const circle=typeof mtT47CircleSeed==='function'?mtT47CircleSeed(run):null;
      if(circle&&(circle.placed>cand.placed||circle.placed===cand.placed&&ncNpAutoQualityCmp(ncNpAutoQuality(circle,run.tpl),ncNpAutoQuality(cand,run.tpl))<0))return circle;
      return cand;
    }catch(_){return null;}
  }
  window.mtT45BuildPartialFallback=mtT45BuildPartialFallback;

  function mtT45TargetTotal(run){
    if(!run)return 0;
    return Math.max(0,Number(run.fullTotal)||Number(run.workTotal)||Number(run.remainingTotal)||Number(run.best&&run.best.total)||0);
  }
  function mtT45BestComplete(run){
    if(!run||!run.best)return false;
    const target=mtT45TargetTotal(run),placed=Math.max(0,Number(run.best.placed)||0),failed=Math.max(0,Number(run.best.failed)||0);
    return target>0&&placed>=target&&failed===0;
  }
  function mtT45PrimePartialBaseline(run){
    if(!run||!run.preserveExisting||Number(run.fixedCount||0)!==0)return false;
    if(Number(run.best&&run.best.placed)>0)return false;
    const partial=mtT45BuildPartialFallback(run);
    if(!partial)return false;
    const q=ncNpAutoQuality(partial,run.tpl);
    run.best=partial;run.bestQuality=q;run.safeBest=partial;run.safeBestQuality=q;run.bestEngine='T45.3 · Partial Stock SAFE baseline';run.lastImproveAt=Date.now();
    run.workerStats=run.workerStats||{};run.workerStats.partialStockBaseline=true;run.workerStats.partialPlaced=Number(partial.placed)||0;run.workerStats.partialFailed=Number(partial.failed)||0;
    statusLine(`T45.3 · partial baseline an toàn ${partial.placed}/${partial.total} part · C++ vẫn thử tìm complete layout`,'#f0c56b');
    return true;
  }
  window.mtT45TargetTotal=mtT45TargetTotal;window.mtT45BestComplete=mtT45BestComplete;window.mtT45PrimePartialBaseline=mtT45PrimePartialBaseline;

  function stopCppLane(run){
    let stopped=0;
    for(const rec of (run&&run.workers)||[]){
      if(!rec||rec.kind!=='cppJsClone'||rec.stoppedByT45)continue;
      try{if(rec.worker)rec.worker.terminate();}catch(_){}
      try{if(rec.url)URL.revokeObjectURL(rec.url);}catch(_){}
      rec.done=true;rec.stoppedByT45=true;stopped++;
    }
    if(run){run.workerStats=run.workerStats||{};run.workerStats.cppStoppedAtHandoff=stopped>0;run.workerStats.cppStoppedCount=stopped;}
    return stopped;
  }

  function startRefiner(run,reason){
    if(!run||run.finishRequested||run._t45NfpStarted)return false;
    if(run.preserveExisting&&Number(run.fixedCount||0)>0){
      run.workerStats=run.workerStats||{};run.workerStats.hybridRefinerSkipped='locked-preserve';
      statusLine('T45 · C++ only · Continue Nest đang khóa '+Number(run.fixedCount||0)+' part','#f0c56b');return false;
    }
    if(!run.best||Number(run.best.placed)<=0||typeof ncNpStartT21MasterSpecialist!=='function')return false;
    const seedSnapshot=cloneSeed(run.best);if(!seedSnapshot)return false;
    run._t45NfpStarted=true;run._t45HandoffAt=Date.now();run.workerStats=run.workerStats||{};
    run.workerStats.hybridRefinerStarted=true;run.workerStats.hybridLaunchReason=reason;run.workerStats.hybridSeedEngine=run.bestEngine||'';
    run.workerStats.hybridSeedRemain=run.bestQuality&&Number.isFinite(Number(run.bestQuality.remainW))?Number(run.bestQuality.remainW):null;
    const rem=run.workerStats.hybridSeedRemain;
    statusLine(`T45 · handoff ${reason==='plateau'?'plateau':'hard cap'} · C++ dừng → Local NFP + Global Renest${Number.isFinite(rem)?' · seed remain '+rem.toFixed(0)+'mm':''}`,'#67d7ff');
    try{
      const launched=ncNpStartT21MasterSpecialist(run,{initialElite:seedSnapshot,tailFirst:true,partialRefine:Number(seedSnapshot.failed)>0});
      if(launched===null)throw Error(run.workerStats.t21Error||'Refiner launch failed');
      stopCppLane(run);
      if(launched&&typeof launched==='object'&&!run._t49Global)ncNpStartT21MasterSpecialist(run,{initialElite:seedSnapshot,tailFirst:false,partialRefine:Number(seedSnapshot.failed)>0,portfolio:true});
      return true;
    }catch(e){
      run._t45NfpStarted=false;run.workerStats.hybridRefinerStarted=false;run.workerStats.t45RefinerError=String(e&&e.message||e);
      statusLine('T45 · TRUE-NFP không khởi động được','#ff9b8a');return false;
    }
  }

  ncNpStartX3Workers=function(run){
    if(!run||run.finishRequested)return;run.workerStats=run.workerStats||{};run.workerStats.hybridT45=true;run.workerStats.hybridRefinerStarted=false;
    if(typeof mtT49LoadChampion==='function')mtT49LoadChampion(run);
    mtT45PrimePartialBaseline(run);
    if(!mtT45BestComplete(run)&&!(run.preserveExisting&&Number(run.fixedCount)>0)){
      run._t49Global=ncNpStartT21MasterSpecialist(run,{portfolio:true,partialRefine:true});
    }
    const circle=mtT47CircleSeed(run);
    if(circle){const q=ncNpAutoQuality(circle,run.tpl);if(!run.best||ncNpAutoQualityCmp(q,run.bestQuality)<0){run.best=circle;run.bestQuality=q;run.safeBest=circle;run.safeBestQuality=q;run.bestEngine=circle.engine;run.lastImproveAt=Date.now();run.workerStats.circularSeedPlaced=circle.placed;}}

    const initialCandidateCount=Number(run.workerStats.candidates||0),startedAt=Date.now();run._t45CppStartedAt=startedAt;
    const totalParts=Number(run.mtvec&&run.mtvec.totalInstances)||((run.workerParts||run.task&&run.task.parts||[]).reduce((n,p)=>n+Math.max(0,Number(p.qty)||0),0));
    const cppWindow=mtT45CppWindow(totalParts);run.workerStats.t45CppMinMs=cppWindow.minMs;run.workerStats.t45CppHardMs=cppWindow.hardMs;
    if(typeof window.mtStartCppX327Clone==='function'){window.mtStartCppX327Clone(run);statusLine(`T45 · C++ fast seed độc quyền · warm-up 0–${(cppWindow.minMs/1000).toFixed(0)}s · ${totalParts} part`,'#80e6a8');}
    else{run.workerError='T45: không tìm thấy C++ X3.27 starter';statusLine('T45 · thiếu C++ starter · dùng TRUE-NFP baseline','#ff9b8a');startRefiner(run,'hard-cap');return;}
    if(run.preserveExisting&&Number(run.fixedCount||0)>0){run.workerStats.hybridRefinerSkipped='locked-preserve';statusLine('T45 · C++ only · Continue Nest đang khóa '+Number(run.fixedCount||0)+' part','#f0c56b');return;}

    const watch=()=>{
      if(ncNpAutoRun!==run||run.finishRequested||run._t45NfpStarted||run._t45PartialStockDone)return;
      const now=Date.now(),elapsed=now-startedAt,candidateCount=Number((run.workerStats&&run.workerStats.candidates)||0),candidateDelta=Math.max(0,candidateCount-initialCandidateCount);
      const lastImprove=Math.max(startedAt,Number(run.lastImproveAt)||startedAt),sinceImproveMs=Math.max(0,now-lastImprove);
      const completeBest=mtT45BestComplete(run);
      if(!completeBest&&elapsed>=cppWindow.hardMs&&!run._t45PartialStockDone){
        let partial=mtT45BuildPartialFallback(run);
        const cur=run.best,curPlaced=Math.max(0,Number(cur&&cur.placed)||0),partPlaced=Math.max(0,Number(partial&&partial.placed)||0);
        if(curPlaced>partPlaced||curPlaced===partPlaced&&cur&&partial&&ncNpAutoQualityCmp(ncNpAutoQuality(cur,run.tpl),ncNpAutoQuality(partial,run.tpl))<0){
          const cg=ncNpValidateAutoCandidateExact(run,cur);if(cg.ok)partial=cur;
        }
        run._t45PartialStockDone=true;
        if(partial&&Number(partial.placed)>0){
          const q=ncNpAutoQuality(partial,run.tpl);run.best=partial;run.bestQuality=q;run.safeBest=partial;run.safeBestQuality=q;run.bestEngine='T45.3 · Partial Stock SAFE';run.lastImproveAt=Date.now();
          run.workerStats.partialStock=true;run.workerStats.partialPlaced=Number(partial.placed)||0;run.workerStats.partialFailed=Number(partial.failed)||0;
          statusLine(`T47 · giữ ${partial.placed}/${partial.total} part · tiếp tục tinh chỉnh hình học`,'#f0c56b');
          startRefiner(run,'partial-stock');
          return;
        }
        run.workerStats.partialStockFallbackFailed=true;
        const global=run._t49Global||ncNpStartT21MasterSpecialist(run,{portfolio:true,partialRefine:true});
        if(global){stopCppLane(run);run._t45NfpStarted=true;statusLine('T49 · đang xếp từ tôn trống · giữ phần hợp lệ tốt nhất','#f0c56b');}
        return;
      }
      const reason=mtT45HandoffReason(elapsed,sinceImproveMs,candidateDelta,completeBest,cppWindow.minMs,cppWindow.hardMs);
      if(reason){if(startRefiner(run,reason))return;}
      else if(elapsed<cppWindow.minMs)statusLine(`T45 · C++ fast seed độc quyền · warm-up ${(elapsed/1000).toFixed(1)}/${(cppWindow.minMs/1000).toFixed(1)}s`,'#80e6a8');
      else statusLine(`T45 · C++ đang chờ plateau · best đứng ${(sinceImproveMs/1000).toFixed(1)}s / 1.8s · cap ${(elapsed/1000).toFixed(1)}/${(cppWindow.hardMs/1000).toFixed(0)}s`,'#80e6a8');
      if(Date.now()<run.deadline-1200)setTimeout(watch,120);
    };
    setTimeout(watch,120);
  };

  function relabel(){const b=document.querySelector('.ncnp-rbtn[data-npact="autoNest"]');if(b){b.style.display='';b.innerHTML='<span class="ico">⚙️</span>Adaptive Auto<br/>Nest';b.title='T50 · giữ champion + chống đứng nghiệm + last-sheet closure/ejection TRUE-NFP · Offline';}}
  relabel();setTimeout(relabel,300);setTimeout(relabel,1400);
  const oldProgress=ncNpAutoProgress;
  ncNpAutoProgress=function(best,run,elapsed){const r=oldProgress.apply(this,arguments);if(run){const t=document.querySelector('#ncNpAutoNestModal .modal-header span');if(t)t.textContent='⚙️ Adaptive Auto Nest · T50 Anti-Stall + Last-Sheet Closure';}return r;};
})();

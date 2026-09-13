/* Review excerpt from MT-Tool T50 public build. Not standalone; depends on TRUE-NFP worker state. */
    // T48 independent global lane: exact pair contacts, then repeatedly rebuild ALL sheets.
    async function portfolioSearch(){
      const bank=new Map(),elite=[],G=Math.max(...stocks.map(s=>s.G)),seedRanks=new Map();
      for(const [si,sh] of ((msg.initialElite&&msg.initialElite.sheets)||[]).entries())for(const p of sh.placed||[]){
        const k=String(p.mark);if(!seedRanks.has(k))seedRanks.set(k,[]);seedRanks.get(k).push(si*1e9+Number(p.x)*1e4+Number(p.y));
      }
      for(const ranks of seedRanks.values())ranks.sort((a,b)=>a-b);
      const types=[...parts.values()].filter(t=>t.qty>=2&&t.poly.length<=100&&t.area/(bounds(t.poly).w*bounds(t.poly).h)<.94)
        .sort((a,b)=>b.area*(1-b.area/(bounds(b.poly).w*bounds(b.poly).h))-a.area*(1-a.area/(bounds(a.poly).w*bounds(a.poly).h)));
      let serial=0,pairIndex=0,nextPolish=now()+8000,polishSerial=0,nextTrue=now()+12000,trueBudget=12000;
      const allowed=a=>mode==='free'||mode==='90'&&Math.abs(a/90-Math.round(a/90))<1e-6||mode==='180'&&Math.abs(a/180-Math.round(a/180))<1e-6||mode==='0'&&a===0;
      function pairVariants(t,until){
        const bases=[0,90];if(mode==='free')for(const e of t.edge.slice(0,3))bases.push(angle(-e),angle(90-e));
        const found=[],seen=new Set();
        searchPairs: for(const aa of [...new Set(bases.map(angle))])for(const delta of [180,0]){
          if(!alive()||now()>until)break searchPairs;
          const ba=angle(aa+delta);if(!allowed(aa)||!allowed(ba))continue;
          const A=orient(t,aa,''),B=orient(t,ba,''),nf=nfp(A,B,G);
          const points=[];
          for(const poly of nf.ps)for(let i=0;i<poly.length;i++){
            const a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dy=b.y-a.y,ts=[0,1];
            // Envelope changes slope at alignment events. Include interior area minima.
            if(Math.abs(dx)>1e-12)for(const x of [0,A.w-B.w]){const u=(x-a.x)/dx;if(u>0&&u<1)ts.push(u);}
            if(Math.abs(dy)>1e-12)for(const y of [0,A.h-B.h]){const u=(y-a.y)/dy;if(u>0&&u<1)ts.push(u);}
            ts.sort((a,b)=>a-b);const sample=ts.slice();
            for(let j=1;j<ts.length;j++){
              const l=ts[j-1],r=ts[j],m=(l+r)/2,x=a.x+m*dx,y=a.y+m*dy;
              const W=Math.max(A.w,x+B.w)-Math.min(0,x),H=Math.max(A.h,y+B.h)-Math.min(0,y);
              const dw=(x+B.w>A.w?dx:0)-(x<0?dx:0),dh=(y+B.h>A.h?dy:0)-(y<0?dy:0);
              if(Math.abs(dw*dh)>1e-12){const u=m-(dw*H+dh*W)/(2*dw*dh);if(u>l&&u<r)sample.push(u);}
            }
            for(const u of sample){const x=a.x+u*dx,y=a.y+u*dy,X=Math.min(0,x),Y=Math.min(0,y),w=Math.max(A.w,x+B.w)-X,h=Math.max(A.h,y+B.h)-Y;points.push({x,y,X,Y,w,h,score:w*h});}
          }
          points.sort((a,b)=>a.score-b.score||Math.max(a.w,a.h)-Math.max(b.w,b.h));let kept=0;
          for(const z of points){
            if(!alive()||now()>until)break;
            const k=[aa,ba,z.w.toFixed(2),z.h.toFixed(2)].join(':');if(seen.has(k))continue;
            if(!validPair(A,B,z.x,z.y,G))continue;seen.add(k);
            found.push({w:z.w,h:z.h,area:2*t.area,subs:[{mark:t.mark,o:A,x:-z.X,y:-z.Y},{mark:t.mark,o:B,x:z.x-z.X,y:z.y-z.Y}]});
            if(++kept>=2)break;
          }
        }
        found.sort((a,b)=>a.w*a.h-b.w*b.h||Math.max(a.w,a.h)-Math.max(b.w,b.h));
        const out=[];for(const z of found)if(!out.some(q=>Math.abs(q.w-z.w)<.1&&Math.abs(q.h-z.h)<.1)){out.push(z);if(out.length===6)break;}
        return out;
      }
      function unitsFor(iter){
        const units=[];
        for(const t of parts.values()){
          let n=0;const variants=bank.get(t.mark)||[],base=orient(t,0,'');
          while(n<t.qty){
            const pair=n+1<t.qty&&variants.length&&iter%5!==4&&rnd()<(iter%5===0?1:.75);
            const v=pair?variants[Math.floor(rnd()*Math.min(variants.length,iter%3===0?1:4))]:null;
            if(v&&v.w*v.h<2*base.w*base.h*.985){units.push({...v,key:t.mark+'#'+n+'p',rank:(seedRanks.get(t.mark)||[])[n]||0});n+=2;}
            else{units.push({w:base.w,h:base.h,area:t.area,subs:[{mark:t.mark,o:base,x:0,y:0}],key:t.mark+'#'+n,rank:(seedRanks.get(t.mark)||[])[n]||0});n++;}
          }
        }
        return units;
      }
      // T50: the validated imported champion is a real portfolio member.
      // T49 used it only to derive ordering ranks, so thousands of global restarts
      // could run without ever polishing the layout that was already best.
      if(working&&verify(working)){
        const seedUnits=[];
        for(const t of parts.values()){
          const base=orient(t,0,''),ranks=seedRanks.get(t.mark)||[];
          for(let n=0;n<t.qty;n++)seedUnits.push({w:base.w,h:base.h,area:t.area,subs:[{mark:t.mark,o:base,x:0,y:0}],key:t.mark+'#seed'+n,rank:Number(ranks[n])||9e15+n});
        }
        seedUnits.sort((a,b)=>a.rank-b.rank);
        elite.push({units:seedUnits,q:quality(working),key:'imported-champion',s:copy(working)});
        stats.globalImportedElite=1;stats.globalPopulation=elite.length;nextPolish=now()+2500;
      }
      function orientationsOf(u){
        const out=[];for(const a of [0,90,180,270]){
          if(!u.subs.every(s=>allowed(angle(s.o.a+a))))continue;
          const r=a/90;out.push({w:r%2?u.h:u.w,h:r%2?u.w:u.h,subs:u.subs.map(s=>{
            const o=orient(parts.get(s.mark),s.o.a+a,s.o.m);let x=s.x,y=s.y;
            if(r===1){x=u.h-s.y-s.o.h;y=s.x;}else if(r===2){x=u.w-s.x-s.o.w;y=u.h-s.y-s.o.h;}else if(r===3){x=s.y;y=u.w-s.x-s.o.w;}
            return{...s,o,x,y};
          })});
        }return out;
      }
      const rotCache=new WeakMap();
      function pack(units,heur,until){
        const bins=stocks.map(s=>{const G=Math.max(.001,s.G);return {...s,G,placed:[],F:0,free:[{x:0,y:0,w:s.W+G,h:s.H+G}]};});
        const queue=units.slice();for(let ui=0;ui<queue.length;ui++){const u=queue[ui];
          if(!alive()||now()>until)return null;
          let vv=rotCache.get(u);if(!vv){vv=orientationsOf(u);rotCache.set(u,vv);}
          let chosen=null;
          for(const sh of bins){
            for(const f of sh.free)for(const v of vv){
              const rw=v.w+sh.G,rh=v.h+sh.G;if(rw>f.w+1e-6||rh>f.h+1e-6)continue;
              const ss=Math.min(f.w-rw,f.h-rh),ls=Math.max(f.w-rw,f.h-rh),area=f.w*f.h-rw*rh;
              const score=heur===0?ss*1e9+ls*1e5+f.x*10+f.y:heur===1?area*1e5+ss*100+f.x:heur===2?Math.max(sh.F,f.x+v.w)*1e9+ss*1000+f.y:(f.x+v.w)*1e9+f.y*100+ss;
              if(!chosen||score<chosen.score)chosen={sh,v,x:f.x,y:f.y,rw,rh,score};
            }
            if(chosen)break;
          }
          if(!chosen){
            if(!msg.allowPartial)return null;
            // A compound may not fit while either member fits a remaining cavity.
            if(u.subs.length>1)for(const item of u.subs)queue.push({key:item.mark,rank:u.rank,w:item.o.w,h:item.o.h,area:item.o.area,subs:[{...item,x:0,y:0}]});
            continue;
          }
          const {sh,v,x,y,rw,rh}=chosen,next=[];
          for(const f of sh.free){
            if(x>=f.x+f.w-1e-8||x+rw<=f.x+1e-8||y>=f.y+f.h-1e-8||y+rh<=f.y+1e-8){next.push(f);continue;}
            if(x>f.x+1e-8)next.push({...f,w:x-f.x});
            if(x+rw<f.x+f.w-1e-8)next.push({...f,x:x+rw,w:f.x+f.w-x-rw});
            if(y>f.y+1e-8)next.push({...f,h:y-f.y});
            if(y+rh<f.y+f.h-1e-8)next.push({...f,y:y+rh,h:f.y+f.h-y-rh});
          }
          sh.free=next.filter((a,i)=>a.w>1e-7&&a.h>1e-7&&!next.some((b,j)=>i!==j&&b.x<=a.x+1e-8&&b.y<=a.y+1e-8&&b.x+b.w>=a.x+a.w-1e-8&&b.y+b.h>=a.y+a.h-1e-8&&(j<i||b.w*b.h>a.w*a.h+1e-6))).slice(0,600);
          for(const s of v.subs)sh.placed.push({...s,id:unique++,x:x+s.x,y:y+s.y});sh.F=Math.max(sh.F,x+v.w);
        }
        return bins;
      }
      // Full restart using polygon contacts. Rectangles index space only; every placement
      // is checked against original contours, and can interlock with existing contours.
      async function trueShapeRestart(units,until){
        const cell=220,bins=stocks.map(s=>({...s,placed:[],grid:new Map(),F:0}));
        const getNearby=(sh,o,x,y)=>{
          const ids=new Set(),out=[];
          for(let ix=Math.floor((x-sh.G)/cell);ix<=Math.floor((x+o.w+sh.G)/cell);ix++)for(let iy=Math.floor((y-sh.G)/cell);iy<=Math.floor((y+o.h+sh.G)/cell);iy++)
            for(const p of sh.grid.get(ix+','+iy)||[])if(!ids.has(p.id)){ids.add(p.id);out.push(p);}
          return out;
        };
        const fits=(sh,o,x,y)=>x>=-1e-6&&y>=-1e-6&&x+o.w<=sh.W+1e-6&&y+o.h<=sh.H+1e-6&&getNearby(sh,o,x,y).every(p=>validPair(p.o,o,x-p.x,y-p.y,sh.G));
        const put=(sh,p)=>{
          sh.placed.push(p);sh.F=Math.max(sh.F,p.x+p.o.w);
          for(let ix=Math.floor(p.x/cell);ix<=Math.floor((p.x+p.o.w)/cell);ix++)for(let iy=Math.floor(p.y/cell);iy<=Math.floor((p.y+p.o.h)/cell);iy++){
            const k=ix+','+iy;if(!sh.grid.has(k))sh.grid.set(k,[]);sh.grid.get(k).push(p);
          }
        };
        const items=units.flatMap(u=>u.subs),pass=stats.trueShapeRestarts||0;
        for(let pi=0;pi<items.length;pi++){
          if(!alive()||now()>until){stats.trueShapeTimedOut=true;return null;}
          const item=items[pi],t=parts.get(item.mark);let found=null;
          for(const sh of bins){
            let best=null;
            const aa=[item.o.a,angle(item.o.a+180),angle(item.o.a+90),angle(item.o.a+270)];let tried=0;
            for(const a of [...new Set(aa.map(angle))]){
              if(!allowed(a)||!alive()||now()>until)continue;
              const o=orient(t,a,item.o.m);if(o.w>sh.W||o.h>sh.H)continue;if(++tried>2)break;
              const candidates=[{x:0,y:0},{x:0,y:sh.H-o.h}],seen=new Set();
              const hosts=sh.placed.slice().sort((a,b)=>a.x-b.x||a.y-b.y);
              // Bbox anchors are proposals only; compound gaps remain accessible.
              for(const h of hosts){
                candidates.push({x:h.x+h.o.w+sh.G,y:h.y},{x:h.x+h.o.w+sh.G,y:h.y+h.o.h-o.h},{x:h.x,y:h.y+h.o.h+sh.G},{x:h.x+h.o.w-o.w,y:h.y+h.o.h+sh.G});
              }
              const score=p=>Math.max(sh.F,p.x+o.w)*1e7+(pass%2?p.x*100+p.y:p.x+p.y*.08);
              candidates.sort((a,b)=>score(a)-score(b));
              for(const p of candidates){
                if(p.x<0||p.y<0||p.x+o.w>sh.W||p.y+o.h>sh.H)continue;
                if(best&&score(p)>=best.score)continue;
                if(fits(sh,o,p.x,p.y))best={...item,o,x:p.x,y:p.y,score:score(p)};
              }
              // Contact vertices and wall intersections from spatially distributed hosts.
              const selected=[];
              for(const h of sh.placed.slice().reverse())if(h.mark===item.mark&&selected.length<2)selected.push(h);
              for(const h of sh.placed.slice(-2))if(!selected.includes(h))selected.push(h);
              const contacts=[];
              for(const h of selected){
                if(!alive()||now()>until){stats.trueShapeTimedOut=true;return null;}
                const nf=nfp(h.o,o,sh.G);
                for(const poly of nf.ps)for(let k=0;k<poly.length;k++){
                  const p=poly[k],q=poly[(k+1)%poly.length];contacts.push({x:h.x+p.x,y:h.y+p.y});
                  for(const wall of [0,sh.H-o.h])if(Math.abs(q.y-p.y)>1e-10){const u=(wall-h.y-p.y)/(q.y-p.y);if(u>=0&&u<=1)contacts.push({x:h.x+p.x+u*(q.x-p.x),y:wall});}
                  if(Math.abs(q.x-p.x)>1e-10){const u=(-h.x-p.x)/(q.x-p.x);if(u>=0&&u<=1)contacts.push({x:0,y:h.y+p.y+u*(q.y-p.y)});}
                }
              }
              contacts.sort((a,b)=>score(a)-score(b));
              for(const p of contacts){
                if(!alive()||now()>until){stats.trueShapeTimedOut=true;return null;}
                if(p.x<0||p.y<0||p.x+o.w>sh.W||p.y+o.h>sh.H||best&&score(p)>=best.score)continue;
                const k=p.x.toFixed(3)+','+p.y.toFixed(3);if(seen.has(k))continue;seen.add(k);
                if(fits(sh,o,p.x,p.y))best={...item,o,x:p.x,y:p.y,score:score(p)};
              }
            }
            if(best){
              // Safe endpoint bisection is a proposal heuristic, not a claim that concave
              // free space is monotone. Every accepted endpoint is checked exactly.
              let lo=0,hi=best.x;
              if(fits(sh,best.o,0,best.y))hi=0;
              else for(let k=0;k<16&&hi-lo>.02;k++){const x=(lo+hi)/2;if(fits(sh,best.o,x,best.y))hi=x;else lo=x;}
              put(sh,{...best,id:unique++,x:hi});found=true;break;
            }
          }
          if(!found){stats.trueShapeNoFit=item.mark;if(msg.allowPartial)continue;return null;}
          stats.trueShapePlaced=pi+1;
          if(pi%8===0){beat();await tick();}
        }
        return bins;
      }

      while(alive()){
        if(pairIndex<types.length){
          const t=types[pairIndex++];stats.phase='T49 · exact pair contacts';
          const variants=pairVariants(t,Math.min(end,now()+500));if(variants.length){bank.set(t.mark,variants);stats.pairFamilies=bank.size;stats.pairVariants=(stats.pairVariants||0)+variants.length;
            if(msg.pairTests)post('pairs',{mark:t.mark,variants:variants.map(v=>({w:v.w,h:v.h,area:v.area,subs:v.subs.map(s=>({mark:s.mark,x:s.x,y:s.y,angle:s.o.a}))}))});
          }beat(true);await tick();
          if(msg.pairTests){if(pairIndex===types.length)return;continue;}
        }
        serial++;stats.globalRestarts=serial;stats.trueShapeLargeJobSkipped=total>120;stats.phase='T49 · rebuild all sheets #'+serial;
        let units;
        if(elite.length&&serial%3!==0){units=elite[Math.floor(rnd()*elite.length)].units.slice();
          const count=Math.max(2,Math.floor(units.length*(serial%7===0?.25:.035)));
          for(let j=0;j<count;j++){const a=Math.floor(rnd()*units.length),b=Math.floor(rnd()*units.length);[units[a],units[b]]=[units[b],units[a]];}
          if(serial%4===0){const a=Math.floor(rnd()*units.length),block=units.splice(a,Math.max(2,Math.floor(units.length*.1)));units.splice(Math.floor(rnd()*(units.length+1)),0,...block.reverse());}
        }else{
          units=unitsFor(serial);const jitter=new Map(units.map(u=>[u,rnd()]));
          const score=u=>msg.allowPartial&&serial%12===3?-u.area/u.subs.length:msg.allowPartial&&serial%12===9?-u.w*u.h/u.subs.length:serial%12===0?-u.rank:serial%6===0?u.area:serial%6===1?u.w*u.h:serial%6===2?Math.max(u.w,u.h):serial%6===3?u.area*(.6+jitter.get(u)*.8):serial%6===4?u.area/Math.min(u.w,u.h):u.area*(.15+jitter.get(u)*1.7);
          units.sort((a,b)=>score(b)-score(a));
        }
        const trial=pack(units,serial%4,Math.min(end,now()+2500));
        if(trial){const q=quality(trial);if(q.failed===0)stats.globalComplete=(stats.globalComplete||0)+1;else stats.globalPartial=(stats.globalPartial||0)+1;stats.globalBestPlaced=Math.max(stats.globalBestPlaced||0,total-q.failed);if(q.span>0&&(!stats.bestFreshSpan||q.span<stats.bestFreshSpan||q.span===stats.bestFreshSpan&&stocks[q.span-1].W-q.tail>stats.bestFreshRemain)){stats.bestFreshSpan=q.span;stats.bestFreshRemain=stocks[q.span-1].W-q.tail;}
          const key=units.map(u=>u.key+':'+u.w.toFixed(2)+','+u.h.toFixed(2)).join('|')+':'+serial%4;
          if(!elite.some(e=>e.key===key)){elite.push({units:units.slice(),q,key,s:copy(trial)});elite.sort((a,b)=>better(a.q,b.q)?-1:better(b.q,a.q)?1:0);if(elite.length>8)elite.pop();}
          if(better(q,bq)&&publish(trial)){stats.globalWins=(stats.globalWins||0)+1;working=copy(trial);}
          stats.globalPopulation=elite.length;
        }else stats.globalIncomplete=(stats.globalIncomplete||0)+1;
        if(total<=120&&alive()&&now()>=nextTrue){
          stats.trueShapeRestarts=(stats.trueShapeRestarts||0)+1;stats.trueShapePlaced=0;stats.trueShapeTimedOut=false;stats.trueShapeNoFit='';stats.phase='T49 · blank polygon contact restart';
          const source=elite.length?elite[(stats.trueShapeRestarts-1)%Math.min(4,elite.length)].units:units;
          const shape=await trueShapeRestart(source,Math.min(end,now()+trueBudget));
          if(stats.trueShapeTimedOut)trueBudget=Math.min(45000,Math.max(12000,trueBudget*total/Math.max(1,stats.trueShapePlaced)*1.1));
          if(shape&&verify(shape)){
            stats.trueShapeComplete=(stats.trueShapeComplete||0)+1;
            const q=quality(shape),key='true:'+stats.trueShapeRestarts;
            elite.push({units:source.slice(),q,key,s:copy(shape)});elite.sort((a,b)=>better(a.q,b.q)?-1:better(b.q,a.q)?1:0);if(elite.length>8)elite.pop();
            if(publish(shape)){stats.globalWins=(stats.globalWins||0)+1;working=copy(shape);}
          }
          nextTrue=now()+15000;
        }
        if(alive()&&now()>=nextPolish&&elite.length){
          const entry=elite[polishSerial++%Math.min(3,elite.length)],until=Math.min(end,now()+6000);let candidate=copy(entry.s);round++;
          stats.globalPolishAttempts=(stats.globalPolishAttempts||0)+1;stats.phase='T50 · champion polish + closure';
          await fastSlide(candidate,Math.min(until,now()+1000));
          const cq=quality(candidate),cli=cq.span-1,ctail=cli>=0?candidate[cli].placed.length:0;
          if(ctail>0&&ctail<=48&&alive()){
            const closed=await closeTailChain(candidate,Math.min(until,now()+2600));if(closed)candidate=closed;
          }else await absorb(candidate,Math.min(until,now()+1900));
          const li=quality(candidate).span-1;if(li>=0)await compact(candidate,li,until);
          if(verify(candidate)){
            const q=quality(candidate);
            if(better(q,entry.q)){entry.s=copy(candidate);entry.q=q;stats.globalPolishGains=(stats.globalPolishGains||0)+1;}
            if(publish(candidate)){stats.globalWins=(stats.globalWins||0)+1;working=copy(candidate);}
          }
          nextPolish=now()+4200;
        }
        beat();await tick();
      }
    }

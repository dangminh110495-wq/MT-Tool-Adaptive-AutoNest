/* Review excerpt from MT-Tool T50 public build. Not standalone; depends on TRUE-NFP worker state. */
    async function targetedTail(base,until){
      const s=copy(base),last=quality(s).span-1;if(last<0)return null;const sh=s[last],F=front(sh),gain=[20,50,100,200][round%4],cap=Math.max(1,F-gain),removed=sh.placed.filter(p=>p.x+p.o.w>cap+1e-6);
      if(!removed.length||removed.length>60)return null;stats.phase='NFP target strip';stats.targetAttempts++;stats.targetRemain=sh.W-cap;const ids=new Set(removed.map(p=>p.id));sh.placed=sh.placed.filter(p=>!ids.has(p.id));
      const order=removed.slice().sort((a,b)=>b.o.area-a.o.area);
      for(const p of order){if(!alive()||now()>until)return null;let z=null;
        for(let si=0;si<=last;si++){z=find(s[si],p,si===last?cap:s[si].W,Math.min(until,now()+450),round,true);if(z){s[si].placed.push(z);break;}}
        if(!z)return null;beat();await tick();
      }stats.targetWins++;return s;
    }
    let closureSerial=0;
    function closureExchangeSites(sh,obj,until,iteration){
      const t=parts.get(obj.mark),found=[],seenPos=new Set(),seenBlock=new Set(),maxArea=obj.o.area*3.2,maxBlockers=5;
      const sortedSmall=sh.placed.slice().sort((a,b)=>a.o.area-b.o.area),sortedRight=sh.placed.slice().sort((a,b)=>b.x+b.o.w-a.x-a.o.w),sample=[],ids=new Set();
      const addHost=h=>{if(h&&!ids.has(h.id)){ids.add(h.id);sample.push(h);}};
      // Keep this candidate bank bounded. T49's generic ejection walks every NFP
      // contact of every host, which is excellent for small jobs but can consume
      // the whole late-game budget on 200+ part sheets.
      for(const h of sortedSmall.slice(0,72))addHost(h);
      for(const h of sortedRight.slice(0,36))addHost(h);
      const stride=Math.max(1,Math.floor(sh.placed.length/36));
      for(let i=(iteration%stride);i<sh.placed.length;i+=stride)addHost(sh.placed[i]);
      for(const az of angles(t,sh,obj.o,iteration,false).slice(0,4)){
        if(!alive()||now()>until)break;
        const o=orient(t,az.a,az.m);if(o.w>sh.W||o.h>sh.H)continue;
        const candidates=[{x:0,y:0},{x:0,y:sh.H-o.h},{x:sh.W-o.w,y:0}];
        for(const h of sample){
          // Replacement/ejection anchors plus clean bbox contacts. Bboxes only
          // propose coordinates; every blocker decision below uses exact polygons.
          candidates.push(
            {x:h.x,y:h.y},{x:h.x+h.o.w-o.w,y:h.y},
            {x:h.x,y:h.y+h.o.h-o.h},{x:h.x+h.o.w-o.w,y:h.y+h.o.h-o.h},
            {x:h.x+h.o.w+sh.G,y:h.y},{x:h.x-o.w-sh.G,y:h.y},
            {x:h.x,y:h.y+h.o.h+sh.G},{x:h.x,y:h.y-o.h-sh.G}
          );
        }
        for(const q of candidates){
          if(!alive()||now()>until)break;
          const x=q.x,y=q.y;if(x<0||y<0||x+o.w>sh.W+1e-7||y+o.h>sh.H+1e-7)continue;
          const pk=Math.round(x*2)+','+Math.round(y*2)+','+o.a+','+o.m;if(seenPos.has(pk))continue;seenPos.add(pk);
          let area=0;const blockers=[];
          for(const h of sh.placed){
            if(h.x+h.o.w+sh.G<x||h.y+h.o.h+sh.G<y||x+o.w+sh.G<h.x||y+o.h+sh.G<h.y)continue;
            if(!validPair(h.o,o,x-h.x,y-h.y,sh.G)){
              blockers.push(h);area+=h.o.area;
              if(area>maxArea||blockers.length>maxBlockers)break;
            }
          }
          if(!blockers.length||area>maxArea||blockers.length>maxBlockers)continue;
          const bk=blockers.map(h=>h.id).sort((a,b)=>a-b).join(',');if(seenBlock.has(bk))continue;seenBlock.add(bk);
          found.push({score:area/obj.o.area+.08*blockers.length+x/sh.W*.03,blockers,z:{...obj,o,x,y}});
        }
      }
      found.sort((a,b)=>a.score-b.score);return found.slice(0,12);
    }
    async function closeTailChain(base,until){
      const q0=quality(base),last=q0.span-1;if(last<1||!base[last].placed.length)return null;
      let s=copy(base),moved=0,attempted=0;const pass=closureSerial++;
      stats.phase='T50 · last-sheet closure';stats.closureAttempts=(stats.closureAttempts||0)+1;
      if(!Number.isFinite(stats.closureInitialTail))stats.closureInitialTail=s[last].placed.length;
      const targetCount=s[last].placed.length;
      const headOrder=()=>{
        const a=s.slice(0,last).map((h,i)=>({i,slack:Math.max(0,h.W-front(h))*h.H})).sort((a,b)=>b.slack-a.slack);
        // Rotate a little between passes so a permanently difficult sheet cannot
        // monopolise the short closure budget.
        const r=a.length?(pass%Math.min(a.length,4)):0;return a.slice(r).concat(a.slice(0,r)).map(z=>z.i);
      };
      // The worker quality already rewards smaller tail area. Therefore each
      // safely evacuated instance is publishable even when final max-X is still
      // unchanged. This is the key to making progress on 14 identical tail parts.
      while(alive()&&now()<until&&s[last].placed.length&&moved<Math.min(12,targetCount)){
        const ordered=s[last].placed.slice().sort((a,b)=>b.x+b.o.w-a.x-a.o.w||a.o.area-b.o.area);
        const p=ordered[(pass+attempted)%ordered.length];attempted++;let committed=false;
        // Short direct transfer first; previous ejections may have opened a cavity.
        for(const hi of headOrder().slice(0,Math.min(5,last))){
          if(!alive()||now()>until)break;
          const z=find(s[hi],p,s[hi].W,Math.min(until,now()+90),round+pass+attempted,false);
          if(z){s[hi].placed.push(z);s[last].placed=s[last].placed.filter(q=>q.id!==p.id);moved++;stats.closureDirect=(stats.closureDirect||0)+1;committed=true;break;}
        }
        if(committed){beat();await tick();continue;}
        // T49 generic exchange allowed only ~1.05x the incoming area and returned
        // after one exchange. For tiny repeated tails that often means zero legal
        // attempt forever. T50 allows a bounded local ejection but commits only
        // after every displaced ORIGINAL contour has been exactly reinserted on
        // an earlier sheet — never by hiding the blocker on the tail sheet.
        search: for(const hi of headOrder().slice(0,Math.min(6,last))){
          if(!alive()||now()>until)break;
          const sites=closureExchangeSites(s[hi],p,Math.min(until,now()+220),round+pass+attempted);
          for(const site of sites.slice(0,4)){
            if(!alive()||now()>until)break search;
            stats.closureSites=(stats.closureSites||0)+1;
            const cand=copy(s),ids=new Set(site.blockers.map(q=>q.id));
            cand[last].placed=cand[last].placed.filter(q=>q.id!==p.id);
            cand[hi].placed=cand[hi].placed.filter(q=>!ids.has(q.id));cand[hi].placed.push(site.z);
            let ok=true;const pool=site.blockers.slice().sort((a,b)=>b.o.area-a.o.area);
            const receivers=cand.slice(0,last).map((h,i)=>({i,slack:Math.max(0,h.W-front(h))*h.H})).sort((a,b)=>b.slack-a.slack).map(z=>z.i);
            for(const out of pool){
              let z=null;
              for(const si of receivers.slice(0,Math.min(6,last))){
                if(!alive()||now()>until){ok=false;break;}
                z=find(cand[si],out,cand[si].W,Math.min(until,now()+95),round+pass+attempted,false);
                if(z){cand[si].placed.push(z);break;}
              }
              if(!z){ok=false;break;}await tick();
            }
            if(ok&&verify(cand)){s=cand;moved++;stats.closureEjections=(stats.closureEjections||0)+1;committed=true;break search;}
          }
        }
        if(!committed&&attempted>=Math.max(7,s[last].placed.length*2))break;
        beat();await tick();
      }
      if(moved){
        stats.closureMoved=(stats.closureMoved||0)+moved;
        stats.closureBestTail=Math.min(stats.closureBestTail??1e9,s[last].placed.length);
        return s;
      }
      return null;
    }
    const exchangeTried=new Map();
    function exchangeSites(sh,obj,until,iteration){
      const found=[],dedup=new Set(),t=parts.get(obj.mark),maxArea=obj.o.area*1.05;
      for(const az of angles(t,sh,obj.o,iteration,true)){
        if(!alive()||now()>until)break;const o=orient(t,az.a,az.m);if(o.w>sh.W||o.h>sh.H)continue;
        const candidates=[{x:0,y:0},{x:sh.W-o.w,y:0},{x:0,y:sh.H-o.h}];
        for(const h of sh.placed){
          if(!alive()||now()>until)break;
          for(const p of nfp(h.o,o,sh.G).ps){const stride=Math.max(1,Math.floor(p.length/18));for(let i=0;i<p.length;i+=stride)candidates.push({x:h.x+p[i].x,y:h.y+p[i].y});}
          candidates.push({x:h.x,y:h.y},{x:h.x+h.o.w-o.w,y:h.y},{x:h.x,y:h.y+h.o.h-o.h});
        }
        // Contact candidates are tested against original contours. Bounding
        // rectangles only identify which hosts need the polygon gap test.
        for(const p of candidates){
          if(!alive()||now()>until)break;const x=p.x,y=p.y;if(x<0||y<0||x+o.w>sh.W+1e-7||y+o.h>sh.H+1e-7)continue;
          let area=0;const blockers=[];
          for(const h of sh.placed){
            if(h.x+h.o.w+sh.G<x||h.y+h.o.h+sh.G<y||x+o.w+sh.G<h.x||y+o.h+sh.G<h.y)continue;
            if(!validPair(h.o,o,x-h.x,y-h.y,sh.G)){blockers.push(h);area+=h.o.area;if(area>maxArea||blockers.length>4)break;}
          }
          if(!blockers.length||area>maxArea||blockers.length>4)continue;
          const key=blockers.map(h=>h.id).sort((a,b)=>a-b).join(',');if(dedup.has(key))continue;dedup.add(key);
          const score=area/obj.o.area+.07*blockers.length;
          found.push({score,blockers,z:{...obj,o,x,y}});
        }
      }
      return found.sort((a,b)=>a.score-b.score).slice(0,18);
    }
    async function exchange(base,until){
      const last=quality(base).span-1;if(last<1)return null;
      const tail=base[last],ordered=tail.placed.slice().sort((a,b)=>b.x+b.o.w-a.x-a.o.w),uniqueTypes=new Set();
      stats.phase='NFP ejection chain';stats.exchangeAttempts=(stats.exchangeAttempts||0)+1;
      for(const p of ordered){
        if(now()>until||!alive())return null;if(uniqueTypes.has(p.mark))continue;uniqueTypes.add(p.mark);if(round-(exchangeTried.get(p.mark)??-100)<3)continue;exchangeTried.set(p.mark,round);
        for(let hi=0;hi<last;hi++){
          const sites=exchangeSites(base[hi],p,Math.min(until,now()+1200),round);
          for(const site of sites.slice(0,8)){
            if(now()>until||!alive())return null;stats.exchangeSites=(stats.exchangeSites||0)+1;
            const s=copy(base),ids=new Set(site.blockers.map(q=>q.id));s[last].placed=s[last].placed.filter(q=>q.id!==p.id);s[hi].placed=s[hi].placed.filter(q=>!ids.has(q.id));s[hi].placed.push(site.z);
            const cap=front(tail),pool=site.blockers.slice().sort((a,b)=>b.o.area-a.o.area);let ok=true;
            for(const out of pool){
              let z=null;for(const si of [...s.slice(0,last).map((_,i)=>i),last]){
                z=find(s[si],out,si===last?cap:s[si].W,Math.min(until,now()+200),round,true);if(z){s[si].placed.push(z);break;}
              }
              if(!z){ok=false;break;}await tick();
            }
            if(ok){stats.exchangeComplete=(stats.exchangeComplete||0)+1;return s;}beat();await tick();
          }
        }
      }return null;
    }

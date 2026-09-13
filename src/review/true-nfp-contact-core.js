/* Review excerpt from MT-Tool T50 public build. Not standalone; depends on MT-Tool globals. */
    function nativeNfp(A,B,g){
      // MinkowskiSumD sweeps ALL boundary edge pairs in C++/WASM. Its winding
      // can leave containment-only holes: add A-b0 and a0-B to cover both
      // containment cases. These additions do not fill genuine free pockets.
      const neg=B.poly.map(p=>({x:-p.x,y:-p.y})),a=path(A.poly),b=path(neg);let sum;
      try{
        sum=C.MinkowskiSumD(b,a,true,4);
        const all=readPaths(sum);
        all.push(shift(A.poly,neg[0].x,neg[0].y));
        all.push(shift(neg,A.poly[0].x,A.poly[0].y));
        return unionInflate(all,g+.025);
      }finally{if(sum)sum.delete();a.delete();b.delete();}
    }
    function nfp(A,B,g){const key=A.id+'>'+B.id+'#'+g.toFixed(5);if(nfpCache.has(key)){stats.nfpHits++;return nfpCache.get(key);}
      const reverse=nfpCache.get(B.id+'>'+A.id+'#'+g.toFixed(5));if(reverse){stats.nfpHits++;return{ps:reverse.ps.map(p=>p.map(q=>({x:-q.x,y:-q.y}))),count:reverse.count};}
      const ps=nativeNfp(A,B,g),count=ps.reduce((s,p)=>s+p.length,0);if(!ps.length)throw Error('Empty NFP');
      nfpCache.set(key,{ps,count});cachedPoints+=count;stats.nfpBuilt++;
      while(nfpCache.size>6000||cachedPoints>650000){const k=nfpCache.keys().next().value;cachedPoints-=nfpCache.get(k).count;nfpCache.delete(k);}return{ps,count};
    }
    const on=(a,b,p)=>Math.abs(cross(a,b,p))<1e-8&&p.x>=Math.min(a.x,b.x)-1e-8&&p.x<=Math.max(a.x,b.x)+1e-8&&p.y>=Math.min(a.y,b.y)-1e-8&&p.y<=Math.max(a.y,b.y)+1e-8;
    function intersects(a,b,c,d){const u=cross(a,b,c),v=cross(a,b,d),w=cross(c,d,a),z=cross(c,d,b);return (((u>1e-8&&v< -1e-8)||(u< -1e-8&&v>1e-8))&&((w>1e-8&&z< -1e-8)||(w< -1e-8&&z>1e-8)))||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b);}
    function inside(p,poly){let v=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)v=!v;}return v;}
    function dist(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,L=dx*dx+dy*dy,t=L?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/L)):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
    function validPair(A,B,x,y,g){stats.checks++;
      const dx=Math.max(x-A.w,-x-B.w,0),dy=Math.max(y-A.h,-y-B.h,0);if(Math.hypot(dx,dy)>g+1e-7)return true;
      if(WX&&A.wp&&B.wp&&g>0&&WX.poly_valid_gap(A.wp,A.poly.length,B.wp,B.poly.length,x,y,g))return true;
      // Recheck borderline WASM rejects in double precision: existing layouts
      // may sit at exactly 5 mm with sub-micron floating-point roundoff.
      const b=shift(B.poly,x,y),a=A.poly;
      for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){const p=a[i],q=a[(i+1)%a.length],r=b[j],s=b[(j+1)%b.length];if(intersects(p,q,r,s)||Math.min(dist(p,r,s),dist(q,r,s),dist(r,p,q),dist(s,p,q))<g-1e-6)return false;}
      return !inside(a[0],b)&&!inside(b[0],a);
    }
    function valid(sh,o,x,y,cap=sh.W){if(x< -1e-6||y< -1e-6||x+o.w>cap+1e-6||y+o.h>sh.H+1e-6)return false;for(const h of sh.placed)if(!validPair(h.o,o,x-h.x,y-h.y,sh.G))return false;return true;}
    const front=sh=>sh.placed.reduce((v,p)=>Math.max(v,p.x+p.o.w),0);
    function angles(t,sh,preferred,round,deep){const arr=[],seen=new Set();const add=(a,m)=>{a=angle(a);m=mirror(m);if(m&&!mirrorAllowed)return;const k=a+'#'+m;if(!seen.has(k)){seen.add(k);arr.push({a,m});}};
      const allowed=a=>mode==='free'||mode==='90'&&Math.abs(a/90-Math.round(a/90))<1e-6||mode==='180'&&Math.abs(a/180-Math.round(a/180))<1e-6||mode==='0'&&a===0;
      if(preferred&&allowed(preferred.a))add(preferred.a,preferred.m);
      const base=mode==='0'?[0]:mode==='180'?[0,180]:[0,90,180,270];for(const a of base)add(a,'');
      if(mode==='free')for(const a of t.edge.slice(0,deep?3:1))for(const b of [0,90])add(b-a,'');
      if(mirrorAllowed)for(const z of arr.slice())add(z.a,'lr');
      if(mode==='free'&&deep){
        const hosts=sh.placed.slice().sort((a,b)=>b.x+b.o.w-a.x-a.o.w).slice(0,3);
        for(const h of hosts){const ht=parts.get(h.mark);for(const a of t.edge.slice(0,2))for(const b of ht.edge.slice(0,2)){const target=h.o.a+(h.o.m==='lr'?180-b:h.o.m==='tb'?-b:b);add(target-a,'');if(mirrorAllowed)add(target-(180-a),'lr');}}
        if(preferred)for(const d of [-2,-.5,.5,2])add(preferred.a+d,preferred.m);
      }
      // Limited orientations per pass, with rotating exploration slots; no NFP
      // boundary truncation. Repeated passes cover more contacts and angles.
      const keep=deep?18:10;if(arr.length<=keep)return arr;
      const head=arr.slice(0,5),rest=arr.slice(5),start=(round*7)%rest.length;
      const needed=keep-head.length;for(let i=0;i<needed;i++)head.push(rest[(start+i)%rest.length]);return head;
    }
    // Bound the search region in translation space. Bboxes only reject distant
    // obstacles; every intersecting concave NFP participates in the difference.
    function feasible(sh,o,cap,deadline,window=null){
      const L=Math.max(0,window?window.x:0),B=Math.max(0,window?window.y:0),R=Math.min(cap-o.w,window?window.X:Infinity),T=Math.min(sh.H-o.h,window?window.Y:Infinity);
      if(R<L-1e-7||T<B-1e-7)return[];if(!sh.placed.length)return[{x:L,y:B}];const clips=[];
      for(const host of sh.placed){
        if(now()>deadline||!alive())return null;const g=sh.G+.026;
        if(host.x-o.w-g>R||host.x+host.o.w+g<L||host.y-o.h-g>T||host.y+host.o.h+g<B)continue;
        const nf=nfp(host.o,o,sh.G);for(const p of nf.ps)clips.push(shift(p,host.x,host.y));
      }
      const out=R-L>1e-7&&T-B>1e-7?subtract([rect(L,B,R-L,T-B)],clips).flat():[];stats.feasible++;
      // Boundary-only fits are still possible when a part spans the whole width
      // or height. Intersect NFP edges with the admissible line, then validate.
      if(R-L<=1e-7||T-B<=1e-7){
        out.push({x:L,y:B},{x:R,y:T});
        for(const p of clips)for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];
          if(R-L<=1e-7&&(a.x-L)*(b.x-L)<=0&&a.x!==b.x){const t=(L-a.x)/(b.x-a.x),y=a.y+t*(b.y-a.y);if(y>=B&&y<=T)out.push({x:L,y});}
          if(T-B<=1e-7&&(a.y-B)*(b.y-B)<=0&&a.y!==b.y){const t=(B-a.y)/(b.y-a.y),x=a.x+t*(b.x-a.x);if(x>=L&&x<=R)out.push({x,y:B});}
        }
      }
      return out;
    }
    // T45.2: once a feasible polygon position is found, snap it onto the REAL
    // inflated-NFP boundary. This removes the remaining "bbox-looking" air
    // gaps caused by choosing only boolean-region vertices. Every snapped point
    // is revalidated against all original polygons before it can be accepted.
    function snapNfpContact(sh,o,x,y,cap,deadline){
      if(!Number.isFinite(x)||!Number.isFinite(y)||!valid(sh,o,x,y,cap))return{x,y};
      const EPSC=1e-6;
      const xCandidates=(cy,cx)=>{
        const vals=[0];
        for(const host of sh.placed){
          if(!alive()||now()>deadline)break;
          const Y=cy-host.y,nf=nfp(host.o,o,sh.G);
          for(const poly of nf.ps){for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],d0=a.y-Y,d1=b.y-Y;if(d0*d1>EPSC)continue;
            if(Math.abs(b.y-a.y)<1e-10){if(Math.abs(d0)<=EPSC){vals.push(host.x+a.x,host.x+b.x);}continue;}
            const t=(Y-a.y)/(b.y-a.y);if(t>=-EPSC&&t<=1+EPSC)vals.push(host.x+a.x+t*(b.x-a.x));
          }}
        }
        vals.sort((a,b)=>a-b);let best=cx,last=-Infinity;
        for(let v of vals){if(!Number.isFinite(v)||v<-EPSC||v>cx+EPSC||v-last<1e-5)continue;last=v;v=Math.max(0,v);if(v+o.w>cap+EPSC)continue;if(valid(sh,o,v,cy,cap)){best=v;break;}}
        return best;
      };
      const yCandidates=(cx,cy)=>{
        const vals=[0];
        for(const host of sh.placed){
          if(!alive()||now()>deadline)break;
          const X=cx-host.x,nf=nfp(host.o,o,sh.G);
          for(const poly of nf.ps){for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],d0=a.x-X,d1=b.x-X;if(d0*d1>EPSC)continue;
            if(Math.abs(b.x-a.x)<1e-10){if(Math.abs(d0)<=EPSC){vals.push(host.y+a.y,host.y+b.y);}continue;}
            const t=(X-a.x)/(b.x-a.x);if(t>=-EPSC&&t<=1+EPSC)vals.push(host.y+a.y+t*(b.y-a.y));
          }}
        }
        vals.sort((a,b)=>a-b);let best=cy,last=-Infinity;
        for(let v of vals){if(!Number.isFinite(v)||v<-EPSC||v>cy+EPSC||v-last<1e-5)continue;last=v;v=Math.max(0,v);if(v+o.h>sh.H+EPSC)continue;if(valid(sh,o,cx,v,cap)){best=v;break;}}
        return best;
      };
      const x1=xCandidates(y,x),y1=yCandidates(x1,y),x2=xCandidates(y1,x1);
      if(x2<x-.01||y1<y-.01)stats.contactSnaps=(stats.contactSnaps||0)+1;
      return{x:x2,y:y1};
    }
    function find(sh,obj,cap,deadline,round=0,deep=false,settings={}){
      const t=parts.get(obj.mark);let best=null;const F=front(sh),policy=settings.policy||0;const audit=settings.audit;if(audit)audit.complete=true;
      for(const z of angles(t,sh,obj.o,round,deep)){
        if(now()>deadline||!alive()){if(audit)audit.complete=false;break;}const o=orient(t,z.a,z.m);if(o.w>cap+1e-6||o.h>sh.H+1e-6)continue;
        const q=feasible(sh,o,cap,deadline,settings.window);if(!q){if(audit)audit.complete=false;break;}q.sort((a,b)=>a.x-b.x||a.y-b.y);
        for(const p of q){
          if(now()>deadline||!alive()){if(audit)audit.complete=false;break;}let x=Math.max(0,p.x),y=Math.max(0,p.y);
          if(!valid(sh,o,x,y,cap))continue;
          if(deep){const snap=snapNfpContact(sh,o,x,y,cap,deadline);x=snap.x;y=snap.y;}
          const score=policy===1?(x+o.w)*1000000+x*100+y:policy===2?Math.max(F,x+o.w)*1000000+(y+o.h)*100+x:Math.max(F,x+o.w)*1000000+x*100+y;
          if(best&&score>=best.score-1e-6)continue;best={...obj,o,x,y,score};
          // x-sorted vertices are sufficient for policies 0/1 within one angle;
          // policy 2 scans all boundary vertices to prioritize the lower edge.
          if(policy!==2)break;
        }
      }return best;
    }
    function layout(r){const sh=stocks.map(s=>({...s,placed:[]}));const counts=new Map(),indices=new Set();
      for(let i=0;i<(r.sheets||[]).length;i++){const src=r.sheets[i],si=Number.isInteger(src.stockIndex)?src.stockIndex:i;if(!sh[si]||indices.has(si))return null;indices.add(si);for(const p of src.placed||[]){const t=parts.get(String(p.mark));if(!t)return null;const o=orient(t,p.angle,p.mirrorAxis||p.mirrored);sh[si].placed.push({id:unique++,mark:t.mark,o,x:Number(p.x),y:Number(p.y)});counts.set(t.mark,(counts.get(t.mark)||0)+1);}}
      if([...expected].some(([k,v])=>msg.allowPartial?(counts.get(k)||0)>v:counts.get(k)!==v))return null;return sh;
    }
    function verify(sheets){const counts=new Map();for(const sh of sheets){const tmp={...sh,placed:[]};for(const p of sh.placed){if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||!valid(tmp,p.o,p.x,p.y)){stats.rejectedSeed={mark:p.mark,x:p.x,y:p.y,w:p.o.w,h:p.o.h,sheet:sh.stockIndex};return false;}counts.set(p.mark,(counts.get(p.mark)||0)+1);tmp.placed.push(p);}}return [...counts].every(([k,v])=>expected.has(k)&&v<=expected.get(k))&&(msg.allowPartial||([...expected].every(([k,v])=>counts.get(k)===v)&&counts.size===expected.size));}
    function quality(sheets){let last=-1;for(let i=0;i<sheets.length;i++)if(sheets[i].placed.length)last=i;return{failed:Math.max(0,total-sheets.reduce((n,h)=>n+h.placed.length,0)),gaps:sheets.slice(0,last).filter(s=>!s.placed.length).length,span:last+1,tail:last<0?0:front(sheets[last]),tailArea:last<0?0:sheets[last].placed.reduce((s,p)=>s+p.o.area,0),sum:sheets.reduce((s,h)=>s+front(h),0)};}
    function better(a,b){if(!b)return true;if(a.failed!==b.failed)return a.failed<b.failed;if(a.gaps!==b.gaps)return a.gaps<b.gaps;if(a.span!==b.span)return a.span<b.span;if(Math.abs(a.tail-b.tail)>1e-6)return a.tail<b.tail;if(Math.abs(a.tailArea-b.tailArea)>1)return a.tailArea<b.tailArea;return a.sum<b.sum-.1;}
    const copy=s=>s.map(h=>({...h,placed:h.placed.slice()}));
    let best=null,bq=null,working=null,round=0;const startedRole=String(msg.role||'global');let freshOrder=0,patchRound=0;const archive=[];
    function publish(s){const q=quality(s);if(!better(q,bq)||!verify(s))return false;best=copy(s);bq=q;lastPublishAt=now();stats.lastImproveMs=0;stats.plateauLevel=0;
      stats.bestRemain=q.span?stocks[q.span-1].W-q.tail:0;
      const result={engine:msg.portfolio?'T50 · Global champion search':'T50 · Local closure TRUE-NFP',stockOrderExact:true,total,placed:total-q.failed,failed:q.failed,sheets:s.map(h=>({stockIndex:h.stockIndex,placed:h.placed.map(p=>({mark:p.mark,x:p.x,y:p.y,angle:p.o.a,mirrored:!!p.o.m,mirrorAxis:p.o.m||null}))})),meta:{...stats,tail:q.tail}};
      post('candidate',{result,stats:{...stats,tail:q.tail}});return true;
    }
    function beat(force=false){if(force||now()-lastBeat>650){lastBeat=now();post('progress',{stats:{...stats,tail:bq&&bq.tail,cache:nfpCache.size,seconds:(now()-t0)/1000}});}}

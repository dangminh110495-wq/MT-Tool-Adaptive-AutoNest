/* Focused review excerpt from MT-Tool T50. Not standalone. */

function ncNpAutoQuality(res,tpl){
  if(!res)return{failed:1e9,sheets:1e9,remainTier:1e9,voidTier:1e9,cavityTier:1e9,sumMaxX:1e99,frontierScore:1e99,lastMaxX:1e99};
  function geomOf(pl){const part=ncNpPartByMark(pl.mark);if(!part)return null;const rp=ncNpXformPoly(part.polygon||[],pl.angle||0,0,0,pl.mirrorAxis||pl.mirrored);if(!rp.length)return null;const b0=ncNpBBox(rp),poly=rp.map(p=>({x:p.x-b0.minX+(Number(pl.x)||0),y:p.y-b0.minY+(Number(pl.y)||0)}));return{poly,bbox:ncNpBBox(poly),area:Math.abs(ncPolygonArea(part.polygon||[]))};}
  function statsOf(sh){
    const H=Math.max(1,Number(sh.sheetWid||tpl.sheetWid)-2*Number(sh.edge!=null?sh.edge:tpl.edge||0)),usableW=Math.max(0,Number(sh.sheetLen||tpl.sheetLen)-2*Number(sh.edge!=null?sh.edge:tpl.edge||0));
    const geoms=(sh.placed||[]).map(geomOf).filter(Boolean),bins=24,xs=new Array(bins).fill(0);let usedArea=0,maxX=0;
    for(const g of geoms){usedArea+=g.area;maxX=Math.max(maxX,g.bbox.maxX);let y0=Math.floor((Math.max(0,g.bbox.minY)/H)*bins),y1=Math.floor((Math.max(0,Math.min(H,g.bbox.maxY-1e-6))/H)*bins);y0=Math.max(0,Math.min(bins-1,y0));y1=Math.max(0,Math.min(bins-1,y1));for(let i=y0;i<=y1;i++)xs[i]=Math.max(xs[i],g.bbox.maxX);}
    const binH=H/bins;let ragged=0,staircase=0,emptyInside=0;for(let i=0;i<bins;i++){const dx=maxX-xs[i];ragged+=dx*dx;emptyInside+=dx*binH;if(i)staircase+=Math.abs(xs[i]-xs[i-1]);}
    const gap=Math.max(0,Number(sh.gap!=null?sh.gap:tpl.gap)||0),cell=Math.max(28,Math.min(42,Math.max(32,gap*6.4))),nx=Math.max(1,Math.ceil(Math.max(.001,maxX)/cell)),ny=Math.max(1,Math.ceil(H/cell)),occ=new Uint8Array(nx*ny),id=(x,y)=>y*nx+x;
    for(const g of geoms){let x0=Math.max(0,Math.floor(g.bbox.minX/cell)),x1=Math.min(nx-1,Math.floor(Math.max(g.bbox.minX,g.bbox.maxX-1e-6)/cell)),y0=Math.max(0,Math.floor(g.bbox.minY/cell)),y1=Math.min(ny-1,Math.floor(Math.max(g.bbox.minY,g.bbox.maxY-1e-6)/cell));for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const p={x:Math.min(maxX-.001,(x+.5)*cell),y:Math.min(H-.001,(y+.5)*cell)};if(ncNpPointInPolygon(p,g.poly))occ[id(x,y)]=1;}}
    const ext=new Uint8Array(nx*ny),qx=new Int16Array(nx*ny),qy=new Int16Array(nx*ny);let qh=0,qt=0;const push=(x,y)=>{const k=id(x,y);if(occ[k]||ext[k])return;ext[k]=1;qx[qt]=x;qy[qt]=y;qt++;};for(let y=0;y<ny;y++)push(nx-1,y);while(qh<qt){const x=qx[qh],y=qy[qh++];if(x>0)push(x-1,y);if(x+1<nx)push(x+1,y);if(y>0)push(x,y-1);if(y+1<ny)push(x,y+1);}
    const seen=new Uint8Array(nx*ny);let internal=0,largest=0;for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const k=id(x,y);if(occ[k]||ext[k]||seen[k])continue;qh=0;qt=0;seen[k]=1;qx[qt]=x;qy[qt]=y;qt++;let c=0;while(qh<qt){const xx=qx[qh],yy=qy[qh++];c++;const add=(a,b)=>{if(a<0||b<0||a>=nx||b>=ny)return;const kk=id(a,b);if(occ[kk]||ext[kk]||seen[kk])return;seen[kk]=1;qx[qt]=a;qy[qt]=b;qt++;};add(xx-1,yy);add(xx+1,yy);add(xx,yy-1);add(xx,yy+1);}internal+=c;largest=Math.max(largest,c*cell*cell);}
    return{usedArea,maxX,usableW,H,ragged,staircase,emptyInside,internalVoid:internal*cell*cell,largestCavity:largest};
  }
  const allSheets=(res.sheets||[]),usedPairs=allSheets.map((s,i)=>({s,i})).filter(x=>x.s.placed&&x.s.placed.length),placedCount=usedPairs.reduce((n,x)=>n+x.s.placed.length,0);
  const effectiveFailed=Math.max(Number(res.failed)||0,Math.max(0,(Number(res.total)||0)-placedCount));
  const stats=usedPairs.map(x=>({...statsOf(x.s),sheetIndex:x.i}));
  const lastUsedIndex=usedPairs.length?usedPairs[usedPairs.length-1].i:-1,stockSpan=lastUsedIndex+1,stockGap=Math.max(0,stockSpan-stats.length);
  const last=stats.length?stats[stats.length-1]:{usedArea:0,maxX:0,usableW:Math.max(0,Number(tpl.sheetLen)-2*Number(tpl.edge||0)),H:Math.max(1,Number(tpl.sheetWid)-2*Number(tpl.edge||0)),ragged:0,staircase:0,emptyInside:0,internalVoid:0,largestCavity:0};
  const remainW=Math.max(0,last.usableW-last.maxX),rms=Math.sqrt(Math.max(0,last.ragged)/24),avgEmpty=last.emptyInside/Math.max(1,last.H),avgStair=last.staircase/24,frontierScore=last.maxX+rms*.48+avgEmpty*.18+avgStair*.10;
  const sumInternalVoid=stats.reduce((s,x)=>s+x.internalVoid,0),largestCavity=stats.reduce((m,x)=>Math.max(m,x.largestCavity),0),sumMaxX=stats.reduce((s,x)=>s+x.maxX,0),totalRemainW=stats.reduce((s,x)=>s+Math.max(0,x.usableW-x.maxX),0),headUnusedW=stats.slice(0,-1).reduce((s,x)=>s+Math.max(0,x.usableW-x.maxX),0);
  return{failed:effectiveFailed,sheets:stockSpan,stockGap,lastMaxX:last.maxX,lastArea:last.usedArea,sumMaxX,totalRemainW,headUnusedW,remainW,remainTier:-Math.floor(remainW/250),remainRectArea:remainW*last.H,lastRagged:last.ragged,lastStair:last.staircase,lastEmpty:last.emptyInside,sumRagged:stats.reduce((s,x)=>s+x.ragged,0),sumStair:stats.reduce((s,x)=>s+x.staircase,0),frontierScore,sumInternalVoid,largestCavity,voidTier:Math.floor(sumInternalVoid/50000),cavityTier:Math.floor(largestCavity/25000),voidScore:sumInternalVoid+largestCavity*.65};
}

function ncNpAutoQualityCmp(a,b) {
  if (!b) return -1;
  for (const k of ['failed','stockGap','sheets']) {const d=(Number(a&&a[k])||0)-(Number(b&&b[k])||0);if(Math.abs(d)>1e-6)return d<0?-1:1;}
  const ar=Number(a&&a.remainW)||0,br=Number(b&&b.remainW)||0;if(Math.abs(ar-br)>1e-6)return ar>br?-1:1;
  // T50 anti-stall: when final max-X is tied, prefer moving material OFF the last sheet
  // before cosmetic void cleanup. This is direct progress toward eliminating the last sheet.
  const ala=Number(a&&a.lastArea)||0,bla=Number(b&&b.lastArea)||0;if(Math.abs(ala-bla)>1)return ala<bla?-1:1;
  const ah=Number(a&&a.headUnusedW)||0,bh=Number(b&&b.headUnusedW)||0;if(Math.abs(ah-bh)>.5)return ah<bh?-1:1;
  const av=Number(a&&a.sumInternalVoid)||0,bv=Number(b&&b.sumInternalVoid)||0;if(Math.abs(av-bv)>1)return av<bv?-1:1;
  const ac=Number(a&&a.largestCavity)||0,bc=Number(b&&b.largestCavity)||0;if(Math.abs(ac-bc)>1)return ac<bc?-1:1;
  for (const k of ['lastMaxX','frontierScore','lastRagged','lastEmpty','lastStair','sumRagged','sumStair','sumMaxX']) {const d=(Number(a&&a[k])||0)-(Number(b&&b[k])||0);if(Math.abs(d)>1e-6)return d<0?-1:1;}
  return 0;
}

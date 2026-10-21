/* Laser Pro Studio wood remnants v1 — rectangular guillotine placements.
   Geometry is kept in centimeters. Free rectangles are non-overlapping.
   Other (non-rectangular) SVG geometry is not inferred. */
(function(root){
 "use strict";
 const n=v=>Number(v);
 const round=v=>Math.round(v*1000000)/1000000;
 const uid=()=>typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():"board-"+Date.now()+"-"+Math.random().toString(36).slice(2);
 const area=b=>(b.free||[]).reduce((t,r)=>t+r.w*r.h,0);
 const initial=(count,w,h)=>({version:1,widthCm:w,heightCm:h,boards:Array.from({length:count},()=>({id:uid(),free:[{x:0,y:0,w,h}],cuts:[]}))});
 function ensure(input,total,w,h,consumedBefore=0){
  if(!Number.isInteger(total)||total<0||total>500)throw Error("عدد ألواح الخشب لازم يكون صحيح وبين 0 و500");
  if(!(w>0&&h>0))throw Error("أدخل طول وعرض لوح الخشب أولاً");
  if(!input){
   if(consumedBefore>0.000001)throw Error("في قصّات خشب قديمة غير موزّعة على الألواح. اعمل جرد للبقايا أولاً، حتى ما نخترع مساحة متاحة.");
   return initial(total,w,h);
  }
  if(input.widthCm!==w||input.heightCm!==h)throw Error("أبعاد اللوح تغيّرت بعد تسجيل قصّات. لا يمكن تغييرها على ألواح مستخدمة.");
  let out=structuredClone(input);
  if(!Array.isArray(out.boards))throw Error("سجلّ الألواح غير صالح");
  if(out.boards.length>total)throw Error("عدد الألواح المسجّلة أكبر من الرصيد. لا يمكن حذف ألواح عليها قصّات.");
  while(out.boards.length<total)out.boards.push({id:uid(),free:[{x:0,y:0,w,h}],cuts:[]});
  return out;
 }
 function plan(layout,pieces,kerfMm,orderId){
  if(!layout||!Array.isArray(layout.boards))throw Error("بيانات الألواح غير موجودة");
  const kerf=Math.max(0,n(kerfMm)||0)/10;
  let out=structuredClone(layout),placements=[];
  const sorted=[...pieces].sort((a,b)=>b.w*b.h-a.w*a.h);
  for(const p of sorted){
   if(!(n(p.w)>0&&n(p.h)>0))throw Error("قياس القصّة ناقص: "+(p.label||"قطعة"));
   let best=null;
   for(let i=0;i<out.boards.length;i++){
    const board=out.boards[i];
    for(let j=0;j<board.free.length;j++){
     const f=board.free[j];
     for(const rotated of [false,true]){
      const w=rotated?n(p.h):n(p.w),h=rotated?n(p.w):n(p.h);
      const cw=w+(f.w-w>=kerf-1e-8?kerf:0),ch=h+(f.h-h>=kerf-1e-8?kerf:0);
      if(cw>f.w+1e-8||ch>f.h+1e-8)continue;
      const score=(board.cuts.length?0:1e12)+(f.w*f.h-cw*ch);
      if(!best||score<best.score)best={i,j,w,h,cw,ch,rotated,score};
     }
    }
   }
   if(!best)throw Error("قطعة "+(p.label||"")+" "+p.w+"×"+p.h+" سم لا تتّسع ببقايا الألواح. لا خصم قبل تأمين لوح مناسب.");
   const b=out.boards[best.i],free=b.free.splice(best.j,1)[0];
   const cut={x:round(free.x),y:round(free.y),w:best.w,h:best.h,label:String(p.label||"قصّة"),orderId:String(orderId||""),rotated:best.rotated};
   b.cuts.push(cut);
   // Vertical full-height remainder and bottom remaining strip do not overlap.
   const rw=free.w-best.cw,rh=free.h-best.ch;
   if(rw>1e-6)b.free.push({x:round(free.x+best.cw),y:free.y,w:round(rw),h:free.h});
   if(rh>1e-6)b.free.push({x:free.x,y:round(free.y+best.ch),w:best.cw,h:round(rh)});
   placements.push({boardId:b.id,...cut});
  }
  return {layout:out,placements};
 }
 function describe(layout){
  if(!layout)return null;
  let whole=0,partial=0,spent=0,cm2=0;
  for(const b of layout.boards){const a=area(b);cm2+=a;if(!(b.cuts||[]).length)whole++;else if(a>.0001)partial++;else spent++}
  const sheetArea=layout.widthCm*layout.heightCm;
  return {whole,partial,spent,cm2:round(cm2),sheetEquivalent:sheetArea?round(cm2/sheetArea):0,boardCount:layout.boards.length};
 }
 function cutsForPortrait(quote,count){
  if(!quote||!Array.isArray(quote.used)||!Number.isInteger(count)||count<1)throw Error("قطع الخشب غير محددة");
  const pieces=[];
  for(let i=0;i<count;i++)for(const [label,w,h] of quote.used)pieces.push({label:(i+1)+" - "+label,w:n(w),h:n(h)});
  return pieces;
 }
 root.LaserWood={ensure,plan,describe,cutsForPortrait,round};
})(window);

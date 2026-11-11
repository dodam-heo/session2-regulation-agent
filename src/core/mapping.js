/* Candidate article mapping for renumbering: advisory only, never silent rewrite. */
(function(global){
'use strict';
function body(text){
 return String(text||'').replace(/^제\s*\d+\s*조(?:의\s*\d+)?\s*(?:\([^)]*\))?\s*/,'')
  .replace(/\s+/g,'').replace(/[〈〉"“”‘’.,:;()]/g,'');
}
function dice(a,b){
 a=body(a);b=body(b);if(!a||!b)return 0;if(a===b)return 1;
 if(a.length<10||b.length<10)return 0;
 const grams=s=>{const r=new Map();for(let i=0;i<s.length-1;i++){const v=s.slice(i,i+2);r.set(v,(r.get(v)||0)+1);}return r;};
 const A=grams(a),B=grams(b);let overlap=0,totalA=0,totalB=0;
 for(const [k,n]of A){totalA+=n;overlap+=Math.min(n,B.get(k)||0);}
 for(const n of B.values())totalB+=n;
 return totalA+totalB?2*overlap/(totalA+totalB):0;
}
function candidates(rows,threshold=0.82){
 const old=rows.filter(r=>r.kind==='article'&&r.status==='삭제');
 const recent=rows.filter(r=>r.kind==='article'&&r.status==='신설');
 const ranked=[];
 for(const a of old)for(const b of recent){
   const score=dice(a.oldText,b.newText);
   if(score>=threshold)ranked.push({from:a.label,to:b.label,score:Number(score.toFixed(3)),
     oldText:a.oldText,newText:b.newText,source:'본문 문자 유사성(기계적 후보)'});
 }
 ranked.sort((a,b)=>b.score-a.score);
 const assignedOld=new Set(),assignedNew=new Set(),out=[];
 for(const item of ranked)if(!assignedOld.has(item.from)&&!assignedNew.has(item.to)){
   assignedOld.add(item.from);assignedNew.add(item.to);out.push(item);
 }
 return out;
}
global.RegulationMap={body,dice,candidates};
})(window);

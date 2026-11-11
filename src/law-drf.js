/* Official law.go.kr DRF integration. No fabricated law text or versions.
 * Uses Puter networking on GitHub Pages: authorization is provided by the user
 * at request time, is never persisted or embedded in the repository.
 */
(function(global){
'use strict';
const TARGETS=['law','admrul','ordin'],BASE='https://www.law.go.kr/DRF/',DEFAULT_OC='dori';
const FIELDS={
 law:{key:['법령일련번호','법령ID'],name:['법령명한글','법령명_한글'],serial:['법령일련번호'],id:['법령ID'],issued:['공포일자'],effective:['시행일자'],kind:['법령구분명'],issuer:['소관부처명'],link:['법령상세링크']},
 admrul:{key:['행정규칙일련번호','행정규칙ID'],name:['행정규칙명'],serial:['행정규칙일련번호'],id:['행정규칙ID'],issued:['발령일자'],effective:['시행일자'],kind:['행정규칙종류'],issuer:['소관부처명'],link:['행정규칙상세링크']},
 ordin:{key:['자치법규일련번호','자치법규ID','자치법규 일련번호'],name:['자치법규명'],serial:['자치법규일련번호','자치법규 일련번호'],id:['자치법규ID'],issued:['공포일자'],effective:['시행일자'],kind:['자치법규종류'],issuer:['지자체기관명'],link:['자치법규상세링크']}
};
const has=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const get=(x,aliases)=>{for(const key of aliases){if(has(x,key)&&x[key]!==null&&typeof x[key]!=='object')return String(x[key]);}return '';};
function assertTarget(target){if(!TARGETS.includes(target))throw Error('지원하지 않는 공식 법규 유형입니다.');}
function nodes(root,depth=0,out=[],seen=new Set()){
 if(!root||typeof root!=='object'||depth>16||seen.has(root)||out.length>20000)return out;
 seen.add(root);
 if(Array.isArray(root)){for(const child of root)nodes(child,depth+1,out,seen);}
 else {out.push(root);for(const v of Object.values(root))if(v&&typeof v==='object')nodes(v,depth+1,out,seen);}
 return out;
}
function officialLink(raw){
 const s=String(raw||'').trim().replace(/&amp;/g,'&');
 if(!s)return '';
 try {
   const u=new URL(s,'https://www.law.go.kr/');
   if(['http:','https:'].includes(u.protocol)&&(/(^|\.)law\.go\.kr$/i).test(u.hostname)){u.protocol='https:';return u.toString();}return '';
 }catch{return '';}
}
function normalizeList(response,target){
 assertTarget(target);
 const meta=FIELDS[target], found=new Map();
 for(const obj of nodes(response)){
   const name=get(obj,meta.name),serial=get(obj,meta.serial),id=get(obj,meta.id);
   if(!name||!(serial||id))continue;
   const key=target+':'+(serial||id);
   const item={key,target,name,serial,id,versionState:get(obj,['현행연혁코드','현행연혁구분','현행여부']),issued:get(obj,meta.issued),
     effective:get(obj,meta.effective),kind:get(obj,meta.kind),issuer:get(obj,meta.issuer),
     url:officialLink(get(obj,meta.link)),status:'조회 목록(원문 미확인)'};
   if(!found.has(key))found.set(key,item);
 }
 return [...found.values()].slice(0,100);
}
function asText(value){if(value==null)return '';if(typeof value==='string'||typeof value==='number')return String(value);return '';}
function extractDetails(response,target){
 assertTarget(target);
 const root=response?.법령||response?.행정규칙||response?.자치법규||response;
 const all=nodes(root), headings=target==='ordin'?['조내용','조문내용']:['조문내용','조내용'];
 const blocks=[],extras=[],forms=[];
 const uniq=new Set();
 function add(arr,s){s=asText(s).trim();if(s&&!uniq.has(s)){uniq.add(s);arr.push(s);}}
 for(const obj of all){
   for(const key of headings)if(has(obj,key))add(blocks,obj[key]);
   for(const key of ['부칙내용'])if(has(obj,key))add(extras,obj[key]);
   for(const key of ['별표내용'])if(has(obj,key))add(forms,obj[key]);
 }
 if(!blocks.length)for(const obj of all)if(has(obj,'항내용'))add(blocks,obj['항내용']);
 const text=[...blocks, ...(extras.length?['부칙',...extras]:[]), ...forms].join('\n').slice(0,250000);
 const n=all.find(o=>FIELDS[target].name.some(k=>has(o,k)))||root;
 return {text,title:get(n,FIELDS[target].name),version:{
   serial:get(n,FIELDS[target].serial),id:get(n,FIELDS[target].id),
   issued:get(n,FIELDS[target].issued),effective:get(n,FIELDS[target].effective)
 },annexCount:forms.length,hasAnnex:forms.length>0,hasAddendum:extras.length>0,
  missingOriginal:!text,source:'국가법령정보센터 DRF API',retrievedAt:new Date().toISOString()};
}
function urlFor(endpoint,params){
 const u=new URL(BASE+endpoint);
 for(const [k,v]of Object.entries(params))if(v!==undefined&&v!==null&&String(v)!=='')u.searchParams.set(k,String(v));
 return u.toString();
}
async function request(url){
 if(!global.RegulationAI?.ensurePuter)throw Error('공식 검색 연결 모듈을 불러오지 못했습니다. 페이지를 새로고침하세요.');
 const sdk=await global.RegulationAI.ensurePuter();
 if(typeof sdk.net?.fetch!=='function')throw Error('Puter 네트워크 기능을 사용할 수 없습니다.');
 const response=await sdk.net.fetch(url);
 if(!response.ok)throw Error('공식 API 응답 오류 HTTP '+response.status);
 const text=await response.text();
 if(text.length>5_000_000)throw Error('공식 원문이 5MB를 초과합니다. 공식 사이트에서 확인해 주세요.');
 let json;try{json=JSON.parse(text.replace(/^\uFEFF/,''));}
 catch{throw Error('공식 API가 JSON을 반환하지 않았습니다. OC 인증값·응답 형식을 확인해 주세요.');}
 if(json?.resultCode==='01'||json?.resultCode===1||json?.error)throw Error('공식 API 요청 실패: '+(json?.resultMsg||json?.error||'인증값·조회 조건을 확인해 주세요.'));
 return json;
}
function checkOC(oc){
 const s=String(oc===undefined||oc===null?DEFAULT_OC:oc).trim();
 if(!/^[A-Za-z0-9@._-]{2,160}$/.test(s))throw Error('공식 법령 API의 OC 인증값을 입력해 주세요.');
 return s;
}
async function search({oc,target='law',query='',history=false,page=1}){
 assertTarget(target);
 const phrase=String(query).trim();
 if(!phrase||phrase.length>120)throw Error('법령·규정명을 120자 이내로 입력해 주세요.');
 const q={OC:checkOC(oc),target:target==='law'&&history?'eflaw':target,type:'JSON',query:phrase,display:30,page,sort:'ddes'};
 if(target==='law'&&history)q.nw='1,2,3';
 else if(target!=='law')q.nw=history?'2':'1';
 const json=await request(urlFor('lawSearch.do',q));
 return {items:normalizeList(json,target),total:Number(json?.totalCnt||json?.law?.totalCnt||json?.admrul?.totalCnt||0),query:phrase,target,history};
}
async function detail({oc,item}){
 if(!item||!item.target)throw Error('조회할 공식 규정을 먼저 선택하세요.');
 assertTarget(item.target);
 const id=String(item.serial||item.id||'');
 if(!/^\d{1,16}$/.test(id))throw Error('공식 원문 식별번호가 유효하지 않습니다.');
 const q={OC:checkOC(oc),target:item.target,type:'JSON'};
 if(item.target==='law'||item.target==='ordin')q.MST=id;else q.ID=id;
 const json=await request(urlFor('lawService.do',q));
 const data=extractDetails(json,item.target);
 if(!data.text.trim())throw Error('조회 응답에 사용할 수 있는 조문 텍스트가 없습니다. 원문과 별표를 공식 사이트에서 확인해 주세요.');
 let hash='';
 try{const bytes=new TextEncoder().encode(data.text);const digest=await crypto.subtle.digest('SHA-256',bytes);hash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');}
 catch{/* document remains usable but must not claim a fingerprint */}
 return {...data,hash,url:item.url||'',item:{...item},sourceId:item.target+':'+id,
   verifiedFromApi:true, verificationScope:'공식 API 응답 식별자·본문 수신(법적 효력·위임 적합성 검증 아님)'};
}
global.LawDRF={normalizeList,extractDetails,officialLink,urlFor,search,detail};
})(window);

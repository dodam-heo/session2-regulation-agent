const KEY='regulation-studio-session2-v1';
function browserStorage(){try{return globalThis.localStorage}catch{return null}}
const WORK_TYPES={enact:'규정 제정',amend:'규정 개정',research:'규정 조사',compare:'신구 조문 대비',impact:'영향 조항 분석',review:'오류·정합성 점검',documents:'문서·절차'};
const PROCEDURE=['제·개정 필요성 및 권한 확인','조문안·근거 및 개정 이유 정리','관계 부서 의견수렴(해당 시)','기관별 심의·결재 요건 확인','발령·시행·공유 준비'];
function newCase(type='amend',data={}){
  const now=new Date().toISOString();const title=String(data.title||'제목 미정 규정').trim();
  return {id:globalThis.crypto?.randomUUID?.()||`w-${Date.now()}-${Math.random().toString(36).slice(2)}`,title, type,regulationType:data.regulationType||'미정',objective:data.objective||'',baseText:data.baseText||'',draftText:data.draftText||data.baseText||'',baseVersion:data.baseVersion||'판본 미확정',draftVersion:1,selectedKey:'',sources:[],draftSnapshots:[],baseSnapshots:[],decisions:[],reason:'',effectiveDate:'',transition:'',taskStates:{},history:[{at:now,what:'작업 생성'}],review:null,aiSuggestion:null,createdAt:now,updatedAt:now};
}
function updateDraft(work,text,description='초안 수정'){
  if(text===work.draftText)return work;
  const now=new Date().toISOString();return {...work,draftText:text,draftVersion:work.draftVersion+1,review:null,aiSuggestion:null,draftSnapshots:[...(work.draftSnapshots||[]),{version:work.draftVersion,text:work.draftText,at:work.updatedAt||now}].slice(-8),history:[...work.history,{at:now,what:description}].slice(-100),updatedAt:now};
}
function changeBase(work,baseText,baseVersion){
  const now=new Date().toISOString();return {...work,baseText,baseVersion:baseVersion||'판본 미확정',review:null,aiSuggestion:null,baseSnapshots:[...(work.baseSnapshots||[]),{text:work.baseText,version:work.baseVersion,at:work.updatedAt||now}].slice(-5),history:[...work.history,{at:now,what:'현행판본 변경 — 이전 비교·검토 결과 무효'}].slice(-100),updatedAt:now};
}
function loadCases(storage){
  storage=storage===undefined?browserStorage():storage;
  try {const val=JSON.parse(storage?.getItem(KEY)||'[]');return Array.isArray(val)?val.filter(x=>x&&x.id&&x.title).slice(0,30):[];}catch{return [];}
}
function saveCases(cases,storage){
  storage=storage===undefined?browserStorage():storage;
  try {storage?.setItem(KEY,JSON.stringify(cases.slice(0,30)));return true;}catch{return false;}
}
function clearCases(storage){storage=storage===undefined?browserStorage():storage;try{storage?.removeItem(KEY);return true;}catch{return false;}}

function restoreDraft(work,version){
 const snapshot=(work.draftSnapshots||[]).find(x=>x.version===Number(version));
 if(!snapshot)throw new Error('복원할 초안 판본을 찾을 수 없습니다.');
 return updateDraft(work,snapshot.text,'초안 v'+version+' 내용을 새 버전으로 복원');
}
function decide(work,record){
 const now=new Date().toISOString();
 if(!record||!String(record.subject||'').trim())throw new Error('결정할 안건을 입력해 주세요.');
 const decision={id:globalThis.crypto?.randomUUID?.()||'decision-'+Date.now(),subject:String(record.subject).slice(0,250),
   answer:String(record.answer||'보류').slice(0,1000),basis:String(record.basis||'').slice(0,1000),
   relatedClause:String(record.relatedClause||'').slice(0,100),
   status:record.answer?'담당자 결정':'보류',draftVersion:work.draftVersion,at:now};
 return {...work,decisions:[...(work.decisions||[]),decision].slice(-100),
   history:[...work.history,{at:now,what:'결정 기록: '+decision.subject}].slice(-100),updatedAt:now};
}

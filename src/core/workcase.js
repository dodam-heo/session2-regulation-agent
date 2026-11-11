const KEY='regulation-studio-session2-v1';
function browserStorage(){try{return globalThis.localStorage}catch{return null}}
const WORK_TYPES={enact:'규정 제정',amend:'규정 개정',research:'규정 조사',compare:'신구 조문 대비',impact:'영향 조항 분석',review:'오류·정합성 점검',documents:'문서·절차'};
const PROCEDURE=['제·개정 필요성 및 권한 확인','조문안·근거 및 개정 이유 정리','관계 부서 의견수렴(해당 시)','기관별 심의·결재 요건 확인','발령·시행·공유 준비'];
function newCase(type='amend',data={}){
  const now=new Date().toISOString();const title=String(data.title||'제목 미정 규정').trim();
  return {id:globalThis.crypto?.randomUUID?.()||`w-${Date.now()}-${Math.random().toString(36).slice(2)}`,title, type,regulationType:data.regulationType||'미정',objective:data.objective||'',baseText:data.baseText||'',draftText:data.draftText||data.baseText||'',baseVersion:data.baseVersion||'판본 미확정',draftVersion:1,selectedKey:'',sources:[],reason:'',effectiveDate:'',transition:'',taskStates:{},history:[{at:now,what:'작업 생성'}],review:null,aiSuggestion:null,createdAt:now,updatedAt:now};
}
function updateDraft(work,text,description='초안 수정'){
  if(text===work.draftText)return work;
  const now=new Date().toISOString();return {...work,draftText:text,draftVersion:work.draftVersion+1,review:null,aiSuggestion:null,history:[...work.history,{at:now,what:description}].slice(-100),updatedAt:now};
}
function changeBase(work,baseText,baseVersion){
  const now=new Date().toISOString();return {...work,baseText,baseVersion:baseVersion||'판본 미확정',review:null,history:[...work.history,{at:now,what:'현행판본 변경 — 이전 비교·검토 결과 무효'}].slice(-100),updatedAt:now};
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

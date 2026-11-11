/* Model-independent AI client.
 * This module never handles Gemini/LLM provider credentials.
 * Browser -> configured HTTPS backend -> Gemini or another LLM adapter.
 */
(function(global){
'use strict';
const MAX_PROPOSAL=150000;
function validate(payload){
  if(!payload||typeof payload.instruction!=='string'||!payload.instruction.trim())throw Error('AI 작성 요청을 입력해 주세요.');
  if(payload.instruction.length>6000)throw Error('작성 요청이 6,000자를 초과했습니다.');
  if(typeof payload.baseText!=='string'||typeof payload.draftText!=='string')throw Error('규정 본문 형식이 올바르지 않습니다.');
  if(payload.baseText.length>100000||payload.draftText.length>100000)throw Error('규정 본문은 10만 자 이내만 전송할 수 있습니다.');
  if((payload.sources||[]).some(s=>s.private))throw Error('비공개로 분류된 근거는 외부 AI에 전송할 수 없습니다.');
}
function makeAssistUrl(endpoint=''){
  const input=String(endpoint||'').trim();
  if(!input){
    if(global.location?.hostname?.endsWith('github.io'))throw Error('GitHub Pages는 정적 사이트입니다. Gemini를 호출할 AI 서버 주소를 먼저 연결하세요.');
    if(!global.location?.origin||!/^https?:/.test(global.location.origin))throw Error('AI 서버 주소를 입력해 주세요.');
    return new URL('/api/assist',global.location.origin).toString();
  }
  let url;
  try{url=new URL(input);}catch{throw Error('AI 서버 주소가 올바른 URL이 아닙니다.');}
  if(url.protocol!=='https:' && !(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))
    throw Error('AI 서버는 HTTPS를 사용해야 합니다(로컬 개발 제외).');
  if(url.username||url.password||url.hash||url.search)throw Error('AI 서버 주소에 사용자정보·토큰·쿼리를 포함하지 마세요.');
  const stem=url.pathname.replace(/\/+$/,'');
  url.pathname=stem.endsWith('/api/assist')?stem:stem+'/api/assist';
  return url.toString();
}
function parseProposal(obj){
  if(!obj||typeof obj.proposalText!=='string'||!obj.proposalText.trim()||obj.proposalText.length>MAX_PROPOSAL)
    throw Error('AI 서버에서 유효한 규정 초안 전문을 반환하지 않았습니다.');
  return {proposalText:obj.proposalText.trim(),reason:typeof obj.reason==='string'?obj.reason.slice(0,5000):'',
    warnings:Array.isArray(obj.warnings)?obj.warnings.filter(x=>typeof x==='string').slice(0,30):[],
    citations:[],verified:false,provider:String(obj.provider||'server'),model:String(obj.model||'')};
}
async function generateServer(payload,endpoint='',token=''){
  validate(payload);
  const url=makeAssistUrl(endpoint);
  const headers={'Content-Type':'application/json'};
  if(token)headers.Authorization='Bearer '+String(token);
  let response;
  try{
    response=await fetch(url,{method:'POST',headers,body:JSON.stringify(payload),credentials:'omit',mode:'cors',
      signal:AbortSignal.timeout(90000)});
  }catch(err){throw Error('AI 서버 통신 실패: '+(err?.message||'네트워크 또는 CORS 허용 설정을 확인하세요.'));}
  const body=await response.json().catch(()=>null);
  if(!response.ok)throw Error(body?.error||'AI 서버가 HTTP '+response.status+' 오류를 반환했습니다.');
  return parseProposal(body);
}
global.RegulationAI={generateServer,makeAssistUrl,parseProposal,validate};
})(window);

'use strict';
const MAX_OUTPUT=50000;
function config(env=process.env){
  // Gemini is the deployment default, but the public request/response contract
  // and the workbench do not depend on any model or provider.
  const provider=env.LLM_PROVIDER||'gemini';
  return {provider,url:env.LLM_API_URL||'',
    key:provider==='gemini'?(env.GEMINI_API_KEY||env.LLM_API_KEY||''):(env.LLM_API_KEY||''),
    model:env.LLM_MODEL||(provider==='gemini'?'gemini-flash-latest':''),
    timeout:Math.min(90000,Math.max(3000,Number(env.LLM_TIMEOUT_MS||45000)))};
}
function isConfigured(env=process.env) {
  const c=config(env);
  return Boolean(c.key&&c.model&&(c.provider!=='compatible'||c.url));
}
function makeRequest(c,system,user){
  if(c.provider==='compatible')return {
    url:c.url,
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+c.key},
    body:{model:c.model,temperature:0.2,response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content:user}]},
    extract:x=>x?.choices?.[0]?.message?.content
  };
  if(c.provider==='gemini')return {
    url:c.url||'https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(c.model)+':generateContent',
    headers:{'Content-Type':'application/json','x-goog-api-key':c.key},
    body:{systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:user}]}],generationConfig:{responseMimeType:'application/json',temperature:0.2}},
    extract:x=>x?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')
  };
  if(c.provider==='anthropic')return {
    url:c.url||'https://api.anthropic.com/v1/messages',
    headers:{'Content-Type':'application/json','x-api-key':c.key,'anthropic-version':'2023-06-01'},
    body:{model:c.model,max_tokens:8000,system,messages:[{role:'user',content:user}]},
    extract:x=>x?.content?.filter(p=>p.type==='text').map(p=>p.text).join('')
  };
  throw new Error('지원되지 않는 AI 공급자입니다: '+c.provider);
}
function parseProposal(content){
  let parsed;
  try{parsed=JSON.parse(content.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));}
  catch{throw new Error('모델이 유효한 JSON을 반환하지 않았습니다.');}
  if(typeof parsed.proposalText!=='string'||!parsed.proposalText.trim()||parsed.proposalText.length>MAX_OUTPUT)throw new Error('AI 제안 본문이 없거나 너무 깁니다.');
  return {proposalText:parsed.proposalText,reason:String(parsed.reason||'').slice(0,5000),warnings:Array.isArray(parsed.warnings)?parsed.warnings.slice(0,20).map(String):[],citations:[]};
}
async function generateProposal(payload,env=process.env){
  const c=config(env);
  if(!isConfigured(env))throw Object.assign(new Error('AI 서버 설정이 없습니다. LLM_MODEL / LLM_API_KEY / 제공자 설정을 확인하세요.'),{code:503});
  if(!['enact','amend','review'].includes(payload.operation)||typeof payload.instruction!=='string'||typeof payload.baseText!=='string'||typeof payload.draftText!=='string')throw Object.assign(new Error('요청 형식이 유효하지 않습니다.'),{code:400});
  if(payload.instruction.length>6000||payload.baseText.length>100000||payload.draftText.length>100000)throw Object.assign(new Error('입력 길이가 허용 범위를 넘었습니다.'),{code:413});
  if((payload.sources||[]).some(s=>s.private))throw Object.assign(new Error('비공개로 표시된 근거는 전송할 수 없습니다.'),{code:400});
  const sources=(payload.sources||[]).slice(0,15).map(s=>({title:String(s.title||'').slice(0,200),excerpt:String(s.excerpt||'').slice(0,1500),status:s.status||'미검증'}));
  const system='당신은 대한민국 공공부문 규정 제·개정 초안 보조자입니다. 확인되지 않은 법령 인용을 만들지 마세요. 변경하지 않은 조문을 보존하고, 불확실한 사항은 warnings에 표시하세요. JSON만 반환하세요: {"proposalText":"제정 또는 개정 규정 전문", "reason":"초안 이유", "warnings":["검토사항"]}.';
  const user=JSON.stringify({operation:payload.operation,request:payload.instruction,title:payload.title,regulationType:payload.regulationType,baseText:payload.baseText,draftText:payload.draftText,sources});
  const request=makeRequest(c,system,user);
  let url;
  try{url=new URL(request.url);}catch{throw new Error('AI 공급자 URL이 올바르지 않습니다.');}
  if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw new Error('AI 공급자 URL은 HTTPS를 사용해야 합니다.');
  const response=await fetch(url,{method:'POST',headers:request.headers,body:JSON.stringify(request.body),signal:AbortSignal.timeout(c.timeout)});
  if(!response.ok)throw Object.assign(new Error('AI 공급자 응답 오류: HTTP '+response.status),{code:502});
  const data=await response.json();const output=request.extract(data);
  if(typeof output!=='string')throw new Error('AI 응답 형식이 예상과 다릅니다.');
  return {...parseProposal(output),provider:c.provider,model:c.model};
}
module.exports={config,isConfigured,generateProposal};

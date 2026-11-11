'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../cloudflare/worker.js'),'utf8');
const WorkerImport='data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const origin='https://dodam-heo.github.io';
const address='https://session2-regulation-ai.dodam6002.workers.dev';
const payload={
  operation:'amend',instruction:'제1조의 목적을 명확하게 수정해 줘.',
  title:'가상 규정',regulationType:'내규',
  baseText:'제1조(목적) 규정의 목적을 정한다.',draftText:'제1조(목적) 규정의 목적을 정한다.',sources:[]
};
const make=(method,pathname,ip,body,originValue=origin)=>new Request(address+pathname,{
  method,headers:{Origin:originValue,'Content-Type':'application/json','CF-Connecting-IP':ip},
  ...(body!==undefined?{body:JSON.stringify(body)}:{})
});
let next=1;
async function worker(){return (await import(WorkerImport)).default;}
test('Cloudflare Worker code contains no embedded Gemini key or frontend secret',()=>{
  assert.match(source,/env\.GEMINI_API_KEY/);
  assert.doesNotMatch(source,/AIza[a-zA-Z0-9_-]{20,}/);
  assert.doesNotMatch(source,/api_key\s*=\s*['"]/i);
});
test('health only reports model availability and allows Pages CORS',async()=>{
  const w=await worker();
  const r=await w.fetch(make('GET','/api/health','test-health'),{GEMINI_API_KEY:'fake-secret'});
  assert.equal(r.status,200);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);
  const json=await r.json();
  assert.equal(json.aiConnected,true);
  assert.equal(json.provider,'gemini');
  assert.equal(JSON.stringify(json).includes('fake-secret'),false);
});
test('CORS preflight allows the Pages JSON POST without Authorization header',async()=>{
  const w=await worker();
  const r=await w.fetch(make('OPTIONS','/api/assist','test-options'),{});
  assert.equal(r.status,204);
  assert.equal(r.headers.get('Access-Control-Allow-Headers'),'Content-Type');
  assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);
});
test('other website origins cannot generate with account Gemini key',async()=>{
  const w=await worker();
  const r=await w.fetch(make('POST','/api/assist','test-other',payload,'https://evil.example'),{GEMINI_API_KEY:'fake-secret'});
  assert.equal(r.status,403);
});
test('missing secret and private source both block upstream request',async()=>{
  const w=await worker();
  const a=await w.fetch(make('POST','/api/assist','test-nokey',payload),{});
  assert.equal(a.status,503);
  const b=await w.fetch(make('POST','/api/assist','test-private',{...payload,sources:[{private:true}]}),{GEMINI_API_KEY:'fake-secret'});
  assert.equal(b.status,400);
});
test('actual provider-neutral /api/assist contract uses Gemini only on Worker',async()=>{
  const w=await worker(),original=global.fetch;
  let request;
  global.fetch=async(url,options)=>{
    if(String(url).includes('?pageSize=1000'))return new Response(JSON.stringify({models:[{name:'models/gemini-3.8-flash',supportedGenerationMethods:['generateContent']},{name:'models/gemini-3.7-flash',supportedGenerationMethods:['generateContent']}]}),{status:200});
    request={url,options};
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({
      proposalText:'제1조(목적) 업무의 목적을 명확히 정한다.',
      reason:'목적 조문 명확화',
      warnings:['상위법령과 정합성 검토 필요']
    })}]}}]}),{status:200,headers:{'Content-Type':'application/json'}});
  };
  try{
    const r=await w.fetch(make('POST','/api/assist','test-proposal',payload),{GEMINI_API_KEY:'fake-secret',LLM_MODEL:'gemini-flash-latest'});
    assert.equal(r.status,200);
    const body=await r.json();
    assert.equal(body.proposalText,'제1조(목적) 업무의 목적을 명확히 정한다.');
    assert.equal(body.reason,'목적 조문 명확화');
    assert.equal(body.warnings[0],'상위법령과 정합성 검토 필요');
    assert.equal(body.provider,'gemini');
    assert.equal(body.model,'gemini-3.8-flash');
    assert.equal(JSON.stringify(body).includes('fake-secret'),false);
    assert.match(request.url,/generativelanguage\.googleapis\.com\/v1beta\/models\//);
    assert.equal(request.options.headers['x-goog-api-key'],'fake-secret');
    assert.equal(JSON.parse(request.options.body).generationConfig.responseMimeType,'application/json');
    assert.equal(JSON.parse(request.options.body).contents[0].parts[0].text.includes(payload.instruction),true);
  }finally{global.fetch=original;}
});
test('Gemini quota error returns 429 and does not expose provider response',async()=>{
  const w=await worker(),old=global.fetch;
  global.fetch=async(url)=>String(url).includes('?pageSize=1000')
    ?new Response(JSON.stringify({models:[{name:'models/gemini-3.8-flash',supportedGenerationMethods:['generateContent']},{name:'models/gemini-3.7-flash',supportedGenerationMethods:['generateContent']}]}),{status:200})
    :new Response('secret provider details',{status:429});
  try{
    const r=await w.fetch(make('POST','/api/assist','test-quota',payload),{GEMINI_API_KEY:'fake-secret'});
    assert.equal(r.status,429);
    assert.doesNotMatch(JSON.stringify(await r.json()),/secret provider details/);
  }finally{global.fetch=old;}
});
test('isolate-local rate cap blocks repeat IP even if model succeeds',async()=>{
  const w=await worker(),old=global.fetch;
  global.fetch=async(url)=>String(url).includes('?pageSize=1000')
    ?new Response(JSON.stringify({models:[{name:'models/gemini-3.8-flash',supportedGenerationMethods:['generateContent']},{name:'models/gemini-3.7-flash',supportedGenerationMethods:['generateContent']}]}),{status:200})
    :new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({proposalText:'제1조(목적) 개정',reason:'',warnings:[]})}]}}]}),{status:200});
  try{
    const results=[];
    for(let i=0;i<7;i++)results.push(await w.fetch(make('POST','/api/assist','test-rate-ip',payload),{GEMINI_API_KEY:'fake-secret'}));
    assert.deepEqual(results.map(x=>x.status),[200,200,200,200,200,200,429]);
  }finally{global.fetch=old;}
});

test('Gemini HTTP 503 falls back to a second configured model',async()=>{
  const w=await worker(),old=global.fetch;
  const calls=[];
  global.fetch=async(url)=>{
    calls.push(String(url));
    if(String(url).includes('?pageSize=1000'))return new Response(JSON.stringify({models:[{name:'models/gemini-3.8-flash',supportedGenerationMethods:['generateContent']},{name:'models/gemini-3.7-flash',supportedGenerationMethods:['generateContent']}]}),{status:200});
    if(calls.length===2)return new Response(JSON.stringify({error:{message:'overloaded'}}),{status:503});
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({
      proposalText:'제1조(목적) 규정의 목적을 명확히 정한다.',reason:'간결화',warnings:[]
    })}]}}]}),{status:200});
  };
  try{
    const r=await w.fetch(make('POST','/api/assist','test-model-fallback',payload),{GEMINI_API_KEY:'fake-secret'});
    assert.equal(r.status,200);
    const answer=await r.json();
    assert.equal(answer.model,'gemini-3.7-flash');
    assert.equal(calls.length,3);
    assert.match(calls[2],/gemini-3\.7-flash/);
  }finally{global.fetch=old;}
});

test('repeated Gemini HTTP 503 is accurately reported, not hidden as a generic 502',async()=>{
  const w=await worker(),old=global.fetch;
  global.fetch=async(url)=>String(url).includes('?pageSize=1000')
    ?new Response(JSON.stringify({models:[{name:'models/gemini-3.8-flash',supportedGenerationMethods:['generateContent']},{name:'models/gemini-3.7-flash',supportedGenerationMethods:['generateContent']}]}),{status:200})
    :new Response('{}',{status:503});
  try{
    const r=await w.fetch(make('POST','/api/assist','test-repeated-503',payload),{GEMINI_API_KEY:'fake-secret'});
    assert.equal(r.status,503);
    assert.match((await r.json()).error,/일시적으로|응답/);
  }finally{global.fetch=old;}
});

test('only advertised generateContent models are used (no hard-coded 404 fallback)',async()=>{
  const w=await worker(),old=global.fetch;
  const attempted=[];
  global.fetch=async(url)=>{
    attempted.push(String(url));
    if(String(url).includes('?pageSize=1000'))return new Response(JSON.stringify({models:[
      {name:'models/gemini-3.5-flash-lite',supportedGenerationMethods:['generateContent']},
      {name:'models/gemini-3.8-live',supportedGenerationMethods:['bidiGenerateContent']}
    ]}),{status:200});
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({proposalText:'제1조(목적) 수정',reason:'',warnings:[]})}]}}]}),{status:200});
  };
  try{
    const r=await w.fetch(make('POST','/api/assist','test-live-model-selection',payload),{GEMINI_API_KEY:'fake-secret'});
    assert.equal(r.status,200);
    assert.equal((await r.json()).model,'gemini-3.5-flash-lite');
    assert.match(attempted[1],/gemini-3\.5-flash-lite/);
    assert.doesNotMatch(attempted.join(' '),/gemini-2\.5-flash/);
  }finally{global.fetch=old;}
});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const js=fs.readFileSync(path.join(__dirname,'../src/ai-client.js'),'utf8');
const example={operation:'amend',instruction:'제1조만 정리해 줘',baseText:'제1조(목적) 기존 조문',
  draftText:'제1조(목적) 기존 조문',sources:[]};
function browser(options={}){
  let calls=[];
  const window={location:{origin:options.origin||'https://dodam-heo.github.io',
    hostname:options.hostname||'dodam-heo.github.io'}};
  const ctx={window,URL,AbortSignal,fetch:async(url,opts)=>{
    calls.push({url,opts});
    return {ok:options.status===undefined?true:options.status===200,status:options.status||200,
      json:async()=>options.body||{proposalText:'제1조(목적) 수정',reason:'조문 명료화',warnings:['위임 확인'],provider:'gemini',model:'gemini-flash-latest'}};
  }};
  vm.runInNewContext(js,ctx,{filename:'ai-client.js'});
  return {api:window.RegulationAI,calls};
}
test('Puter 및 외부 SDK를 호출하는 코드가 전혀 없다',()=>{
  assert.equal(/puter|js\.puter\.com|generatePuter/i.test(js),false);
  assert.equal(typeof browser().api.generateServer,'function');
});
test('GitHub Pages는 AI 서버가 없을 때 가짜 호출을 하지 않는다',async()=>{
  const b=browser();
  await assert.rejects(()=>b.api.generateServer(example),/AI 서버 주소/);
  assert.equal(b.calls.length,0);
});
test('Gemini 공급자는 서버에서 처리하며 클라이언트 API는 범용이다',async()=>{
  const b=browser();
  const result=await b.api.generateServer(example,'https://gemini-backend.example','temporary-token');
  assert.equal(b.calls[0].url,'https://gemini-backend.example/api/assist');
  assert.equal(b.calls[0].opts.headers.Authorization,'Bearer temporary-token');
  assert.equal(b.calls[0].opts.credentials,'omit');
  assert.equal(JSON.parse(b.calls[0].opts.body).instruction,example.instruction);
  assert.equal(result.provider,'gemini');
  assert.equal(result.model,'gemini-flash-latest');
  assert.equal(result.verified,false);
  assert.equal(result.proposalText,'제1조(목적) 수정');
});
test('서버 요청 주소의 사용자 정보나 HTTP는 차단한다',()=>{
  const b=browser();
  assert.equal(b.api.makeAssistUrl('https://backend.example/api/assist'),'https://backend.example/api/assist');
  assert.throws(()=>b.api.makeAssistUrl('http://backend.example'),/HTTPS/);
  assert.throws(()=>b.api.makeAssistUrl('https://user:password@backend.example'),/사용자정보/);
});
test('개인용 서버에서는 같은 오리진으로 호출할 수 있다',()=>{
  const b=browser({origin:'http://localhost:3000',hostname:'localhost'});
  assert.equal(b.api.makeAssistUrl(''),'http://localhost:3000/api/assist');
});
test('비공개 근거가 외부로 전송되지 않도록 차단한다',async()=>{
  const b=browser();
  await assert.rejects(()=>b.api.generateServer({...example,sources:[{private:true}]},'https://backend.example'),/비공개/);
  assert.equal(b.calls.length,0);
});
test('잘못된 AI 반환 형식과 서버 오류는 성공으로 취급하지 않는다',async()=>{
  const b=browser({body:{reason:'no proposal'}});
  await assert.rejects(()=>b.api.generateServer(example,'https://backend.example'),/유효한 규정 초안/);
  const failed=browser({status:503,body:{error:'AI 서버 설정 필요'}});
  await assert.rejects(()=>failed.api.generateServer(example,'https://backend.example'),/AI 서버 설정 필요/);
});

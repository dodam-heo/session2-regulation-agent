'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'..','src','ai-client.js'),'utf8');
function setup(response){
  const calls=[];let sdkLoads=0;
  const window={
    location:{protocol:'https:'},
    document:{head:{appendChild(script){sdkLoads++;window.puter={ai:{chat:async(...args)=>{calls.push(args);return response;}}};script.onload();}},createElement(){return {};}}
  };
  vm.runInNewContext(src,{window,fetch:()=>{},URL,AbortSignal},{filename:'ai-client.js'});
  return {api:window.RegulationAI,calls,get sdkLoads(){return sdkLoads}};
}
const payload={operation:'amend',title:'가상 규정',regulationType:'내부 지침',instruction:'제1조 수정',
  baseText:'제1조(목적) 원문',draftText:'제1조(목적) 원문',sources:[]};
test('동의 전에는 SDK를 실행·연결하지 않는다',()=>{
  const x=setup({});
  assert.equal(x.sdkLoads,0);
  assert.equal(typeof x.api.generatePuter,'function');
});
test('Puter 모델 선택과 규정 원문 전달',async()=>{
  const x=setup({message:{content:JSON.stringify({proposalText:'제1조(목적) 수정됨',reason:'요청',warnings:['확인 필요']})}});
  const result=await x.api.generatePuter(payload,'gpt-5.4-nano');
  assert.equal(x.sdkLoads,1);
  assert.equal(x.calls.length,1);
  assert.equal(x.calls[0][1].model,'gpt-5.4-nano');
  assert.equal(x.calls[0][1].normalize,true);
  assert.match(x.calls[0][0],/제1조\(목적\) 원문/);
  assert.equal(result.proposalText,'제1조(목적) 수정됨');
  assert.equal(result.verified,false);
  assert.deepEqual(Array.from(result.warnings),['확인 필요']);
});
test('JSON 마크다운 코드블록을 정규화하고 텍스트를 검증한다',()=>{
  const x=setup({});
  const res=x.api.parseProposal({message:{content:'\x60\x60\x60json\n{"proposalText":"제1조(목적) 수정"}\n\x60\x60\x60'}});
  assert.equal(res.proposalText,'제1조(목적) 수정');
  assert.throws(()=>x.api.parseProposal({message:{content:'설명만 있음'}}),/JSON/);
  assert.throws(()=>x.api.parseProposal({message:{content:'{"reason":"없음"}'}}),/규정 전문/);
});
test('비공개 근거 전송을 차단한다',async()=>{
  const x=setup({});
  await assert.rejects(()=>x.api.generatePuter({...payload,sources:[{private:true,title:'비공개'}]}),/비공개/);
  assert.equal(x.sdkLoads,0);
});
test('외부 서버 URL은 HTTPS를 강제한다',()=>{
  const x=setup({});
  assert.equal(x.api.makeAssistUrl('https://example.org/'),'https://example.org/api/assist');
  assert.equal(x.api.makeAssistUrl('https://example.org/api/assist'),'https://example.org/api/assist');
  assert.equal(x.api.makeAssistUrl('http://localhost:3000'),'http://localhost:3000/api/assist');
  assert.throws(()=>x.api.makeAssistUrl('http://example.org'),/HTTPS/);
  assert.throws(()=>x.api.makeAssistUrl('https://user:pass@example.org'),/인증정보/);
});
test('모델 ID를 임의 HTML/URL 문자열로 바꿀 수 없다',async()=>{
  const x=setup({});
  await assert.rejects(()=>x.api.generatePuter(payload,'<script>'),/모델 ID/);
  assert.equal(x.sdkLoads,0);
});

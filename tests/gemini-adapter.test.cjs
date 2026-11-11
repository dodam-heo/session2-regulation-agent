'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {config,isConfigured,generateProposal}=require('../server/providers.js');
const request={operation:'amend',instruction:'제1조 목적의 문구를 명확하게 정리해 주세요.',
  title:'가상 규정',regulationType:'내부 지침',
  baseText:'제1조(목적) 규정을 정한다.',draftText:'제1조(목적) 규정을 정한다.',sources:[]};
test('서버 기본 공급자는 Gemini이며 키는 서버 환경변수에서만 읽는다',()=>{
  assert.equal(config({}).provider,'gemini');
  assert.equal(isConfigured({}),false);
  assert.equal(isConfigured({GEMINI_API_KEY:'dummy-test-key'}),true);
  assert.equal(config({GEMINI_API_KEY:'dummy-test-key'}).key,'dummy-test-key');
});
test('Gemini REST 형식과 비종속 표준 응답을 검사한다',async()=>{
  const original=global.fetch;
  let url='',options={};
  global.fetch=async(u,o)=>{
    url=String(u);options=o;
    return {ok:true,status:200,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({
      proposalText:'제1조(목적) 공공 업무 수행의 목적을 정한다.',
      reason:'조문 명확화',warnings:['기관별 적용범위 확인']
    })}]}}]})};
  };
  try{
    const result=await generateProposal(request,{GEMINI_API_KEY:'dummy-test-key',LLM_MODEL:'gemini-flash-latest'});
    assert.match(url,/generativelanguage\.googleapis\.com/);
    assert.match(url,/gemini-flash-latest:generateContent/);
    assert.equal(options.headers['x-goog-api-key'],'dummy-test-key');
    const body=JSON.parse(options.body);
    assert.equal(body.generationConfig.responseMimeType,'application/json');
    assert.match(body.contents[0].parts[0].text,/제1조\(목적\)/);
    assert.equal(result.provider,'gemini');
    assert.equal(result.model,'gemini-flash-latest');
    assert.equal(result.proposalText,'제1조(목적) 공공 업무 수행의 목적을 정한다.');
    assert.equal(result.warnings[0],'기관별 적용범위 확인');
  }finally{global.fetch=original;}
});
test('다른 LLM 공급자 설정 시 Gemini 키를 재사용하지 않는다',()=>{
  assert.equal(config({LLM_PROVIDER:'compatible',GEMINI_API_KEY:'gemini-secret'}).key,'');
  assert.equal(isConfigured({LLM_PROVIDER:'compatible',LLM_API_URL:'https://other.example/chat',LLM_MODEL:'other'}),false);
  assert.equal(isConfigured({LLM_PROVIDER:'compatible',LLM_API_URL:'https://other.example/chat',LLM_MODEL:'other',LLM_API_KEY:'dummy'}),true);
  assert.equal(isConfigured({LLM_PROVIDER:'anthropic',LLM_MODEL:'claude',LLM_API_KEY:'dummy'}),true);
});
test('Gemini API 오류를 성공 초안으로 위장하지 않는다',async()=>{
  const old=global.fetch;
  global.fetch=async()=>({ok:false,status:429});
  try{await assert.rejects(()=>generateProposal(request,{GEMINI_API_KEY:'dummy'}),/HTTP 429/);}
  finally{global.fetch=old;}
});

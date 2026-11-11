'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {safePath}=require('../server/index.js');
const {isConfigured,config}=require('../server/providers.js');
test('외부 경로 이동과 인코딩 우회를 차단한다',()=>{
  assert.equal(safePath('/%2e%2e/%2e%2e/server/index.js'),null);
  assert.equal(safePath('/src/%5csecret'),null);
  assert.equal(safePath('/'),'index.html');
  assert.equal(safePath('/src/main.js'),'src/main.js');
});
test('AI 비밀키가 없으면 서버에서 미연결 상태로 처리한다',()=>{
  assert.equal(isConfigured({LLM_PROVIDER:'gemini',LLM_MODEL:'gemini-example',LLM_API_KEY:''}),false);
  assert.equal(isConfigured({LLM_PROVIDER:'compatible',LLM_MODEL:'test',LLM_API_KEY:'x',LLM_API_URL:''}),false);
  assert.equal(config({LLM_PROVIDER:'anthropic',LLM_MODEL:'model',LLM_API_KEY:'x'}).provider,'anthropic');
});

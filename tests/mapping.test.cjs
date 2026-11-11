'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../src/core/mapping.js'),'utf8');
function mapping(){const ctx={window:{}};vm.runInNewContext(src,ctx);return ctx.window.RegulationMap;}
test('조번호만 달라지고 조문 내용이 유지되면 이동 후보',()=>{
 const map=mapping(),rows=[
  {kind:'article',status:'삭제',label:'제2조',oldText:'제2조(신청) ① 신청인은 공고일로부터 30일 이내 관련 서류를 제출한다.'},
  {kind:'article',status:'신설',label:'제4조',newText:'제4조(신청) ① 신청인은 공고일로부터 30일 이내 관련 서류를 제출한다.'}];
 const result=map.candidates(rows);
 assert.equal(result.length,1);assert.equal(result[0].from,'제2조');assert.equal(result[0].to,'제4조');
 assert.equal(result[0].score,1);
});
test('유사성이 낮으면 번호 이동을 추측하지 않는다',()=>{
 const rows=[
  {kind:'article',status:'삭제',label:'제2조',oldText:'제2조(신청) ① 신청인 개인정보와 신청 자격을 심사한다.'},
  {kind:'article',status:'신설',label:'제4조',newText:'제4조(감사) ① 전산 시스템의 접근 로그를 정기 점검한다.'}];
 assert.equal(mapping().candidates(rows).length,0);
});
test('짧거나 여러 조문을 중복 연결하지 않는다',()=>{
 const m=mapping();
 assert.equal(m.dice('제1조 A','제2조 A'),0);
 const rows=[
  {kind:'article',status:'삭제',label:'제1조',oldText:'제1조(신청) ① 모든 신청인은 지정된 서류를 제출하여야 한다.'},
  {kind:'article',status:'삭제',label:'제2조',oldText:'제2조(신청) ① 모든 신청인은 지정된 서류를 제출하여야 한다.'},
  {kind:'article',status:'신설',label:'제5조',newText:'제5조(신청) ① 모든 신청인은 지정된 서류를 제출하여야 한다.'}];
 assert.equal(m.candidates(rows).length,1);
});

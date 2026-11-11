'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const names=['parser','diff','validation','workcase','outputs'];
function evaluate(expression) {
  const context=vm.createContext({});
  for(const name of names){
    const source=fs.readFileSync(path.join(root,'src','core',name+'.js'),'utf8');
    vm.runInContext(source,context,{filename:name+'.js'});
  }
  return vm.runInContext(expression,context);
}
test('조문과 부칙 동명 조문을 구별한다',()=>{
  assert.deepEqual(Array.from(evaluate('parseRegulation("제1조(목적) 내용\\n부칙\\n제1조(시행일) 다음 날").map(b=>b.kind)')),['article','addendum','addendumArticle']);
});
test('변경·유지·신설·삭제를 계산한다',()=>{
  assert.deepEqual(Array.from(evaluate('compareRegulations("제1조(목적) A\\n제2조(사항) B", "제1조(목적) A\\n제3조(신설) C").map(r=>r.status)')),['유지','삭제','신설']);
});
test('신규 제정은 일부개정문으로 표시하지 않는다',()=>{
  assert.match(evaluate('compileAmendment("새 규정",compareRegulations("","제1조(목적) 내용"),"","enact")'),/제정안/);
});
test('다른 의무 조항의 기한을 임의 변경하지 않는다',()=>{
  const rows=evaluate('compareRegulations("제1조(신청) 30일 이내 제출\\n제2조(통지) 30일 이내 통지","제1조(신청) 20일 이내 제출\\n제2조(통지) 30일 이내 통지")');
  assert.equal(rows[0].status,'수정');
  assert.equal(rows[1].status,'유지');
});
test('인용 오류는 근거와 확인 필요 상태로 출력한다',()=>{
  const issues=evaluate('scanRegulation("제1조(목적) 내용","제1조(목적) 제10조에 따른다").items');
  assert.ok(issues.some(x=>/제10조/.test(x.message)));
});
test('초안 변경 시 현행 원문과 버전을 분리한다',()=>{
  const result=evaluate('(()=>{const a=newCase("amend",{title:"테스트",baseText:"제1조(목적) A",draftText:"제1조(목적) A"});const b=updateDraft(a,"제1조(목적) B");return [b.baseText,b.draftVersion,b.draftText]})()');
  assert.equal(result[0],'제1조(목적) A');assert.equal(result[1],2);assert.match(result[2],/B/);
});

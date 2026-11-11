'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function run(expression){
  const ctx=vm.createContext({});
  for(const name of ['parser','diff','validation','workcase','outputs']){
    vm.runInContext(fs.readFileSync(path.join(root,'src','core',name+'.js'),'utf8'),ctx,{filename:name+'.js'});
  }
  return vm.runInContext(expression,ctx);
}
test('사용자 입력 → 조문 수정 → 신구비교 → 검토 → 결과물 연결',()=>{
  const result=run(String.raw`(()=>{
    const original="제1조(목적) 지원업무\n제2조(신청) ① 신청기한은 30일이다.\n제3조(통지) ① 결과통지는 30일 이내에 한다.";
    const w=newCase("amend",{title:"테스트규정",baseText:original,draftText:original});
    const target=parseRegulation(w.draftText).find(x=>x.label==="제2조");
    const changed=replaceBlock(w.draftText,target.key,"제2조(신청) ① 신청기한은 20일이다.");
    const draft=updateDraft(w,changed);
    const rows=compareRegulations(draft.baseText,draft.draftText);
    const checked=scanRegulation(draft.baseText,draft.draftText,{version:draft.draftVersion,mode:"amend"});
    const bundle=bundleText({...draft,review:checked});
    return {before:draft.baseText,after:draft.draftText,changed:rows.filter(x=>x.status!=="유지").map(x=>x.label),
      preserved:rows.find(x=>x.label==="제3조").status,version:draft.draftVersion,hasBundle:bundle.includes("20일")};
  })()`);
  assert.match(result.before,/30일이다/);
  assert.match(result.after,/20일이다/);
  assert.deepEqual(Array.from(result.changed),['제2조']);
  assert.equal(result.preserved,'유지');
  assert.equal(result.version,2);
  assert.equal(result.hasBundle,true);
});
test('초안 변경 후 이전 검토 결과가 무효화된다',()=>{
  const result=run(String.raw`(()=>{
    const w=newCase("amend",{title:"규정",baseText:"제1조(목적) A",draftText:"제1조(목적) A"});
    w.review={version:1,items:[]};
    const next=updateDraft(w,"제1조(목적) B");
    return [Boolean(next.review),next.draftVersion,next.baseText];
  })()`);
  assert.equal(result[0],false);
  assert.equal(result[1],2);
  assert.equal(result[2],'제1조(목적) A');
});

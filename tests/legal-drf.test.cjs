'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../src/law-drf.js'),'utf8');
function setup(data){
 const requests=[];
 const sdk={net:{fetch:async url=>{requests.push(url);return {ok:true,text:async()=>JSON.stringify(data)};}}};
 const ctx={window:{RegulationAI:{ensurePuter:async()=>sdk}},URL,TextEncoder,Date,crypto:require('node:crypto').webcrypto};
 vm.runInNewContext(src,ctx,{filename:'law-drf.js'});
 return {api:ctx.window.LawDRF,requests};
}
test('공식 법령 목록 응답에서 식별자와 버전을 추출한다',()=>{
 const x=setup({});
 const response={'법령검색':{'법령':[{'법령명한글':'가상법','법령일련번호':'345','법령ID':'12','공포일자':'20260101','시행일자':'20270101','현행연혁코드':'현행','법령상세링크':'/법령/가상법'}]}};
 const list=x.api.normalizeList(response,'law');
 assert.equal(list.length,1);assert.equal(list[0].serial,'345');assert.equal(list[0].issued,'20260101');
 assert.equal(list[0].effective,'20270101');assert.equal(list[0].versionState,'현행');
 assert.match(list[0].url,/law\.go\.kr/);
});
test('지원대상 전부 목록화: 법령·행정규칙·자치법규',()=>{
 const x=setup({});
 const cases=[['law','법령명한글','법령일련번호'],['admrul','행정규칙명','행정규칙일련번호'],['ordin','자치법규명','자치법규일련번호']];
 for(const [target,name,id] of cases)assert.equal(x.api.normalizeList({list:[{[name]:'가상 자료',[id]:'10'}]},target).length,1);
});
test('외부 링크 삽입을 막는다',()=>{
 const x=setup({});
 assert.equal(x.api.officialLink('https://evil.example/'), '');
 assert.equal(x.api.officialLink('javascript:alert(1)'), '');
 assert.equal(x.api.officialLink('https://www.law.go.kr/'), 'https://www.law.go.kr/');
});
test('과거·미시행 법령은 공식 시행일 검색 대상으로 분리한다',async()=>{
 const x=setup({'법령검색':{'법령':[{'법령일련번호':'123','법령명한글':'가상법'}]}});
 const r=await x.api.search({oc:'valid-oc',target:'law',query:'가상법',history:true});
 assert.equal(r.items.length,1);
 assert.match(x.requests[0],/target=eflaw/);
 assert.match(x.requests[0],/nw=1%2C2%2C3/);
});
test('공식 원문의 조문·부칙·별표와 원문 해시를 보존한다',async()=>{
 const d={'법령':{'법령기본정보':{'법령명_한글':'가상법','법령일련번호':'123','공포일자':'20260101'},
   '조문':{'조문단위':[{'조문내용':'제1조(목적) 목적'},{'조문내용':'제2조(정의) 내용'}]},
   '부칙':{'부칙내용':'제1조(시행일) 발령한 날부터'},
   '별표':{'별표내용':'[별표 1] 시험'} }};
 const x=setup(d);
 const r=await x.api.detail({oc:'valid-oc',item:{target:'law',serial:'123',name:'가상법'}});
 assert.match(r.text,/제1조\(목적\)/);
 assert.match(r.text,/별표 1/);
 assert.match(r.text,/부칙/);
 assert.equal(r.hash.length,64);
 assert.equal(r.verifiedFromApi,true);
});
test('기본 OC=dori를 명시하지 않아도 공식 검색에 적용한다',async()=>{
 const x=setup({'법령검색':{'법령':[]}});
 await x.api.search({target:'law',query:'가상법'});
 assert.match(x.requests[0],/OC=dori/);
});
test('명시적으로 빈 OC값은 요청 전 거부한다',async()=>{
 const x=setup({});
 await assert.rejects(()=>x.api.search({oc:'',target:'admrul',query:'규정'}),/OC 인증값/);
 assert.equal(x.requests.length,0);
});

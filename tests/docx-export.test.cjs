'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../src/docx-export.js'),'utf8');
function runDocx(){
 const window={};
 const context={window,TextEncoder,Uint8Array,Date,compareRegulations:()=>[{
   label:'제1조',status:'수정',oldText:'제1조 기간 30일',newText:'제1조 기간 20일',
   segments:[{kind:'same',text:'제1조 기간 '},{kind:'del',text:'30일'},{kind:'add',text:'20일'}]
 }],scanRegulation:()=>({items:[]})};
 vm.runInNewContext(source,context,{filename:'docx-export.js'});
 return window.RegulationDOCX;
}
const fixture={title:'가상 규정',baseVersion:'2026-01-01',draftVersion:2,type:'amend',
  baseText:'제1조(신청) 기한 30일',draftText:'제1조(신청) 기한 20일',
  objective:'신청기한 정비',reason:'운영 개선',effectiveDate:'발령한 날',transition:'종전 접수건 별도',
  sources:[{title:'가상 근거',status:'담당자 확인',url:'https://www.law.go.kr/'}],
  review:{version:2,items:[]}};
function entries(bytes){
 const b=Buffer.from(bytes),files={};let p=0;
 while(p+30<=b.length&&b.readUInt32LE(p)===0x04034b50){
   const size=b.readUInt32LE(p+18),nameLength=b.readUInt16LE(p+26),extra=b.readUInt16LE(p+28);
   const name=b.subarray(p+30,p+30+nameLength).toString('utf8'),start=p+30+nameLength+extra;
   files[name]=b.subarray(start,start+size).toString('utf8');p=start+size;
 }
 return files;
}
test('DOCX ZIP 패키지의 필수 OOXML 구성 파일을 포함한다',()=>{
 const bytes=runDocx().exportDocx(fixture),all=entries(bytes);
 assert.equal(Buffer.from(bytes).readUInt32LE(0),0x04034b50);
 for(const name of ['[Content_Types].xml','_rels/.rels','word/document.xml','word/_rels/document.xml.rels','word/styles.xml'])assert.ok(all[name],name);
 assert.match(all['word/document.xml'],/가상 규정/);
});
test('Word 신구대비표에 실제 변경 문구 강조가 포함된다',()=>{
 const xml=entries(runDocx().exportDocx(fixture))['word/document.xml'];
 assert.match(xml,/<w:tbl>/);assert.match(xml,/30일/);assert.match(xml,/20일/);
 assert.match(xml,/w:u w:val="single"/);assert.match(xml,/w:color w:val="175CD3"/);
});
test('제정 작업은 기존 규정과의 신구대비표를 강제하지 않는다',()=>{
 const xml=runDocx().buildDocument({...fixture,type:'enact'});
 assert.match(xml,/신규 제정 작업/);assert.doesNotMatch(xml,/<w:tbl>/);
});
test('Word XML 특수문자는 이스케이프한다',()=>{
 const xml=runDocx().buildDocument({...fixture,title:'A < B & C'});
 assert.match(xml,/A &lt; B &amp; C/);assert.doesNotMatch(xml,/A < B/);
});

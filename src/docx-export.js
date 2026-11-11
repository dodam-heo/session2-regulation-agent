/* Minimal standards-compliant DOCX export, no runtime dependencies or external CDN.
 * OOXML text, version metadata, evidence, issue list and side-by-side comparison.
 */
(function(global){
'use strict';
const enc=new TextEncoder();
const esc=s=>String(s??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
const tag=(name,content)=>'<w:'+name+'>'+content+'</w:'+name+'>';
function run(s,style=''){
 const props=style==='deleted'?'<w:rPr><w:u w:val="single"/><w:color w:val="B42318"/></w:rPr>':
   style==='added'?'<w:rPr><w:u w:val="single"/><w:color w:val="175CD3"/></w:rPr>':'';
 const parts=String(s??'').split('\n');
 return '<w:r>'+props+parts.map((part,i)=>(i?'<w:br/>':'')+'<w:t xml:space="preserve">'+esc(part)+'</w:t>').join('')+'</w:r>';
}
function para(text,style=''){
 const ppr=style?'<w:pPr><w:pStyle w:val="'+style+'"/></w:pPr>':'';
 return '<w:p>'+ppr+run(text)+'</w:p>';
}
function cell(content){return '<w:tc><w:tcPr><w:tcW w:w="4780" w:type="dxa"/></w:tcPr><w:p>'+content+'</w:p></w:tc>';}
function table(rows){
 const cols='<w:tblGrid><w:gridCol w:w="4780"/><w:gridCol w:w="4780"/></w:tblGrid>';
 const head='<w:tr>'+cell(run('현 행'))+cell(run('개 정 안'))+'</w:tr>';
 const lines=rows.map(row=>{
   const parts=row.segments||[];
   const before=parts.filter(x=>x.kind!=='add').map(x=>run(x.text,x.kind==='del'?'deleted':'')).join('');
   const after=parts.filter(x=>x.kind!=='del').map(x=>run(x.text,x.kind==='add'?'added':'')).join('');
   const name=run(row.label+' ['+row.status+']\n');
   return '<w:tr>'+cell(name+(before||run('〈신설〉')))+cell(name+(after||run('〈삭제〉')))+'</w:tr>';
 }).join('');
 return '<w:tbl><w:tblPr><w:tblW w:w="9560" w:type="dxa"/><w:tblBorders>'+
   ['top','left','bottom','right','insideH','insideV'].map(x=>'<w:'+x+' w:val="single" w:color="CBD5E1" w:sz="4"/>').join('')+
   '</w:tblBorders></w:tblPr>'+cols+head+lines+'</w:tbl>';
}
function buildDocument(w){
 const compare=compareRegulations(w.baseText,w.draftText);
 const rev=w.review?.version===w.draftVersion?w.review:null;
 const issues=rev?.items||scanRegulation(w.baseText,w.draftText,{version:w.draftVersion,mode:w.type,reason:w.reason,effectiveDate:w.effectiveDate}).items;
 const content=[
   para(w.title+' — 제·개정 검토자료','Title'),
   para('기준 현행판본: '+(w.baseVersion||'미확정')+' / 초안: v'+w.draftVersion),
   para('생성일시: '+new Date().toISOString()+' / 검토상태: '+(rev?'현 초안 검사 기록 있음':'자동검토 미실행 또는 갱신 필요')),
   para('1. 업무 목적','Heading1'),para(w.objective||'미작성'),
   para('2. 제·개정 초안','Heading1'),para(w.draftText||'초안 본문 미작성'),
   para('3. 신구조문대비표','Heading1'),
   w.type==='enact'?para('신규 제정 작업: 비교할 현행본 없음.'):table(compare),
   para('4. 제·개정 이유','Heading1'),para(w.reason||'미작성'),
   para('5. 부칙·시행 및 경과조치','Heading1'),para((w.effectiveDate||'시행일 미정')+'\n'+(w.transition||'경과조치 미작성')),
   para('6. 오류·검토 사항','Heading1'),
   ...(issues.length?issues.map(x=>para('['+x.severity+'] '+x.location+': '+x.message)): [para('현재 구현된 자동검사에서 발견한 항목이 없습니다.')]),
   para('7. 공식 근거 및 출처','Heading1'),
   ...(w.sources?.length?w.sources.map(x=>para(x.title+' / '+x.status+' / '+(x.url||'원문 링크 미등록')+
        (x.officialId?' / 공식ID '+x.officialId:'')+(x.sha256?' / SHA-256 '+x.sha256:''))):[para('근거가 등록되지 않았습니다.')]),
   para('8. 한계 및 확인 필요','Heading1'),
   para('법적 적합성·위임 유효성·공식 원문의 최신 효력·기관별 결재 요건은 자동으로 확정되지 않습니다. 이 문서는 검토용입니다.')
 ].join('');
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
   '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+
   content+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1200" w:right="1080" w:bottom="1200" w:left="1080"/></w:sectPr></w:body></w:document>';
}
const styles='<?xml version="1.0" encoding="UTF-8"?>'+
  '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
  '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Malgun Gothic" w:eastAsia="Malgun Gothic"/><w:sz w:val="20"/></w:rPr></w:rPrDefault></w:docDefaults>'+
  '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="34"/><w:color w:val="102A43"/></w:rPr></w:style>'+
  '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="27"/><w:color w:val="1849A9"/></w:rPr></w:style>'+
  '</w:styles>';
function crc32(bytes){
 let c=0xffffffff;for(const v of bytes){c^=v;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);}
 return (c^0xffffffff)>>>0;
}
function zip(files){
 const chunks=[],central=[];let offset=0;
 const push=(arr,part)=>{arr.push(part);};
 const le=(n,len)=>{const x=new Uint8Array(len);for(let i=0;i<len;i++)x[i]=Math.floor(n/Math.pow(256,i))&255;return x;};
 const concat=xs=>{const size=xs.reduce((sum,x)=>sum+x.length,0),a=new Uint8Array(size);let at=0;for(const x of xs){a.set(x,at);at+=x.length;}return a;};
 for(const [path,body] of Object.entries(files)){
  const name=enc.encode(path),data=enc.encode(body),crc=crc32(data),size=data.length;
  const local=concat([le(0x04034b50,4),le(20,2),le(0x0800,2),le(0,2),le(0,2),le(0,2),
    le(crc,4),le(size,4),le(size,4),le(name.length,2),le(0,2),name,data]);
  push(chunks,local);
  const record=concat([le(0x02014b50,4),le(20,2),le(20,2),le(0x0800,2),le(0,2),le(0,2),le(0,2),
    le(crc,4),le(size,4),le(size,4),le(name.length,2),le(0,2),le(0,2),le(0,2),
    le(0,2),le(0,4),le(offset,4),name]);
  push(central,record);offset+=local.length;
 }
 const dir=concat(central),end=concat([le(0x06054b50,4),le(0,2),le(0,2),le(central.length,2),
   le(central.length,2),le(dir.length,4),le(offset,4),le(0,2)]);
 return concat([...chunks,dir,end]);
}
function exportDocx(work){
 const files={
 '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?>'+
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
  '<Default Extension="xml" ContentType="application/xml"/>'+
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'+
  '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
 '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?>'+
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
 'word/_rels/document.xml.rels':'<?xml version="1.0" encoding="UTF-8"?>'+
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
 'word/document.xml':buildDocument(work),'word/styles.xml':styles
 };
 return zip(files);
}
global.RegulationDOCX={exportDocx,buildDocument,zip,crc32};
})(window);

/** Non-destructive line-oriented Korean regulation parser.
 * Preserves original text as the source of truth; blocks are view/edit projections.
 */
const ARTICLE = /^(제\s*\d+\s*조(?:의\s*\d+)?)(?:\s*\(([^)]*)\))?\s*(.*)$/;
const CHAPTER = /^(제\s*\d+\s*(?:편|장|절|관))(?:\s*\(([^)]*)\))?\s*(.*)$/;
const ADDENDUM = /^부\s*칙(?:\s*\(([^)]*)\))?/;
const ANNEX = /^(\[(?:별표|별지)[^\]]*\])\s*(.*)$/;

const norm = (value='') => String(value).replace(/\s+/g,'').replace(/[（）]/g, c=>c==='（'?'(':')');
function isArticleHeading(line) { return ARTICLE.test(line.trim()); }
function parseRegulation(text='') {
  if(!String(text).trim()) return [];
  const lines=String(text).replace(/\r\n?/g,'\n').split('\n');
  const blocks=[];let current=null;let inAddendum=false;const seen=new Map();
  const startBlock=(kind,label,title,start,first)=>{
    if(current) blocks.push(current);
    const rawKey=`${kind}:${norm(label)}`;const count=(seen.get(rawKey)||0)+1;seen.set(rawKey,count);
    current={key:`${rawKey}#${count}`,kind,label,title:title||'',startLine:start+1,lines:[first],duplicate:count>1};
  };
  for(let i=0;i<lines.length;i++) {
    const line=lines[i],s=line.trim();let m;
    if((m=s.match(ARTICLE))) startBlock(inAddendum?'addendumArticle':'article',inAddendum?`부칙 ${m[1]}`:m[1],m[2]||'',i,line);
    else if((m=s.match(CHAPTER))) startBlock('chapter',m[1],m[2]||'',i,line);
    else if((m=s.match(ADDENDUM))) { inAddendum=true; startBlock('addendum','부칙',m[1]||'',i,line); }
    else if((m=s.match(ANNEX))) { inAddendum=false; startBlock('annex',m[1],'',i,line); }
    else if(!current) startBlock('intro','머리말','',i,line);
    else current.lines.push(line);
  }
  if(current) blocks.push(current);
  return blocks.map(b=>({...b, text:b.lines.join('\n'), paragraphCount:paragraphCount(b.lines.join('\n'))}));
}
function paragraphCount(text='') {
  const marks=String(text).match(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]/g);
  return marks?.length ?? (text.trim()?1:0);
}
function replaceBlock(document, key, replacement) {
  const blocks=parseRegulation(document);const index=blocks.findIndex(b=>b.key===key);
  if(index<0) throw new Error('선택한 조문을 찾을 수 없습니다.');
  const text=String(replacement).replace(/\r\n?/g,'\n').trim();
  const expected=blocks[index];
  if(!text) throw new Error('조문을 비울 수 없습니다. 삭제 기능을 사용하세요.');
  if(['article','addendumArticle'].includes(expected.kind) && !isArticleHeading(text.split('\n')[0])) throw new Error('첫 줄은 제N조(제목) 형식이어야 합니다.');
  blocks[index]={...expected,text};
  return blocks.map(b=>b.text).join('\n');
}
function deleteBlock(document, key) {
  const blocks=parseRegulation(document);const next=blocks.filter(b=>b.key!==key);
  if(blocks.length===next.length) throw new Error('선택한 조문을 찾을 수 없습니다.');
  return next.map(b=>b.text).join('\n').replace(/^\n+|\n+$/g,'');
}
function appendArticle(document, heading='제1조의2(신설)', body='① 내용을 작성하세요.') {
  const target=`${heading} ${body}`;
  const blocks=parseRegulation(document); const stop=blocks.findIndex(b=>['addendum','addendumArticle','annex'].includes(b.kind));
  if(stop<0)return `${String(document).trimEnd()}\n${target}`.trim();
  blocks.splice(stop,0,{text:target});return blocks.map(b=>b.text).join('\n').trim();
}
function articleNumber(keyOrLabel) {
  const m=String(keyOrLabel).match(/제\s*(\d+)\s*조(?:의\s*(\d+))?/);
  return m ? [Number(m[1]),Number(m[2]||0)] : null;
}

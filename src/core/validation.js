const REFERENCE=/제\s*\d+\s*조(?:의\s*\d+)?(?:\s*제\s*\d+\s*항)?/g;
const PARAGRAPH=/(?:제\s*(\d+)\s*항)/;
const ART=/^(제\s*\d+\s*조(?:의\s*\d+)?)/;
const CIRCLED='①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
function clauses(text){
  return String(text).split(/(?=[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])/g)
    .map(x=>x.trim()).filter(x=>CIRCLED.includes(x[0]))
    .map(x=>({number:CIRCLED.indexOf(x[0])+1,body:x.slice(1).replace(/\s+/g,'').trim()}));
}
function movedParagraphs(base='',draft=''){
  const oldMap=new Map(parseRegulation(base).filter(a=>a.kind==='article').map(a=>[norm(a.label),a]));
  const out=new Map();
  for(const art of parseRegulation(draft).filter(a=>a.kind==='article')){
    const orig=oldMap.get(norm(art.label));if(!orig)continue;
    const originalClauses=clauses(orig.text),currentClauses=clauses(art.text);
    for(const before of originalClauses){
      const after=currentClauses.find(c=>c.body===before.body&&c.body.length>=5);
      if(after&&after.number!==before.number)out.set(`${norm(art.label)}#${before.number}`,{old:before.number,new:after.number,article:art.label});
    }
  }
  return out;
}
function externalContext(text,pos){
  const prev=text.slice(Math.max(0,pos-50),pos);
  // 「...법」 제5조 / 「...규정」 제7조 are external citations until explicitly attached to selected local text.
  return /「[^」]+」\s*$/.test(prev)||/(?:다른\s*법률|상위\s*법령|외부\s*규정)\s*$/.test(prev);
}
function referencesIn(text='') {
  return [...String(text).matchAll(REFERENCE)].map(m=>({value:m[0],index:m.index,article:norm(m[0].match(ART)?.[1]||''),paragraph:m[0].match(PARAGRAPH)?.[1]||null,external:externalContext(text,m.index)}));
}
function scanRegulation(base='',draft='',opts={}) {
  const articles=parseRegulation(draft).filter(b=>b.kind==='article');
  const all=parseRegulation(draft),available=new Map(),items=[];let k=0;
  const moved=movedParagraphs(base,draft);
  const emit=(severity,category,location,message,evidence,check='자동검사')=>items.push({id:`ISS-${++k}`,severity,category,location,message,evidence,check});
  for(const a of articles) {
    const label=norm(a.label);
    if(available.has(label))emit('error','조문 구조',a.label,`동일한 조문번호가 중복되었습니다: ${a.label}`,`위치: ${available.get(label).startLine}행, ${a.startLine}행`);
    else available.set(label,a);
  }
  for(const a of all) {
    for(const ref of referencesIn(a.text)) {
      if(ref.external)continue;
      const target=available.get(ref.article);
      if(!target){
        // This is an ambiguity, not proof of an invalid reference: a law title may be omitted.
        emit('review','인용 확인',a.label,`${ref.value}의 인용 대상이 현재 규정 안에서 확인되지 않습니다. 외부 법령 인용 여부를 확인하세요.`,a.text.slice(Math.max(0,ref.index-16),ref.index+ref.value.length+25));
        continue;
      }
      if(ref.paragraph && norm(a.label)!==ref.article){
        const oldMove=moved.get(`${ref.article}#${ref.paragraph}`);
        if(oldMove)emit('review','항 이동 인용',a.label,`${oldMove.article}의 기존 제${oldMove.old}항 문구가 현재 제${oldMove.new}항으로 이동했습니다. 이 인용이 새 항을 의도한 것인지 확인하세요.`,a.text.slice(Math.max(0,ref.index-18),ref.index+ref.value.length+30));
      }
      if(ref.paragraph) {
        const markers=[...target.text.matchAll(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]/g)];
        const p=Number(ref.paragraph);
        if(markers.length&&p>markers.length)emit('error','항 인용',a.label,`${ref.value}: 대상 조문의 제${p}항이 확인되지 않습니다.`,target.text.slice(0,180));
      }
    }
  }
  if(!draft.trim())emit('error','자료 부족','초안','검토할 규정 본문이 없습니다.','규정 원문/초안 입력 필요');
  if(opts.mode==='amend'&&!base.trim())emit('review','판본 확인','현행 원문','현행 판본이 없어 신구 비교의 기준을 확정할 수 없습니다.','원문 또는 공식 판본 추가 필요','검사범위');
  if(opts.effectiveDate!==undefined&&!opts.effectiveDate.trim())emit('review','부칙·시행','시행일','시행일이 미정입니다. 발령·적용 시점을 확인하세요.','담당자 결정 필요','업무 점검');
  const changes=compareRegulations(base,draft).filter(r=>r.status!=='유지');
  if(opts.reason&&changes.length) {
    const allOld=new Set((base.match(/\d[\d,.]*\s*(?:일|원|년|개월|명|%)/g)||[]).map(x=>x.trim()));
    const allNew=new Set((draft.match(/\d[\d,.]*\s*(?:일|원|년|개월|명|%)/g)||[]).map(x=>x.trim()));
    for(const old of allOld) if(!allNew.has(old)&&opts.reason.includes(old)) {
      emit('review','이유서 정합성','개정 이유',`개정 전 수치(${old})가 개정 이유에 남아 있습니다.`,opts.reason.slice(0,160));
    }
  }
  return {items,version:opts.version||0,checkedAt:new Date().toISOString(),checks:['내부 조문번호 중복','같은 조문 내 항 번호 이동에 따른 인용 후보','현재 텍스트 내 인용 및 항 번호','시행일 입력','수치 변경·이유서 표시'],notChecked:['공식 원문·판본 실재 여부','외부 법령의 위임 범위·개정 효력','기관별 절차의 법적 충족','법제 표준문구 적합성']};
}
function relatedClauses(text='',label=''){
  const n=norm(label);return parseRegulation(text).filter(b=>b.kind==='article'&&norm(b.label)!==n&&referencesIn(b.text).some(r=>r.article===n&&!r.external)).map(b=>({label:b.label,text:b.text}));
}

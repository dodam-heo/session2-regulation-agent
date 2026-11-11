// Myers-style text diff is not necessary for short clauses; capped LCS prevents accidental O(n*m) overload.
function tokens(text='') {return String(text).match(/\s+|[^\s]+/gu)||[];}
function diffTokens(a='',b='', limit=40000) {
  const left=tokens(a),right=tokens(b), n=left.length,m=right.length;
  if(a===b) return [{kind:'same',text:String(a)}];
  if(n*m>limit) return [{kind:'del',text:a},{kind:'add',text:b}];
  const dp=Array.from({length:n+1},()=>new Uint32Array(m+1));
  for(let i=n-1;i>=0;i--) for(let j=m-1;j>=0;j--)
    dp[i][j]=left[i]===right[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
  const out=[];const push=(kind,text)=>{const last=out[out.length-1];if(last&&last.kind===kind)last.text+=text;else out.push({kind,text});};
  let i=0,j=0;
  while(i<n&&j<m) {
    if(left[i]===right[j]){push('same',left[i++]);j++;}
    else if(dp[i+1][j]>=dp[i][j+1])push('del',left[i++]);
    else push('add',right[j++]);
  }
  while(i<n) push('del',left[i++]);while(j<m)push('add',right[j++]);
  return out;
}
function kindStatus(oldBlock,newBlock){
  if(!oldBlock)return '신설';if(!newBlock)return '삭제';
  if(oldBlock.text===newBlock.text)return '유지';return '수정';
}
function compareRegulations(base='',draft='') {
  const before=parseRegulation(base),after=parseRegulation(draft);
  const aByKey=new Map(after.map(b=>[b.key,b]));
  const bByKey=new Map(before.map(b=>[b.key,b]));
  const keys=[...new Set([...before,...after].map(b=>b.key))];
  return keys.map(k=>{
    const oldBlock=bByKey.get(k)||null,newBlock=aByKey.get(k)||null;
    const oldText=oldBlock?.text||'',newText=newBlock?.text||'';
    return {id:k,label:newBlock?.label||oldBlock?.label||'기타', kind:newBlock?.kind||oldBlock?.kind,
      status:kindStatus(oldBlock,newBlock),oldText,newText,segments:diffTokens(oldText,newText)};
  });
}
function summarizeChanges(rows) {
  return rows.filter(r=>r.status!=='유지').map(r=>({label:r.label,status:r.status,excerpt:r.newText||r.oldText}));
}
function compileAmendment(title, rows, effectiveDate='', mode='amend') {
  const changed=rows.filter(r=>r.status!=='유지');
  if(!changed.length)return '변경 사항이 없습니다.';
  if(mode==='enact')return [`${title} 제정안 (검토용 초안)`,'※ 기존 조문이 없는 신규 제정안입니다. 신구조문대비표 작성 대상이 아닙니다.','',...changed.map(r=>r.newText).filter(Boolean), '',`시행일: ${effectiveDate||'미정(담당자 확인 필요)'}`].join('\n');
  const lines=[`${title} 일부개정안 (검토용 초안)`, '', '※ 아래는 조문별 변경 요약이며, 법제처 표준 개정지시문으로 검증되지 않았습니다.',''];
  for(const r of changed) {
    lines.push(`[${r.status}] ${r.label}`);
    if(r.oldText) lines.push(`현행: ${r.oldText}`);
    if(r.newText) lines.push(`개정안: ${r.newText}`);
    lines.push('');
  }
  lines.push(`시행일: ${effectiveDate||'미정(담당자 확인 필요)'}`);
  return lines.join('\n');
}

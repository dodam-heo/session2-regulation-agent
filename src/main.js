const e=escapeHtml;

let cases=loadCases();let activeId=null,tab='overview',modal=null,filter='all',aiWorking=false,aiMessage='';
let aiServerUrl='';
let lawOc='dori',lawSearch={items:[],query:'',target:'law',loading:false,error:'',selected:null};
const root=document.querySelector('#app');
const tabs=[['overview','업무 개요'],['sources','근거·자료'],['draft','조문 편집'],['compare','신구 대비'],['review','오류·영향'],['documents','문서·절차']];
const features=[
  {type:'enact',icon:'✳',title:'규정 제정',sub:'제정 목적·위임 근거에서 조문 체계와 초안까지',detail:'새 지침의 조문 구성과 제정 이유 작성'},
  {type:'amend',icon:'✎',title:'규정 개정',sub:'개정 의도 → 조문안 → 연결된 신구 대비',detail:'현행판본과 바뀌어야 할 업무를 함께 관리'},
  {type:'research',icon:'⌕',title:'근거·유사 규정 조사',sub:'공식 원문·유사 입안례·내 자료 분리',detail:'근거와 확인 상태를 초안에 연결'},
  {type:'compare',icon:'≡',title:'신구 조문 대비',sub:'두 판본의 실제 문구를 조문별로 대조',detail:'신설·삭제·변경을 본문 기반으로 표시'},
  {type:'impact',icon:'⌁',title:'영향 조항 분석',sub:'바뀐 조문을 인용하는 다른 조항 탐색',detail:'연관 조항·별지 정비 후보 점검'},
  {type:'review',icon:'✓',title:'오류·정합성 점검',sub:'내부 인용·조문 구조·기한 수치 확인',detail:'미검증 법적 사항은 구별해서 표시'}
];
function w(){return cases.find(x=>x.id===activeId)||null;}
function stamp(title){return `<span class="eyebrow">${e(title)}</span>`;}
function chip(text,cls=''){return `<span class="chip ${cls}">${e(text)}</span>`;}
function notify(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.classList.remove('show'),3400);}
function setWork(next){cases=[next,...cases.filter(x=>x.id!==next.id)];if(!saveCases(cases))notify('저장 공간에 기록하지 못했습니다. 내보내기를 권장합니다.');render();}
function editWork(patch,description){const old=w();if(!old)return;const next={...old,...patch,updatedAt:new Date().toISOString(),history:[...old.history,{at:new Date().toISOString(),what:description}].slice(-100)};setWork(next);}
function render(){document.title=(w()?`${w().title} | `:'')+'규정 작업실 · 세션 2';root.innerHTML=`<div class="shell">${sidebar()}<div class="main-area">${topbar()}<main class="main-content">${w()?workspace(w()):home()}</main></div></div>${modal?renderModal():''}`;}
function sidebar(){return `<aside class="sidebar"><div class="brand"><span class="logo">規</span><div><strong>규정 작업실</strong><small>SESSION 02 · REGULATION AGENT</small></div></div><div class="side-section">작업</div><nav class="side-nav" aria-label="주 메뉴"><button class="side-link ${!w()?'active':''}" data-action="home"><span>⌂</span> 홈·기능 안내</button><button class="side-link" data-action="new"><span>＋</span> 새 작업 시작</button><button class="side-link" data-action="recent"><span>◫</span> 내 작업</button></nav><div class="side-section">바로 시작</div><nav class="side-nav">${[['enact','✳','규정 제정'],['amend','✎','규정 개정'],['research','⌕','규정 조사'],['compare','≡','신구 대비'],['review','✓','오류 검토'],['documents','▤','문서·절차']].map(([id,ic,name])=>`<button class="side-link" data-action="new" data-type="${id}"><span>${ic}</span> ${name}</button>`).join('')}</nav><div class="sidebar-bottom"><span class="status-dot"></span> 브라우저 저장 · 별도 GitHub 프로젝트 <p>자료를 AI 서버로 보내려면 별도의 동의가 필요합니다.</p></div></aside>`;}
function topbar(){const work=w();return `<header class="topbar"><div class="breadcrumbs"><span>세션 2 · 규정 제·개정 에이전트</span><span class="chevron">/</span><strong>${work?e(work.title):'홈'}</strong></div><div class="top-actions">${work?`${chip(`초안 v${work.draftVersion}`,'blue')} <button class="btn btn-minor" data-action="download-json">작업 백업</button>`:''}<button class="btn btn-primary" data-action="new">+ 새 작업</button></div></header>`;}
function home(){return `<div class="page home-page"><div class="home-head"><div>${stamp('PUBLIC-SECTOR DOCUMENT WORKSPACE')}<h1>어떤 규정 업무를 진행하시나요?</h1><p>한 문장으로 업무를 설명하거나, 필요한 기능에서 바로 시작하세요. 한 작업의 원문·초안·근거·문서는 이어집니다.</p></div><div class="illustration" aria-hidden="true"><div class="illus-paper first"></div><div class="illus-paper second"><i></i><i></i><i></i></div><span class="illus-check">✓</span></div></div><section class="intent-box"><div class="intent-label"><span class="accent-dot"></span> 하고 싶은 작업을 설명해 주세요</div><form id="quickForm" class="intent-form"><input name="intent" autocomplete="off" placeholder="예: 조직개편에 맞춰 내부 지침을 개정하고 신구조문대비표를 만들고 싶어" aria-label="업무 요청 설명" /><button class="btn btn-primary" type="submit">요청으로 시작 <span>→</span></button></form><div class="intent-note">AI가 연결되어 있지 않아도 직접 작성·비교·검토 기능은 동작합니다. 근거를 임의로 생성하지 않습니다.</div></section><div class="section-heading"><div><h2>바로 시작할 수 있는 업무</h2><p>기능별 진입 후에도 하나의 공통 작업공간으로 연결됩니다.</p></div><span class="quiet">핵심 기능 6가지</span></div><div class="feature-grid">${features.map(f=>`<button class="feature" data-action="new" data-type="${f.type}"><span class="feature-icon">${f.icon}</span><span class="feature-arrow">↗</span><strong>${f.title}</strong><span>${f.sub}</span><small>${f.detail}</small></button>`).join('')}</div><div class="lower-grid"><section class="panel"><div class="panel-head"><div><h2>최근 작업</h2><p>이 브라우저에서 만든 작업을 이어서 진행하세요.</p><label class="btn btn-minor" style="display:inline-flex;gap:6px;margin-top:9px;cursor:pointer">↑ 작업 JSON 복원<input id="importCaseFile" type="file" accept=".json,application/json" style="display:none" /></label></div>${cases.length?chip(`${cases.length}건`):''}</div>${cases.length?`<div class="recent-list">${cases.slice(0,6).map(c=>`<button class="recent-item" data-action="open-case" data-id="${e(c.id)}"><span class="document-ico">▤</span><span><strong>${e(c.title)}</strong><small>${e(WORK_TYPES[c.type]||'규정 업무')} · ${formatDate(c.updatedAt)} · 초안 v${c.draftVersion}</small></span><span class="recent-arrow">→</span></button>`).join('')}</div>`:`<div class="empty small-empty">아직 생성한 작업이 없습니다.<br><button class="text-link" data-action="demo">가상 예제 둘러보기 →</button></div>`}</section><section class="panel guide-panel"><div class="panel-head"><div><h2>업무 흐름</h2><p>정해진 순서를 강제하지 않습니다.</p></div></div><div class="guide-steps"><div><b>01</b><span><strong>업무·자료 파악</strong><small>업무 목적, 현행 원문, 필요한 결과물 확인</small></span></div><div><b>02</b><span><strong>근거와 초안 연결</strong><small>근거 상태 표시 후 조문별 편집·대조</small></span></div><div><b>03</b><span><strong>검토·문서 동기화</strong><small>수정 이력과 최신 결과물 내보내기</small></span></div></div><button class="btn btn-outline full" data-action="demo">가상 사례로 기능 체험 →</button></section></div></div>`;}
function workspace(work){return `<div class="page work-page"><div class="work-heading"><div>${stamp(`WORK CASE / ${e(WORK_TYPES[work.type]||'규정 업무')}`)}<h1>${e(work.title)}</h1><p>${e(work.objective||'업무 목적이 입력되지 않았습니다. 개요에서 보완할 수 있습니다.')}</p><div class="work-meta">${chip(work.regulationType)} ${chip(`현행: ${work.baseVersion}`)} ${chip(`초안 DRAFT-${String(work.draftVersion).padStart(3,'0')}`,'blue')} ${chip(work.review?.version===work.draftVersion?'자동검사 기록 있음':'검토 재실행 필요','amber')}</div></div><button class="btn btn-outline" data-action="home">← 홈으로</button></div><nav class="work-tabs" aria-label="작업 기능">${tabs.map(([id,name])=>`<button class="work-tab ${tab===id?'active':''}" data-action="tab" data-tab="${id}">${name}</button>`).join('')}</nav><div class="tab-body">${({overview:overviewView,sources:sourceView,draft:draftView,compare:compareView,review:reviewView,documents:documentView})[tab](work)}</div></div>`;}
function sectionTop(title,desc,actions=''){return `<div class="content-heading"><div><h2>${title}</h2><p>${desc}</p></div>${actions}</div>`;}
function revisionPanel(work){
  const snapshots=work.draftSnapshots||[];
  return '<section class="panel"><h2>초안 판본 이력</h2><p class="muted">이전 원문을 덮어쓰지 않고 저장합니다. 복원은 새 초안 버전으로 기록합니다.</p>'+
    (snapshots.length?snapshots.slice().reverse().map(x=>
       '<div class="impact-row"><div><strong>초안 v'+x.version+'</strong><p class="muted">'+e(x.text.slice(0,130))+'</p></div>'+
       '<button class="btn btn-minor" type="button" data-action="restore-version" data-version="'+x.version+'">이 판본 복원</button></div>').join(''):
       '<p class="muted">이전 초안 없음</p>')+
    '</section>';
}
function decisionsPanel(work){
 const records=work.decisions||[];
 return '<section class="panel"><h2>담당자 결정 기록</h2><p class="muted">결정값과 근거·대상 조문을 초안 버전에 연결합니다.</p>'+
   '<form id="decisionForm"><label>결정 안건<input name="subject" required placeholder="예: 신청기한 변경 대상" /></label>'+
   '<label>결정 내용<input name="answer" placeholder="예: 제2조 신청기한 20일로 변경" /></label>'+
   '<div class="form-two"><label>관련 조문<input name="relatedClause" placeholder="제2조" /></label>'+
   '<label>결정 근거<input name="basis" placeholder="기관 내부 협의 결과 등" /></label></div>'+
   '<button class="btn btn-minor" type="submit">결정 기록 추가</button></form>'+
   (records.length?'<div class="issue-list">'+records.slice().reverse().slice(0,12).map(d=>
     '<div class="issue"><strong>'+e(d.subject)+' · '+e(d.status)+'</strong>'+
     '<p>'+e(d.answer||'보류')+'</p><small>'+e(d.relatedClause||'관련 조문 미지정')+
     ' · 초안 v'+e(d.draftVersion)+' · '+e(d.at)+' · '+e(d.basis||'근거 미기재')+'</small></div>').join('')+'</div>':'<p class="muted">기록된 결정 없음</p>')+
   '</section>';
}
function overviewView(work){const counts=compareRegulations(work.baseText,work.draftText),num=counts.filter(x=>x.status!=='유지').length;const review=work.review?.version===work.draftVersion?work.review:null;return `<div class="grid-overview"><section class="panel wide">${sectionTop('작업 현황','한 번 등록한 자료와 초안을 모든 기능에서 공유합니다.')}<div class="stats"><div><b>${work.sources.length}</b><span>등록 근거</span></div><div><b>${work.draftVersion}</b><span>초안 버전</span></div><div><b>${num}</b><span>변경 조문</span></div><div><b>${review?review.items.length:'—'}</b><span>최근 점검 항목</span></div></div><div class="summary-grid"><div class="summary-block"><span class="minor-label">업무 목적</span><form id="objectiveForm"><textarea name="objective" rows="3" placeholder="이번 제·개정의 목적">${e(work.objective)}</textarea><button class="btn btn-minor" type="submit">내용 저장</button></form></div><div class="summary-block"><span class="minor-label">지금 할 수 있는 작업</span><div class="next-actions"><button data-action="tab" data-tab="sources">근거와 판본 등록 <span>→</span></button><button data-action="tab" data-tab="draft">조문 초안 편집 <span>→</span></button><button data-action="tab" data-tab="review">인용·정합성 확인 <span>→</span></button><button data-action="tab" data-tab="documents">문서 세트 내보내기 <span>→</span></button></div></div></div></section><section class="panel ai-panel">${sectionTop('AI 초안 작성 보조','Gemini 우선 사용 · 다른 LLM으로 전환 가능한 독립형 AI 서버 연동')}<div class="privacy-note"><strong>원문은 자동 전송되지 않습니다.</strong> AI 요청 버튼을 누르고 전송 동의한 경우에만 연결된 서버로 전달됩니다.</div><form id="aiForm">
<div class="summary-block">
<strong>Gemini AI 서버 연결</strong>
<p class="muted">Gemini API는 서버의 비밀 환경변수에서 호출합니다. 이 페이지에 API 키를 입력하거나 저장하지 않습니다. 서버 설정만 변경하면 OpenAI 호환·Anthropic 모델로 전환할 수 있습니다.</p>
<label>AI 서버 주소
<input name="aiServerUrl" value="${e(aiServerUrl)}" placeholder="https://설치된-AI-서버-주소" autocomplete="url" />
</label>
<label>AI 서버 접근 토큰 (서버가 요구하는 경우)
<input type="password" autocomplete="off" name="aiServerToken" placeholder="입력값은 저장하지 않습니다" value="" />
</label>
<button type="button" class="btn btn-minor" data-action="check-ai-connection">AI 서버 연결 확인</button>
<p class="hint">GitHub Pages에는 AI 서버가 포함되지 않습니다. 별도 서버를 연결해야 Gemini를 사용할 수 있습니다. 공식 법령 검색은 AI 서버 없이 작동합니다.</p>
</div>
<label>요청 내용<textarea name="instruction" rows="4" placeholder="예: 제3조의 문구를 명확하게 수정하고 근거가 부족한 부분은 별도로 표시해줘">${e(work.objective)}</textarea></label><label class="consent"><input type="checkbox" name="consent" required /> 현재 작업 원문을 구성된 AI 서버로 전송하는 데 동의합니다.</label><button class="btn btn-primary full" ${aiWorking?'disabled':''} type="submit">${aiWorking?'AI 제안 생성 중…':'AI 초안 제안 요청 →'}</button></form><div class="hint">AI 제안은 검증 전 초안으로, 담당자가 승인하기 전에는 규정 본문에 반영되지 않습니다.</div>${aiMessage?`<div class="message">${e(aiMessage)}</div>`:''}${work.aiSuggestion?`<div class="proposal"><strong>AI 제안 · 적용 전 검토</strong><pre>${e(work.aiSuggestion.proposalText||'내용 없음')}</pre>${work.aiSuggestion.reason?`<p>${e(work.aiSuggestion.reason)}</p>`:''}${work.aiSuggestion.warnings?.length?'<div class="notice amber-notice"><strong>AI 검토 필요 사항</strong><ul>'+work.aiSuggestion.warnings.map(x=>'<li>'+e(x)+'</li>').join('')+'</ul></div>':''}<div class="button-row"><button class="btn btn-primary" data-action="apply-ai">이 제안으로 초안 교체</button><button class="btn btn-minor" data-action="reject-ai">제안 닫기</button></div></div>`:''}</section>${revisionPanel(work)}<section class="panel activity-panel">${sectionTop('최근 변경 이력','초안 변경 시 비교·검토는 최신 자료에서 다시 계산합니다.')}<div class="activity-list">${[...work.history].reverse().slice(0,9).map(x=>`<div><span class="history-dot"></span><span><strong>${e(x.what)}</strong><small>${formatDate(x.at)}</small></span></div>`).join('')}</div></section></div>`;}
function safeExternalUrl(raw){
 try{const u=new URL(String(raw||''));return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}
}
function sourceView(work){return `<div class="two-column"><div>${LegalUI.view(lawSearch,e)}<section class="panel">${sectionTop('근거·자료 목록','공식 판본 확인 여부와 사용자 제공 자료를 구분합니다.')}<div class="source-tabs">${chip('공식 법령 / 행정규칙')}${chip('유사 규정')}${chip('기관 내부자료')}</div>${work.sources.length?work.sources.map(s=>`<div class="source-card"><div><strong>${e(s.title)}</strong><div class="source-meta">${chip(s.kind)} ${chip(s.status,s.status.startsWith('공식 API 원문 수신')?'green':'amber')} ${s.private?chip('내부자료'):''}</div></div>${safeExternalUrl(s.url)?`<a href="${e(safeExternalUrl(s.url))}" target="_blank" rel="noopener noreferrer">원문 링크 ↗</a>`:''}<p>${e(s.excerpt||'원문 발췌 미입력')}</p><button class="text-link danger" data-action="remove-source" data-id="${e(s.id)}">목록에서 제거</button></div>`).join(''):`<div class="empty">등록된 근거가 없습니다. 공식 출처에서 확인한 자료 또는 내부 자료를 추가하세요.</div>`}</section><section class="panel source-form">${sectionTop('자료 등록','검색되지 않은 법령이나 근거를 임의로 만들어 넣지 않습니다.')}<form id="sourceForm"><div class="form-two"><label>자료명<input name="title" required placeholder="법령·행정규칙·내부 문서명" /></label><label>자료 종류<select name="kind"><option>공식 법령</option><option>행정규칙</option><option>자치법규</option><option>유사 규정</option><option>내부자료</option><option>기타</option></select></label></div><div class="form-two"><label>근거 URL (선택)<input name="url" type="url" placeholder="https://..." /></label><label>확인 상태<select name="status"><option>사용자 제공·미검증</option><option>담당자 직접 확인(자동검증 아님)</option><option>출처 재확인 필요</option></select></label></div><label>관련 조문·자료 발췌<textarea name="excerpt" rows="3" placeholder="실제 원문의 해당 문구 또는 메모"></textarea></label><label class="consent"><input name="private" type="checkbox" /> 비공개·내부 자료로 분류</label><button class="btn btn-primary" type="submit">+ 근거 카드 추가</button></form></section></div><aside><section class="panel help-card">${sectionTop('공식 자료 확인 경로','외부 검색은 새 창으로 열립니다. 결과는 자동 수집되지 않습니다.')}<div class="external-list"><a href="https://www.law.go.kr/" target="_blank" rel="noopener noreferrer">국가법령정보센터 <span>↗</span></a><a href="https://www.elis.go.kr/" target="_blank" rel="noopener noreferrer">자치법규정보시스템 <span>↗</span></a><a href="https://www.moleg.go.kr/" target="_blank" rel="noopener noreferrer">법제처 <span>↗</span></a></div><div class="privacy-note"><strong>출처 확인 원칙</strong><p>원문 링크가 있다고 내용이 자동 검증된 것은 아닙니다. 판본·발령·시행일과 위임 여부는 각각 확인해야 합니다.</p></div></section><section class="panel">${sectionTop('현행 판본 관리','판본 변경 시 비교·점검 기록을 무효화합니다.')}<form id="baseForm"><label>현행판본 식별자<input name="baseVersion" value="${e(work.baseVersion)}" placeholder="발령일·판본번호" /></label><label>현행 원문<textarea name="baseText" rows="13" placeholder="현행 규정 원문을 붙여넣으세요">${e(work.baseText)}</textarea></label><label class="file-label">텍스트 파일 가져오기 (.txt/.md)<input type="file" accept=".txt,.md,text/plain,text/markdown" data-file-target="baseText" /></label><button class="btn btn-primary full" type="submit">현행판본 저장</button></form></section></aside></div>`;}
function draftView(work){const blocks=parseRegulation(work.draftText),selected=blocks.find(x=>x.key===work.selectedKey)||blocks.find(x=>x.kind==='article')||blocks[0];const attached=selected?relatedClauses(work.draftText,selected.label):[];return `<div class="editor-grid"><section class="panel document-tree"><div class="panel-head"><div><h2>조문 구성</h2><p>${blocks.length}개 구조 블록</p></div><button class="tiny-button" data-action="add-article">+ 조문</button></div><div class="tree-list">${blocks.length?blocks.map(b=>`<button class="tree-item ${b.key===selected?.key?'active':''}" data-action="select-article" data-key="${e(b.key)}"><span>${b.kind==='article'?'§':b.kind==='annex'?'▤':b.kind==='addendum'?'◆':'—'}</span><span><strong>${e(b.label)}</strong><small>${e(b.title||({chapter:'장·절',addendum:'부칙',annex:'별표·서식',intro:'머리말'})[b.kind]||'')}</small></span></button>`).join(''):`<div class="empty">등록된 초안이 없습니다.</div>`}</div><button class="btn btn-minor full" data-action="new-template">기본 조문 틀 만들기</button></section><section class="panel main-editor">${sectionTop('조문 편집','규정 원문과 작성 초안은 별도로 보존합니다. 편집 시 버전이 증가합니다.',chip(`DRAFT-${String(work.draftVersion).padStart(3,'0')}`,'blue'))}${selected?`<div class="editor-caption"><strong>${e(selected.label)} ${selected.title?`(${e(selected.title)})`:''}</strong><span>${chip(selected.kind==='article'?'조문':'문서 구조')}</span></div><form id="articleForm"><input type="hidden" name="key" value="${e(selected.key)}" /><textarea name="text" rows="18" spellcheck="false" aria-label="선택 조문 편집">${e(selected.text)}</textarea><div class="editor-actions"><button class="btn btn-primary" type="submit">수정 내용 저장</button><button class="btn btn-minor" type="button" data-action="tab" data-tab="compare">신구 비교 보기 →</button><button class="btn btn-ghost danger" type="button" data-action="delete-article" data-key="${e(selected.key)}">이 블록 삭제</button></div></form>`:`<div class="empty">규정 내용을 먼저 입력하거나 기본 조문 틀을 만드세요.</div><form id="wholeDraftForm"><textarea name="draftText" rows="12" placeholder="제1조(목적) ..."></textarea><button class="btn btn-primary" type="submit">초안 저장</button></form>`}<p class="form-help">조문 제목·내용을 포함해 편집할 수 있습니다. 한 조문에 대한 변경은 다른 조문으로 자동 확산되지 않습니다.</p></section><aside class="editor-context"><section class="panel context-panel">${sectionTop('조문 맥락','관련 조항·근거·확인사항을 함께 봅니다.')}<h3>연관 조항</h3>${selected&&attached.length?attached.map(a=>`<button class="context-link" data-action="jump-article" data-label="${e(a.label)}"><strong>${e(a.label)}</strong><span>${e(a.text.slice(0,80))}…</span></button>`).join(''):`<p class="muted">현재 본문에서 이 조문을 직접 인용한 다른 조항이 확인되지 않았습니다.</p>`}<h3>등록 근거</h3>${work.sources.length?work.sources.slice(0,4).map(s=>`<div class="context-source"><strong>${e(s.title)}</strong><small>${e(s.status)}</small></div>`).join(''):`<p class="muted">근거가 등록되지 않았습니다.</p>`}<button class="btn btn-minor full" data-action="tab" data-tab="sources">근거 추가 →</button></section></aside></div>`;}
function markupDiff(segments,side){return segments.filter(s=>s.kind==='same'||s.kind===(side==='old'?'del':'add')).map(s=>s.kind==='same'?e(s.text):`<mark class="${side==='old'?'old-mark':'new-mark'}">${e(s.text)}</mark>`).join('');}
function mappingPanel(work,rows){
  const possible=RegulationMap.candidates(rows),confirmed=work.articleMappings||{};
  if(!possible.length&&!Object.keys(confirmed).length)return '';
  return '<section class="panel"><h3>조문 번호 이동·대응 확인</h3>'+
    '<p class="muted">본문 유사성 기반의 번호 이동 후보입니다. 확정 전에는 삭제·신설로 유지하며, 조문 인용은 자동 변경하지 않습니다.</p>'+
    possible.map(item=>'<div class="impact-row"><div><strong>'+e(item.from)+' → '+e(item.to)+'</strong>'+
      '<p class="muted">본문 유사도 '+Math.round(item.score*100)+'% · '+e(item.source)+'</p></div>'+
      (confirmed[item.from]===item.to?'<span class="chip green">담당자 연결 확인</span>':
      '<button class="btn btn-minor" type="button" data-action="confirm-article-map" data-from="'+e(item.from)+'" data-to="'+e(item.to)+'">조문 대응 확인</button>')+
      '</div>').join('')+
    (Object.keys(confirmed).length?'<p class="muted">확정된 대응: '+Object.entries(confirmed).map(([a,b])=>e(a)+' → '+e(b)).join(' / ')+'</p>':'')+
    '</section>';
}
function compareView(work){const rows=compareRegulations(work.baseText,work.draftText);const shown=filter==='changed'?rows.filter(r=>r.status!=='유지'):rows;return `<section class="panel">${sectionTop('신·구조문 대비','현행 원문과 초안의 실제 문구 차이를 표시합니다. 변경 부분만 강조합니다.',`<div class="button-row"><button class="btn ${filter==='all'?'btn-primary':'btn-minor'}" data-action="filter" data-filter="all">전체 ${rows.length}</button><button class="btn ${filter==='changed'?'btn-primary':'btn-minor'}" data-action="filter" data-filter="changed">변경 ${rows.filter(r=>r.status!=='유지').length}</button></div>`)}<div class="comparison-note">${chip(`현행 ${work.baseVersion}`)} <span>→</span> ${chip(`초안 v${work.draftVersion}`,'blue')} <span class="quiet">동일 문서 번호에 대한 기계적 대응입니다. 조문 이동·분할은 담당자 확인이 필요합니다.</span></div>${work.baseText.trim()?`<div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>조문·유형</th><th>현행 원문</th><th>개정안</th></tr></thead><tbody>${shown.map(r=>`<tr><th><span class="row-label">${e(r.label)}</span>${chip(r.status,r.status==='수정'?'blue':r.status==='신설'?'green':r.status==='삭제'?'rose':'')}</th><td>${r.oldText?markupDiff(r.segments,'old'):'<em class="missing">&lt;해당 조문 없음&gt;</em>'}</td><td>${r.newText?markupDiff(r.segments,'new'):'<em class="missing">&lt;해당 조문 없음&gt;</em>'}</td></tr>`).join('')||`<tr><td colspan="3" class="empty">표시할 조문이 없습니다.</td></tr>`}</tbody></table></div>`:`<div class="empty">현행판본이 없어 아직 비교할 수 없습니다. 현행판본을 먼저 등록하세요.<p><button class="btn btn-minor" data-action="tab" data-tab="sources">현행 원문 등록 →</button></p></div>`}${mappingPanel(work,rows)}</section><section class="panel doc-note"><h3>일부개정문 작성 참고자료</h3><p>기계적 변경 요약입니다. 자동으로 법제 표준 개정지시문이라고 확정하지 않습니다.</p><pre>${e(compileAmendment(work.title,rows,work.effectiveDate,work.type==='enact'?'enact':'amend'))}</pre><button class="btn btn-minor" data-action="copy-amend">내용 복사</button></section>`;}
function reviewView(work){const active=work.review?.version===work.draftVersion?work.review:null,changes=compareRegulations(work.baseText,work.draftText).filter(r=>r.status!=='유지'&&r.kind==='article');const links=changes.flatMap(c=>relatedClauses(work.draftText,c.label).map(a=>({changed:c.label,...a})));const uniq=[...new Map(links.map(x=>[`${x.changed}-${x.label}`,x])).values()];return `<div class="two-column review-grid"><div><section class="panel">${sectionTop('오류·정합성 검토','검출 규칙과 미검증 사항을 분리해 보여줍니다.',`<button class="btn btn-primary" data-action="scan">현재 초안 검사 실행</button>`)}${!active?`<div class="notice amber-notice">현재 초안에 대한 자동 점검 기록이 없습니다. 조문을 수정했다면 다시 실행해야 합니다.</div>`:`<div class="notice good-notice">초안 v${active.version} 검사 기록 · ${formatDate(active.checkedAt)} · ${active.items.length}개 확인 항목</div>`}${active?`<div class="issue-list">${active.items.length?active.items.map(i=>`<div class="issue"><div class="issue-head">${chip(i.severity==='error'?'오류':i.severity==='review'?'확인 필요':'정보',i.severity==='error'?'rose':'amber')}<strong>${e(i.location)} · ${e(i.category)}</strong></div><p>${e(i.message)}</p><small>${e(i.evidence)}</small></div>`).join(''):`<div class="empty">현재 구현된 자동검사 범위에서 문제 항목이 검출되지 않았습니다. 법적 적합성 확인을 뜻하지 않습니다.</div>`}</div><div class="check-scope"><strong>자동 확인 범위</strong><p>${e(active.checks.join(' · '))}</p><strong>별도 확인 필요</strong><ul>${active.notChecked.map(x=>`<li>${e(x)}</li>`).join('')}</ul></div>`:''}</section><section class="panel">${sectionTop('변경 조문의 연관 인용','변경된 조문을 참조하는 다른 조항을 후보로 표시합니다.')} ${uniq.length?uniq.map(x=>`<div class="impact-row"><div>${chip(x.changed,'blue')} 변경에 연관된 ${chip(x.label)}<p>${e(x.text.slice(0,230))}</p></div><button class="btn btn-minor" data-action="jump-article" data-label="${e(x.label)}">조문 보기 →</button></div>`).join(''):`<div class="empty">현재 규정 본문에서 직접 인용된 연관 조항 후보가 없습니다.</div>`}<p class="hint">조문 내용을 바꾸어도 다른 인용 조항이 자동 정정되지는 않습니다. 법적·업무상 영향은 담당자가 판단합니다.</p></section></div><aside><section class="panel">${sectionTop('변경 범위',`${changes.length}개 조문이 변경 후보로 식별되었습니다.`)}${changes.length?changes.map(c=>`<div class="change-summary">${chip(c.status,c.status==='신설'?'green':'blue')}<span>${e(c.label)}</span></div>`).join(''):`<div class="empty small-empty">변경 조문 없음</div>`}</section><section class="panel help-card">${sectionTop('검토의 경계','자동검사 완료 ≠ 법적 적합성 확정')}<p class="muted">본 도구의 기본 검사에서는 조문 구조, 내부 인용, 숫자 잔존 등을 확인합니다. 외부 법령과 기관 절차의 유효성은 연결된 공식 자료와 담당자 확인이 필요합니다.</p><button class="btn btn-minor full" data-action="tab" data-tab="sources">근거 확인하기 →</button></section></aside></div>`;}
function documentView(work){return `<div class="two-column"><div><section class="panel">${sectionTop('제·개정 문서 작성','같은 초안 버전의 원문·대비·근거를 기반으로 결과물을 만듭니다.')}<form id="documentsForm"><label>제·개정 이유<textarea name="reason" rows="4" placeholder="변경 필요성과 주요 내용을 작성하세요">${e(work.reason)}</textarea></label><div class="form-two"><label>시행일·부칙 문구<input name="effectiveDate" placeholder="예: 발령한 날부터 시행한다" value="${e(work.effectiveDate)}" /></label><label>규정 유형<select name="regulationType">${['미정','내부 지침','행정규칙','자치법규','기타'].map(x=>`<option ${work.regulationType===x?'selected':''}>${x}</option>`).join('')}</select></label></div><label>경과조치·추가 검토사항<textarea name="transition" rows="3" placeholder="예: 종전 신청 건은 종전 규정을 적용할지 확인">${e(work.transition)}</textarea></label><button class="btn btn-primary" type="submit">문서 입력사항 저장</button></form></section><section class="panel">${sectionTop('연결된 결과물 내보내기','최신 초안에서 즉시 생성하며, 저장된 자동검토 여부를 표시합니다.')}<div class="export-grid"><button data-action="download-docx"><b>W</b><strong>Word 문서 (.docx)</strong><small>신구대비표와 변경 밑줄 · 실제 Word 형식</small></button><button data-action="download-html"><b>▤</b><strong>보고서형 HTML</strong><small>신구 대비표 포함 · 인쇄 가능</small></button><button data-action="download-txt"><b>≡</b><strong>텍스트 묶음</strong><small>초안·이유·부칙·검토</small></button><button data-action="download-json"><b>{ }</b><strong>작업 JSON</strong><small>근거·판본·작업 이력 백업</small></button></div><p class="hint">HWPX·DOCX 원본 변환이나 기관 결재 상신을 완료했다고 표시하지 않습니다. 출력 문서는 검토용 초안입니다.</p></section></div><aside>${decisionsPanel(work)}<section class="panel">${sectionTop('업무 절차 체크리스트','기관별 규칙이 미등록된 상태의 참고 절차입니다. 실제 이행 여부는 담당자가 기록합니다.')}<div class="procedure">${PROCEDURE.map((p,i)=>`<label><input type="checkbox" data-action="stage" data-stage="${i}" ${work.taskStates[i]?'checked':''}/><span><b>${String(i+1).padStart(2,'0')}</b>${e(p)}</span></label>`).join('')}</div><div class="privacy-note"><strong>기관별 절차 확인 필요</strong><p>규정 유형과 기관의 위임·의견수렴·결재 요건에 따라 달라질 수 있습니다.</p></div></section><section class="panel">${sectionTop('현재 초안 정보','모든 출력에 표시되는 공통 판본 정보')}<dl class="meta-list"><dt>현행 판본</dt><dd>${e(work.baseVersion)}</dd><dt>초안 버전</dt><dd>DRAFT-${String(work.draftVersion).padStart(3,'0')}</dd><dt>등록 근거</dt><dd>${work.sources.length}건</dd><dt>자동검토</dt><dd>${work.review?.version===work.draftVersion?'현재 판본 검사 기록 있음':'현재 판본 미검사'}</dd></dl></section></aside></div>`;}
function renderModal(){const type=modal.type||'amend';return `<div class="modal-backdrop" data-action="close-modal"><div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div>${stamp('NEW WORK CASE')}<h2 id="modal-title">새 규정 업무 시작</h2><p>목적만 있어도 시작할 수 있습니다. 부족한 자료는 작업 중에 보완하세요.</p></div><button class="icon-button" data-action="close-modal" aria-label="닫기">✕</button></div><form id="newForm"><div class="form-two"><label>업무 유형<select name="type">${Object.entries(WORK_TYPES).map(([k,v])=>`<option value="${k}" ${k===type?'selected':''}>${e(v)}</option>`).join('')}</select></label><label>규정 종류<select name="regulationType"><option>미정</option><option>내부 지침</option><option>행정규칙</option><option>자치법규</option><option>기타</option></select></label></div><label>대상 규정명<input name="title" placeholder="예: 정보관리 지침" /></label><label>업무 목적·요청 내용<textarea name="objective" rows="3" placeholder="무슨 이유로 무엇을 제정·개정·검토하나요?">${e(modal.intent||'')}</textarea></label><label>현행 규정 원문 <span class="optional">선택 · 붙여넣기 또는 파일</span><textarea name="baseText" rows="6" placeholder="제1조(목적) ..."></textarea></label><label class="file-label">현행 텍스트 가져오기 (.txt/.md)<input type="file" accept=".txt,.md,text/plain,text/markdown" data-file-target="baseText" /></label><div class="modal-foot"><p>처음에는 이 브라우저에만 저장됩니다. 입력되지 않은 법적 근거는 만들어 넣지 않습니다.</p><button class="btn btn-primary" type="submit">작업공간 만들기 →</button></div></form></div></div>`;}
function toTab(id){tab=id;filter='all';render();window.scrollTo({top:0,behavior:'instant'});}
function nextArtNumber(text){const used=parseRegulation(text).filter(b=>b.kind==='article').map(b=>Number(b.label.match(/제\s*(\d+)/)?.[1]||0));return Math.max(0,...used)+1;}
function download(filename,data,mime){const blob=new Blob([data],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const safeName=name=>String(name).replace(/[\\/<>:"|?*]+/g,'_').slice(0,80)||'규정';
async function copyText(str){try{await navigator.clipboard.writeText(str);notify('클립보드에 복사했습니다.');}catch{notify('복사 권한을 확인해 주세요.');}}
function addDemo(){const n=newCase('amend',DEMO);activeId=n.id;tab='overview';modal=null;setWork(n);notify('가상 예시 작업을 열었습니다. 공식 법령 검증 사례가 아닙니다.');}
root.addEventListener('click',async event=>{
  const b=event.target.closest('[data-action]');if(!b)return;const act=b.dataset.action;
  if(act==='close-modal'&&event.target!==b&&b.classList.contains('modal-backdrop'))return;
  if(act==='home'||act==='recent'){activeId=null;modal=null;render();if(act==='recent')document.querySelector('.lower-grid')?.scrollIntoView({behavior:'smooth'});return;}
  if(act==='new'){modal={type:b.dataset.type||'amend',intent:''};render();return;}
  if(act==='demo'){addDemo();return;}
  if(act==='close-modal'){modal=null;render();return;}
  if(act==='open-case'){activeId=b.dataset.id;tab='overview';render();return;}
  if(act==='tab'){toTab(b.dataset.tab);return;}
  const work=w();if(!work)return;
  if(act==='check-ai-connection'){
    const address=document.querySelector('#aiForm [name="aiServerUrl"]')?.value?.trim()||'';
    aiServerUrl=address;
    try{
      if(!globalThis.RegulationAI)throw Error('AI 연결 모듈이 없습니다.');
      const health=new URL('./health',RegulationAI.makeAssistUrl(aiServerUrl)).toString();
      const response=await fetch(health,{method:'GET',credentials:'omit',signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw Error('HTTP '+response.status);
      const info=await response.json();
      if(!info.ok)throw Error('AI 서버 상태 응답이 올바르지 않습니다.');
      aiMessage=info.aiConnected
        ?'AI 서버 설정 연결됨: '+String(info.provider||'unknown')+' / '+String(info.model||'미지정')+' (실제 모델 응답 검사는 별도)'
        :'AI 서버 연결됨. 다만 Gemini API 키 또는 모델 설정이 없어 생성은 사용할 수 없습니다.';
    }catch(err){aiMessage='AI 서버 연결 확인 실패: '+(err?.message||'서버 주소·CORS를 확인하세요.');}
    render();return;
  }
  if(act==='select-article'){setWork({...work,selectedKey:b.dataset.key});return;}
  if(act==='jump-article'){const match=parseRegulation(work.draftText).find(x=>norm(x.label)===norm(b.dataset.label));tab='draft';setWork({...work,selectedKey:match?.key||''});return;}
  if(act==='add-article'){const n=nextArtNumber(work.draftText),text=appendArticle(work.draftText,`제${n}조(신설 조문)`,'① 내용을 작성하세요.');const next=updateDraft(work,text,`제${n}조 신설`);next.selectedKey=parseRegulation(text).find(a=>a.kind==='article'&&a.label===`제${n}조`)?.key||'';setWork(next);notify('신설 조문이 추가되었습니다.');return;}
  if(act==='new-template'){if(work.draftText.trim()&&!confirm('현재 초안을 제정용 기본 틀로 덮어쓸까요?'))return;const text='제1조(목적) [제정 목적을 작성하십시오.]\n제2조(정의) [주요 용어를 정의하십시오.]\n제3조(적용범위) [적용 대상을 작성하십시오.]\n제4조(운영사항) [수행 절차와 권한을 작성하십시오.]\n부칙\n제1조(시행일) [시행일을 확정하십시오.]';const next=updateDraft(work,text,'제정안 빈 구조 생성');next.selectedKey='article:제1조#1';setWork(next);notify('편집 가능한 빈 조문 체계를 만들었습니다.');return;}
  if(act==='delete-article'){if(!confirm('이 블록을 초안에서 삭제할까요? 현행 원문은 유지됩니다.'))return;try{const next=updateDraft(work,deleteBlock(work.draftText,b.dataset.key),'조문/블록 삭제');next.selectedKey='';setWork(next);}catch(err){notify(err.message);}return;}
  if(act==='scan'){const review=scanRegulation(work.baseText,work.draftText,{version:work.draftVersion,mode:work.type,effectiveDate:work.effectiveDate,reason:work.reason});editWork({review},`초안 v${work.draftVersion} 규칙 검사 실행`);notify(`자동 점검 ${review.items.length}건을 표시했습니다.`);return;}
  if(act==='filter'){filter=b.dataset.filter;render();return;}
  if(act==='confirm-article-map'){
    const from=b.dataset.from,to=b.dataset.to;
    const candidates=RegulationMap.candidates(compareRegulations(work.baseText,work.draftText));
    if(!candidates.some(x=>x.from===from&&x.to===to)){notify('해당 번호 이동 후보가 현재 초안에 없습니다.');return;}
    if(!confirm(from+'와 '+to+'가 같은 조문이라고 확인하시겠습니까? 인용 정정은 별도로 검토해야 합니다.'))return;
    const next=decide({...work,articleMappings:{...(work.articleMappings||{}),[from]:to}},
      {subject:'조문번호 이동 대응',answer:from+' → '+to,basis:'담당자 본문 대조 및 대응 확인',relatedClause:to});
    setWork(next);notify('조문 대응 관계를 결정 이력에 기록했습니다.');return;
  }
  if(act==='restore-version'){
    if(!confirm('초안 v'+b.dataset.version+'의 내용을 새 버전으로 복원하시겠습니까?'))return;
    try{setWork(restoreDraft(work,b.dataset.version));notify('이전 초안 내용이 새 버전으로 복원되었습니다.');}
    catch(err){notify(err.message);}
    return;
  }
  if(act==='official-load'){
    const item=lawSearch.items[Number(b.dataset.index)];if(!item)return;
    lawSearch.loading=true;lawSearch.error='';lawSearch.selected=null;render();
    try{lawSearch.selected=await LawDRF.detail({oc:lawOc,item});}
    catch(err){lawSearch.error='공식 원문 조회 실패: '+err.message;}
    finally{lawSearch.loading=false;render();}
    return;
  }
  if(act==='official-attach'||act==='official-set-base'){
    const d=lawSearch.selected;if(!d)return;
    const source={id:globalThis.crypto?.randomUUID?.()||'official-'+Date.now(),
      title:d.item.name,kind:d.item.kind||d.item.target,
      status:'공식 API 원문 수신(법적 검토 미완료)',url:d.url,excerpt:d.text.slice(0,1800),
      private:false,officialId:d.sourceId,officialVersion:d.version,
      sha256:d.hash,retrievedAt:d.retrievedAt};
    const sources=[...work.sources.filter(x=>x.officialId!==d.sourceId),source];
    if(act==='official-attach'){editWork({sources},'공식 원문 근거 등록: '+source.title);notify('출처·판본과 함께 근거를 등록했습니다.');return;}
    if(!confirm('공식 API 원문으로 현행 판본을 교체할까요? 기존 비교·검토 기록은 무효화됩니다.'))return;
    const version=[d.item.name,d.version.issued||'공포·발령일 미상',d.version.effective||'시행일 미상',d.sourceId].join(' / ');
    let next=changeBase(work,d.text,version);
    next.sources=sources;
    if(!next.draftText.trim())next=updateDraft(next,d.text,'공식 현행본을 바탕으로 초안 초기화');
    setWork(next);notify('공식 원문을 현행 판본으로 등록했습니다.');return;
  }
  if(act==='remove-source'){if(!confirm('등록한 근거 카드를 제거할까요?'))return;editWork({sources:work.sources.filter(x=>x.id!==b.dataset.id)},'근거 제거');return;}
  if(act==='stage'){return;}
  if(act==='copy-amend'){copyText(compileAmendment(work.title,compareRegulations(work.baseText,work.draftText),work.effectiveDate,work.type==='enact'?'enact':'amend'));return;}
  if(act==='download-json'){download(`${safeName(work.title)}_작업백업.json`,JSON.stringify(work,null,2),'application/json');return;}
  if(act==='download-txt'){download(`${safeName(work.title)}_문서묶음.txt`,bundleText(work),'text/plain;charset=utf-8');return;}
  if(act==='download-docx'){try{const docx=RegulationDOCX.exportDocx(work);download(`${safeName(work.title)}_검토자료_v${work.draftVersion}.docx`,docx,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');notify('Word 문서를 생성했습니다.');}catch(err){notify('DOCX 생성 실패: '+err.message);}return;}
  if(act==='download-html'){download(`${safeName(work.title)}_보고서.html`,bundleHtml(work),'text/html;charset=utf-8');return;}
  if(act==='apply-ai'){if(!work.aiSuggestion?.proposalText)return;if(work.aiSuggestion.targetDraftVersion!==work.draftVersion){notify('AI 제안을 받은 뒤 초안이 달라졌습니다. 제안을 다시 생성하세요.');return;}if(!confirm('AI 제안으로 현재 초안을 교체할까요? 현행 원문은 유지됩니다.'))return;const next=updateDraft(work,work.aiSuggestion.proposalText,'AI 제안 승인 적용');if(work.aiSuggestion.reason)next.reason=work.aiSuggestion.reason;setWork(next);toTab('draft');return;}
  if(act==='reject-ai'){editWork({aiSuggestion:null},'AI 제안 닫기');return;}
});
// Modal lives outside #app, so clicks within it are delegated to document.
document.addEventListener('click',event=>{if(!event.target.closest('.modal-backdrop'))return;const b=event.target.closest('[data-action="close-modal"]');if(!b)return;if(b.classList.contains('modal-backdrop')&&event.target!==b)return;modal=null;render();});
document.addEventListener('change',async ev=>{
  const input=ev.target;
  if(input.id==='importCaseFile'){
    const file=input.files?.[0];if(!file)return;
    try{
      if(file.size>2_000_000)throw new Error('JSON 파일은 2MB 이하만 지원합니다.');
      const d=JSON.parse(await file.text());
      if(!d||typeof d!=='object'||typeof d.title!=='string'||typeof d.draftText!=='string'||typeof d.baseText!=='string')
        throw new Error('이 도구의 작업 백업 JSON이 아닙니다.');
      const type=WORK_TYPES[d.type]?d.type:'amend';
      const n=newCase(type,{title:d.title.slice(0,200),regulationType:String(d.regulationType||'미정').slice(0,100),
        objective:String(d.objective||'').slice(0,10000),baseText:d.baseText.slice(0,100000),
        draftText:d.draftText.slice(0,100000),baseVersion:String(d.baseVersion||'판본 미확정').slice(0,100)});
      n.draftVersion=Number.isInteger(d.draftVersion)?Math.min(100000,Math.max(1,d.draftVersion)):1;
      n.reason=String(d.reason||'').slice(0,10000);
      n.effectiveDate=String(d.effectiveDate||'').slice(0,1000);
      n.transition=String(d.transition||'').slice(0,10000);
      n.sources=Array.isArray(d.sources)?d.sources.slice(0,100).filter(x=>x&&typeof x==='object').map(x=>({
        id:globalThis.crypto?.randomUUID?.()||'s-'+Math.random().toString(36).slice(2),
        title:String(x.title||'').slice(0,250),kind:String(x.kind||'기타').slice(0,100),
        status:String(x.status||'사용자 제공·미검증').slice(0,100),
        excerpt:String(x.excerpt||'').slice(0,10000),
        url:/^https?:\/\//i.test(x.url||'')?String(x.url).slice(0,2000):'',
        private:Boolean(x.private)
      })):[]; 
      n.taskStates=d.taskStates&&typeof d.taskStates==='object'&&!Array.isArray(d.taskStates)
        ?Object.fromEntries(Object.entries(d.taskStates).slice(0,30).map(([key,value])=>[key,Boolean(value)])):{};
      n.history=[{at:new Date().toISOString(),what:'JSON 백업에서 복원'}];
      n.draftSnapshots=Array.isArray(d.draftSnapshots)?d.draftSnapshots.slice(-8).filter(x=>Number.isInteger(x.version)&&typeof x.text==='string').map(x=>({version:x.version,text:x.text.slice(0,100000),at:String(x.at||'')})):[];
      n.baseSnapshots=Array.isArray(d.baseSnapshots)?d.baseSnapshots.slice(-5).filter(x=>typeof x.text==='string').map(x=>({text:x.text.slice(0,100000),version:String(x.version||''),at:String(x.at||'')})):[];
      n.decisions=Array.isArray(d.decisions)?d.decisions.slice(-100).filter(x=>x&&typeof x.subject==='string').map(x=>({...x,subject:x.subject.slice(0,250),answer:String(x.answer||'').slice(0,1000),basis:String(x.basis||'').slice(0,1000)})):[];
      n.review=null;n.aiSuggestion=null; // stale results must never be trusted after import
      activeId=n.id;tab='overview';modal=null;setWork(n);
      notify('작업을 복원했습니다. 이전 자동검사 결과는 다시 실행해야 합니다.');
    }catch(err){notify('백업 복원 실패: '+err.message);}
    return;
  }if(input.matches('input[type="file"][data-file-target]')){
    const file=input.files?.[0];if(!file)return;if(file.size>2_000_000){notify('텍스트 파일은 2MB 이하만 지원합니다.');return;}
    const target=input.closest('form')?.querySelector(`[name="${input.dataset.fileTarget}"]`);
    if(target){target.value=await file.text();notify('텍스트 원문을 불러왔습니다. 저장 버튼을 눌러 확정하세요.');}
  }
  if(input.matches('[data-action="stage"]')){const work=w();if(!work)return;const taskStates={...work.taskStates,[input.dataset.stage]:input.checked};editWork({taskStates},'절차 체크리스트 변경');}
});
document.addEventListener('submit',async event=>{
  const form=event.target;if(!form.id)return;event.preventDefault();const d=new FormData(form),val=k=>String(d.get(k)||'').trim();
  if(form.id==='quickForm'){modal={type:'amend',intent:val('intent')};render();return;}
  if(form.id==='newForm'){const type=val('type');const baseText=val('baseText');const n=newCase(type,{title:val('title')||'제목 미정 규정',regulationType:val('regulationType'),objective:val('objective'),baseText,draftText:baseText});activeId=n.id;tab=['compare'].includes(type)?'compare':['review','impact'].includes(type)?'review':type==='research'?'sources':type==='documents'?'documents':'overview';modal=null;setWork(n);notify('작업공간이 생성되었습니다.');return;}
  const work=w();if(!work)return;
  if(form.id==='objectiveForm'){editWork({objective:val('objective')},'업무 목적 수정');notify('업무 목적을 저장했습니다.');return;}
  if(form.id==='baseForm'){const next=changeBase(work,val('baseText'),val('baseVersion'));setWork(next);notify('현행판본을 저장했습니다. 이전 검토 기록은 무효화했습니다.');return;}
  if(form.id==='officialSearchForm'){
    lawOc='dori';
    lawSearch={items:[],query:val('query'),target:val('target'),loading:true,error:'',selected:null};
    render();
    try{
      const result=await LawDRF.search({oc:lawOc,target:lawSearch.target,query:lawSearch.query,history:d.has('history')});
      lawSearch.items=result.items;
      if(!result.items.length)lawSearch.error='검색 결과가 없습니다. 검색어·공식 API 인증 범위를 확인하세요.';
    }catch(err){lawSearch.error='공식 검색 실패: '+(err?.message||String(err));}
    finally{lawSearch.loading=false;render();}
    return;
  }
  if(form.id==='sourceForm'){let url=val('url');if(url&&!/^https?:\/\//i.test(url)){notify('https 또는 http 주소만 등록할 수 있습니다.');return;}const source={id:globalThis.crypto?.randomUUID?.()||`s-${Date.now()}`,title:val('title'),kind:val('kind'),url,status:val('status'),excerpt:val('excerpt'),private:d.has('private')};editWork({sources:[...work.sources,source]},`근거 추가: ${source.title}`);notify('근거 카드가 추가되었습니다.');return;}
  if(form.id==='articleForm'){try{const nextText=replaceBlock(work.draftText,val('key'),val('text'));const next=updateDraft(work,nextText,'조문 수정');next.selectedKey=val('key');setWork(next);notify(`초안 v${next.draftVersion} 저장 · 비교 갱신`);}catch(err){notify(err.message);}return;}
  if(form.id==='wholeDraftForm'){setWork(updateDraft(work,val('draftText'),'초안 작성'));notify('초안 저장 완료');return;}
  if(form.id==='decisionForm'){
    try{const next=decide(work,{subject:val('subject'),answer:val('answer'),
      relatedClause:val('relatedClause'),basis:val('basis')});setWork(next);notify('담당자 결정이 기록됐습니다.');}
    catch(err){notify(err.message);}
    return;
  }
  if(form.id==='documentsForm'){editWork({reason:val('reason'),effectiveDate:val('effectiveDate'),regulationType:val('regulationType'),transition:val('transition'),review:null},'문서 입력사항 갱신');notify('문서 정보를 저장했습니다. 점검은 다시 실행해 주세요.');return;}
  if(form.id==='aiForm'){
    if(!d.has('consent')){notify('외부 AI 전송 동의를 확인해 주세요.');return;}
    if(aiWorking)return;
    aiServerUrl=val('aiServerUrl');
    const serverToken=val('aiServerToken');
    const instruction=val('instruction');
    if(!instruction){notify('AI 작성 요청을 입력해 주세요.');return;}
    const request={
      operation:work.type==='enact'?'enact':work.type==='review'?'review':'amend',
      title:work.title,regulationType:work.regulationType,instruction,
      baseText:work.baseText,draftText:work.draftText,
      sources:work.sources.filter(x=>!x.private)
    };
    const targetVersion=work.draftVersion,targetId=work.id;
    aiWorking=true;aiMessage='AI 서버의 제안을 요청하고 있습니다.';render();
    try{
      if(!globalThis.RegulationAI?.generateServer)throw Error('AI 연결 모듈이 없습니다. 화면을 새로고침해 주세요.');
      const proposed=await RegulationAI.generateServer(request,aiServerUrl,serverToken);
      if(w()?.id!==targetId||w()?.draftVersion!==targetVersion){
        aiMessage='AI 응답 도중 작업 또는 초안이 변경되어 제안을 적용하지 않았습니다. 다시 요청해 주세요.';
        return;
      }
      aiMessage='AI 제안을 수신했습니다. 검토 후 적용할 수 있습니다. (모델: '+(proposed.model||proposed.provider)+')';
      editWork({aiSuggestion:{...proposed,targetDraftVersion:targetVersion}},'AI 제안 수신');
    }catch(err){
      aiMessage='AI 연결 또는 생성 실패: '+(err?.message||'알 수 없는 오류');
      notify('AI 제안을 받지 못했습니다. 연결 설정과 오류 메시지를 확인하세요.');
    }finally{aiWorking=false;render();}
  }
});
render();

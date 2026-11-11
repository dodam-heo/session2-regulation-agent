/* Official-search screen separated from the central workbench renderer. */
(function(g){
'use strict';
function view(state,e){
 const x=state||{items:[]},items=x.items||[];
 const option=(val,title)=>'<option value="'+val+'"'+(x.target===val?' selected':'')+'>'+title+'</option>';
 const chips=item=>'<small>'+e(item.kind||item.target)+' · 공포/발령 '+e(item.issued||'미확인')+' · 시행 '+e(item.effective||'미확인')+'</small>';
 const results=items.map((item,i)=>
   '<div class="source-card"><strong>'+e(item.name)+'</strong><div class="source-meta">'+chips(item)+'</div>'+
   '<p>'+e(item.issuer||'발행기관 미확인')+' · 일련번호 '+e(item.serial||'미확인')+'</p>'+
   (item.url?'<a rel="noopener noreferrer" target="_blank" href="'+e(item.url)+'">공식 출처 링크 ↗</a>':'')+
   '<button class="btn btn-minor" type="button" data-action="official-load" data-index="'+i+'">원문·판본 확인 →</button></div>'
 ).join('');
 let detail='';
 if(x.selected){
   const d=x.selected;
   detail='<div class="summary-block"><strong>수신된 공식 원문 · '+e(d.item.name)+'</strong>'+
   '<p class="muted">일련번호 '+e(d.sourceId)+' · 공포/발령 '+e(d.version.issued||'-')+' · 시행 '+e(d.version.effective||'-')+'</p>'+
   '<p class="muted">SHA-256 '+e(d.hash||'미생성')+' · 별표 원문 '+(d.hasAnnex?'포함(첨부 별도 확인)':'미수신 또는 없음')+'</p>'+
   '<textarea rows="7" readonly>'+e(d.text.slice(0,14000))+'</textarea>'+
   '<div class="button-row"><button type="button" class="btn btn-minor" data-action="official-attach">근거 카드로 등록</button>'+
   '<button type="button" class="btn btn-primary" data-action="official-set-base">현행 원문으로 적용</button></div>'+
   '<p class="hint">원문 적용은 현행판본을 변경합니다. 기존 검토 기록은 무효화되며 법적 효력·위임 적합성을 확정하지 않습니다.</p></div>';
 }
 return '<section class="panel"><div class="panel-head"><div><h2>공식 법령·행정규칙·자치법규 조회</h2>'+
   '<p>국가법령정보센터 DRF API를 통한 직접 조회 · 판본 및 수집 근거 보존</p></div></div>'+
   '<div class="privacy-note"><strong>공동활용 API 인증 필요</strong> OC 인증값을 직접 입력해야 합니다. Puter 네트워크 중계를 이용하므로 로그인 및 제3자 전송이 발생하며 OC는 작업 파일에 보관하지 않습니다.</div>'+
   '<form id="officialSearchForm"><div class="form-two"><label>조회 대상<select name="target">'+
   option('law','법률·시행령·시행규칙')+
   option('admrul','행정규칙 · 훈령/예규/고시/지침')+
   option('ordin','자치법규')+'</select></label>'+
   '<label>공식 API OC 인증값<input name="oc" type="password" autocomplete="off" required placeholder="발급받은 인증값" /></label></div>'+
   '<label>법령·규정명<input name="query" maxlength="120" required value="'+e(x.query||'')+'" placeholder="규정명을 검색" /></label>'+
   '<label class="consent"><input type="checkbox" name="history" /> 과거 판본 포함 (행정규칙·자치법규)</label>'+
   '<button type="submit" class="btn btn-primary"'+(x.loading?' disabled':'')+'>'+(x.loading?'공식 원문 조회 중…':'공식 원문 조회 →')+'</button></form>'+
   (x.error?'<div class="notice amber-notice">'+e(x.error)+'</div>':'')+
   (results?'<div class="source-results">'+results+'</div>':'')+detail+'</section>';
}
g.LegalUI={view};
})(window);

'use strict';
/**
 * Performs an actual (non-mocked) API query against the law.go.kr DRF.
 * In GitHub Actions, exit status is authoritative: fail instead of inventing a success.
 * Never logs the URL containing the public OC or reproduces the response body.
 */
const OC='dori';
const API='https://www.law.go.kr/DRF/';
const query='민법';
const timeout=30000;
async function request(endpoint,params) {
  const url=new URL(endpoint,API);
  for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);
  const response=await fetch(url,{signal:AbortSignal.timeout(timeout),headers:{Accept:'application/json'}});
  const raw=await response.text();
  const contentType=response.headers.get('content-type')||'';
  const cors=response.headers.get('access-control-allow-origin')||'(absent)';
  console.log('HTTP '+response.status+'; bytes='+raw.length+'; Content-Type='+contentType+'; Allow-Origin='+cors);
  if(!response.ok)throw Error('API HTTP '+response.status);
  let data;
  try{data=JSON.parse(raw.replace(/^\uFEFF/,''));}
  catch{throw Error('API did not return JSON. Response prefix='+raw.slice(0,35).replace(/[\r\n]/g,' '));}
  if(data?.error||data?.resultCode&&String(data.resultCode)!=='00')throw Error('API application error: '+JSON.stringify({code:data.resultCode,message:data.resultMsg}));
  return data;
}
function records(data){
  const root=data?.['법령검색']||data?.['LawSearch']||data?.law||data;
  const list=root?.법령||root?.law||root?.laws;
  if(Array.isArray(list))return list;
  if(list&&typeof list==='object')return [list];
  return [];
}
async function main() {
  console.log('Law.go.kr official DRF LIVE verification; NOT mocked');
  const list=await request('lawSearch.do',{OC,target:'law',type:'JSON',query,display:'3',page:'1'});
  const rows=records(list);
  console.log('Search record count='+rows.length+'; reported total='+String(list.totalCnt??list['법령검색']?.totalCnt??'unknown'));
  if(!rows.length)throw Error('Search returned no machine-readable law records');
  const match=rows.find(x=>String(x['법령명한글']||'').includes('민법'))||rows[0];
  const mst=String(match['법령일련번호']||'');
  if(!/^\d+$/.test(mst))throw Error('Search result missing law serial number');
  console.log('Lookup target='+String(match['법령명한글'])+'; MST='+mst);
  const detail=await request('lawService.do',{OC,target:'law',type:'JSON',MST:mst});
  const original=detail['법령']||detail;
  const text=JSON.stringify(original);
  console.log('Detail received JSON; serialized bytes='+text.length);
  if(text.length<300||(!text.includes('조문내용')&&!text.includes('조문단위')))throw Error('No clause content in detail JSON');
  const preflight=new URL('lawSearch.do',API);
  const response=await fetch(preflight,{method:'OPTIONS',headers:{Origin:'https://dodam-heo.github.io','Access-Control-Request-Method':'GET'},signal:AbortSignal.timeout(15000)});
  console.log('Browser cross-origin probe: HTTP '+response.status+'; ACAO='+String(response.headers.get('access-control-allow-origin')||'(absent)'));
  console.log('LIVE_API_SEARCH_AND_DETAIL_PASS');
}
main().catch(e=>{console.error('LIVE_API_CHECK_FAIL: '+e.message);process.exitCode=1;});

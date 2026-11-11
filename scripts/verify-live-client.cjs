'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {webcrypto}=require('node:crypto');
const text=fs.readFileSync(path.join(__dirname,'../src/law-drf.js'),'utf8');
const ctx={window:{},URL,fetch,AbortSignal,TextEncoder,crypto:webcrypto,Date};
vm.runInNewContext(text,ctx,{filename:'law-drf.js'});
const api=ctx.window.LawDRF;
async function main(){
 console.log('REAL browser-facing DRF client test; native fetch, no Puter');
 const r=await api.search({query:'민법',target:'law'});
 console.log('Search returned '+r.items.length+' typed law records');
 if(!r.items.length)throw Error('Client failed to parse real official search result');
 const target=r.items[0];
 console.log('First item='+target.name+'; serial='+target.serial+'; issuer='+target.issuer);
 if(!target.serial)throw Error('Missing law identifier');
 const d=await api.detail({item:target});
 console.log('Detail returned '+d.text.length+' characters; sourceId='+d.sourceId+'; SHA256='+d.hash.length);
 if(!d.text.includes('제1조')||d.hash.length!==64)throw Error('Client failed to extract and fingerprint official clauses');
 const url='https://www.law.go.kr/DRF/lawSearch.do?OC=dori&target=law&type=JSON&query=%EB%AF%BC%EB%B2%95&display=1';
 const browser=await fetch(url,{headers:{Origin:'https://dodam-heo.github.io',Accept:'application/json'},signal:AbortSignal.timeout(20000)});
 const acao=browser.headers.get('access-control-allow-origin')||'';
 console.log('Browser-origin simulated GET HTTP '+browser.status+', Access-Control-Allow-Origin='+acao);
 if(!browser.ok||!['*','https://dodam-heo.github.io'].includes(acao))throw Error('Cross-origin GET is not permitted for GitHub Pages origin');
 console.log('NATIVE_DIRECT_LAW_SEARCH_DETAIL_BROWSER_CORS_PASS');
}
main().catch(e=>{console.error('NATIVE_DRf_LIVE_FAIL: '+e.stack);process.exitCode=1;});

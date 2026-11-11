'use strict';
const http=require('node:http');
const {timingSafeEqual}=require('node:crypto');
const fs=require('node:fs/promises');
const path=require('node:path');
const {generateProposal,isConfigured}=require('./providers.js');
const root=path.resolve(__dirname,'..');
const port=Number(process.env.PORT||3000);
const host=process.env.HOST||'127.0.0.1';
const allowedOrigins=new Set(String(process.env.AI_ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml'};
function allowOrigin(req,res){
  const origin=req.headers.origin;
  if(!origin)return true;
  if(!allowedOrigins.has(origin)&&origin!==('http://'+req.headers.host)&&origin!==('https://'+req.headers.host))return false;
  res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
  return true;
}
function authorized(req,secret=process.env.AI_ACCESS_TOKEN){
  if(!secret)return true;
  const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  const a=Buffer.from(token),b=Buffer.from(secret);
  return a.length===b.length&&timingSafeEqual(a,b);
}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
function safePath(url) {
  if(/%(?:2e|2f|5c)/i.test(url))return null;
  let pathname;
  try{pathname=decodeURIComponent(new URL(url,'http://localhost').pathname);}catch{return null;}
  if(pathname.includes('\0')||pathname.includes('\\')||pathname.split('/').includes('..'))return null;
  return pathname==='/'?'index.html':pathname.replace(/^\/+/,'');
}
async function handler(req,res){
  try{
    if(req.url?.startsWith('/api/')){
      if(!allowOrigin(req,res))return json(res,403,{error:'허용되지 않은 브라우저 출처입니다.'});
      if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
    }
    if(req.url==='/api/health')return json(res,200,{ok:true,aiConnected:isConfigured(),sourceSearchConnected:false});
    if(req.url?.startsWith('/api/assist')){
      if(req.method!=='POST')return json(res,405,{error:'POST 요청만 지원합니다.'});
      if(!authorized(req))return json(res,401,{error:'AI 서버 접근 토큰이 유효하지 않습니다.'});
      let raw='',n=0;
      for await(const chunk of req){n+=chunk.length;if(n>350000)return json(res,413,{error:'요청이 너무 큽니다.'});raw+=chunk.toString('utf8');}
      let data;
      try{data=JSON.parse(raw);}catch{return json(res,400,{error:'JSON 형식이 올바르지 않습니다.'});}
      if(!data||!['enact','amend','review'].includes(data.operation)||typeof data.instruction!=='string'||typeof data.baseText!=='string'||typeof data.draftText!=='string')return json(res,400,{error:'AI 요청 필드가 잘못되었습니다.'});
      try{return json(res,200,await generateProposal(data));}
      catch(err){return json(res,err.code||502,{error:err.message});}
    }
    if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'지원되지 않는 메서드입니다.'});
    const rel=safePath(req.url||'/');
    if(!rel||(!rel.startsWith('src/')&&rel!=='index.html'))return json(res,404,{error:'파일이 없습니다.'});
    const file=path.resolve(root,rel);
    if(!file.startsWith(root+path.sep))return json(res,404,{error:'파일이 없습니다.'});
    const buffer=await fs.readFile(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:buffer);
  }catch(err){return json(res,err.code==='ENOENT'?404:500,{error:err.code==='ENOENT'?'파일이 없습니다.':'서버 오류'});}
}
if(require.main===module){
  if(!['127.0.0.1','localhost','::1'].includes(host)&&!process.env.AI_ACCESS_TOKEN){console.error('공개 서버에 AI_ACCESS_TOKEN을 설정해야 합니다.');process.exit(1);}
  http.createServer(handler).listen(port,host,()=>console.log('규정 작업실: http://'+host+':'+port));
}
module.exports={handler,safePath,allowOrigin,authorized};

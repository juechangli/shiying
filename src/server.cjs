/* VD-ATTR-v1:​‌‌​‌‌​​​‌‌​‌​​‌​‌‌​‌‌‌​​‌‌​‌​‌​​‌‌‌​‌​‌​‌‌​​‌​‌​‌‌​​​‌‌​‌‌​‌​​​​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​​‌‌‌​​‌​‌‌‌‌​‌‌​‌​​‌​‌‌‌​​‌​​‌‌​‌‌‌‌​‌‌​‌‌‌​​‌‌​‌‌​‌​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​‌‌​​​‌​​​​​​​‌‌‌​​​‌​‌‌‌​​​‌​​‌​‌‌‌​​‌‌​​​‌‌​‌‌​‌‌‌‌​‌‌​‌‌​‌:END */
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {randomBytes,randomInt,timingSafeEqual}=require('node:crypto');
const os=require('node:os');
const token=()=>randomBytes(32).toString('base64url');
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};

class Service {
  constructor(engine,{uiDir,adminToken=token(),mobilePort=19096}={}){this.engine=engine;this.mobilePort=mobilePort;this.uiDir=uiDir;this.adminToken=adminToken;this.sessions=new Map();this.rates=new Map();this.local=null;this.lan=null;this.pair=null;this.localOrigin=null;}
  async start(){this.local=http.createServer((q,r)=>this.handle(q,r,false));await new Promise((res,rej)=>{this.local.once('error',rej);this.local.listen(0,'127.0.0.1',res);});this.localOrigin=`http://127.0.0.1:${this.local.address().port}`;return this.localOrigin;}
  async enableMobile(){if(!this.lan){this.lan=http.createServer((q,r)=>this.handle(q,r,true));try{await new Promise((res,rej)=>{this.lan.once('error',rej);this.lan.listen(this.mobilePort,'0.0.0.0',res);});}catch(e){this.lan=null;throw e;}}
    this.pair={code:String(randomInt(100000,1000000)),expires:Date.now()+5*60000};return this.mobileState();}
  mobileState(){const addresses=[];if(this.lan)for(const items of Object.values(os.networkInterfaces()))for(const a of items||[])if(a.family==='IPv4'&&!a.internal)addresses.push(`http://${a.address}:${this.lan.address().port}`);return {enabled:!!this.lan,addresses,code:this.pair?.code,expires:this.pair?.expires,devices:this.sessions.size};}
  async disableMobile(){this.sessions.clear();this.pair=null;if(this.lan){const s=this.lan;this.lan=null;s.closeAllConnections();await new Promise(r=>s.close(r));}return this.mobileState();}
  auth(req,mobile){let value;try{value=decodeURIComponent((req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('vd_session='))?.slice(11)||'');}catch{return null;}
    if(!mobile&&equal(value,this.adminToken))return {owner:'desktop',admin:true};const s=this.sessions.get(value);if(s&&s.expires>Date.now())return {owner:s.owner,admin:false};return null;}
  async body(req){if(!req.headers['content-type']?.startsWith('application/json'))throw Object.assign(Error('需要 JSON 请求'),{status:415});let n=0,parts=[];for await(const b of req){n+=b.length;if(n>16384)throw Object.assign(Error('请求过大'),{status:413});parts.push(b);}try{return JSON.parse(Buffer.concat(parts));}catch{throw Error('请求格式错误');}}
  async handle(req,res,mobile){
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    const json=(data,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));};
    try{
      const u=new URL(req.url,'http://local');
      if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)return json({error:'请求来源不允许'},403);
      if(u.pathname==='/api/hello')return json({name:'VideoDock 拾影',mobile,authenticated:!!this.auth(req,mobile)});
      if(u.pathname==='/api/pair'&&req.method==='POST'){
        if(!mobile)return json({error:'此入口仅用于手机配对'},403);
        const ip=req.socket.remoteAddress;let rate=this.rates.get(ip);if(!rate||rate.until<Date.now())rate={count:0,until:Date.now()+60000};rate.count++;this.rates.set(ip,rate);
        if(rate.count>8)return json({error:'尝试过多，请一分钟后再试'},429);
        const b=await this.body(req);if(!this.pair||this.pair.expires<Date.now()||!equal(b.code,this.pair.code))return json({error:'配对码不正确或已过期，请在电脑端重新生成'},401);
        const t=token();this.sessions.set(t,{owner:randomBytes(16).toString('hex'),expires:Date.now()+12*3600000});
        res.setHeader('Set-Cookie',`vd_session=${t}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200`);return json({ok:true});
      }
      if(u.pathname.startsWith('/api/')){
        const user=this.auth(req,mobile);if(!user)return json({error:'请先输入电脑端的配对码'},401);
        if(u.pathname==='/api/state'&&req.method==='GET')return json({jobs:this.engine.visible(user.owner,user.admin),directory:user.admin?this.engine.settings.outputDir:null,mobile,engineReady:fs.existsSync(path.join(this.engine.tools,process.platform==='win32'?'yt-dlp.exe':'yt-dlp'))});
        if(u.pathname==='/api/inspect'&&req.method==='POST'){const b=await this.body(req);return json(await this.engine.inspect(b.url));}
        if(u.pathname==='/api/jobs'&&req.method==='POST'){const b=await this.body(req);const j=this.engine.add({url:b.url,quality:b.quality,title:b.title,owner:user.owner});return json({id:j.id},201);}
        const cancel=u.pathname.match(/^\/api\/jobs\/([a-f0-9-]+)\/cancel$/);
        if(cancel&&req.method==='POST'){await this.body(req);this.engine.cancel(cancel[1],user.owner,user.admin);return json({ok:true});}
        const file=u.pathname.match(/^\/api\/files\/([a-f0-9-]+)$/);
        if(file&&req.method==='GET'){
          const j=this.engine.find(file[1],user.owner,user.admin);if(j.status!=='completed'||!j.file||!fs.existsSync(j.file))return json({error:'文件不存在或尚未完成'},404);
          const real=fs.realpathSync(j.file),root=fs.realpathSync(j.directory);if(!real.startsWith(root+path.sep))return json({error:'文件位置异常'},403);
          const stat=fs.statSync(real);if(!stat.isFile())return json({error:'文件不存在'},404);
          res.setHeader('Content-Type',real.endsWith('.mp4')?'video/mp4':'application/octet-stream');res.setHeader('Content-Disposition',`attachment; filename="video${path.extname(real)}"; filename*=UTF-8''${encodeURIComponent(path.basename(real)).replace(/'/g,'%27')}`);res.setHeader('Accept-Ranges','bytes');
          let start=0,end=stat.size-1;const range=req.headers.range;
          if(range){const m=range.match(/^bytes=(\d+)-(\d*)$/);if(!m)return json({error:'不支持的文件范围'},416);start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),end):end;if(start>end||start>=stat.size)return json({error:'文件范围错误'},416);res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${stat.size}`);}
          res.setHeader('Content-Length',end-start+1);const stream=fs.createReadStream(real,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);return;
        }
        return json({error:'接口不存在'},404);
      }
      if(req.method!=='GET')return json({error:'不支持的请求'},405);
      const route=u.pathname==='/'?'index.html':decodeURIComponent(u.pathname).slice(1);const full=path.resolve(this.uiDir,route);
      if(!full.startsWith(path.resolve(this.uiDir)+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile())return json({error:'页面不存在'},404);
      res.setHeader('Content-Type',types[path.extname(full)]||'application/octet-stream');fs.createReadStream(full).pipe(res);
    }catch(e){if(!res.headersSent)json({error:e.message||'操作失败'},e.status||400);else res.destroy();}
  }
  async close(){this.engine.shutdown();await this.disableMobile();if(this.local){this.local.closeAllConnections();await new Promise(r=>this.local.close(r));}}
}
module.exports={Service};

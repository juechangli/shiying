/* VD-ATTR-v1:​‌‌​‌‌​​​‌‌​‌​​‌​‌‌​‌‌‌​​‌‌​‌​‌​​‌‌‌​‌​‌​‌‌​​‌​‌​‌‌​​​‌‌​‌‌​‌​​​​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​​‌‌‌​​‌​‌‌‌‌​‌‌​‌​​‌​‌‌‌​​‌​​‌‌​‌‌‌‌​‌‌​‌‌‌​​‌‌​‌‌​‌​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​‌‌​​​‌​​​​​​​‌‌‌​​​‌​‌‌‌​​​‌​​‌​‌‌‌​​‌‌​​​‌‌​‌‌​‌‌‌‌​‌‌​‌‌​‌:END */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {randomBytes, createHash, timingSafeEqual} = require('node:crypto');
const CALLBACK_PATH = '/oauth/x/callback';
const URLS = Object.freeze({authorize:'https://x.com/i/oauth2/authorize',token:'https://api.x.com/2/oauth2/token',me:'https://api.x.com/2/users/me',revoke:'https://api.x.com/2/oauth2/revoke'});
const SCOPES = ['tweet.read','users.read'];
function writePrivate(file, bytes) {
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  const temp=file+'.tmp';
  try {fs.writeFileSync(temp,bytes,{mode:0o600});fs.chmodSync(temp,0o600);fs.renameSync(temp,file);} finally {fs.rmSync(temp,{force:true});}
}
function equal(a,b) {return typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
function publicError(error) {return error?.safeMessage || '无法连接 X，请检查网络后重试。授权信息没有写入日志。';}
function fail(message) {const e=new Error(message);e.safeMessage=message;return e;}
class XIdentity {
  #credentials = null;
  #pending = null;
  #epoch = 0;
  #closed = false;
  constructor({directory,crypto,openExternal,fetchImpl=fetch,port=19197}) {
    this.directory=directory;this.crypto=crypto;this.openExternal=openExternal;this.fetch=fetchImpl;this.port=port;
    this.file=path.join(directory,'x-identity.enc');this.configFile=path.join(directory,'x-config.json');
    this.clientId='';this.remember=false;this.phase='disconnected';this.message='';this.server=null;this.controller=null;this.timer=null;
    try {const c=JSON.parse(fs.readFileSync(this.configFile,'utf8'));if(typeof c.clientId==='string'&&/^[A-Za-z0-9._~+/=-]{5,256}$/.test(c.clientId))this.clientId=c.clientId;} catch {}
  }
  canSave() {try{return this.crypto.available()===true;}catch{return false;}}
  snapshot() {
    let phase=this.phase;
    if(phase==='connected'&&this.#credentials?.expiresAt<=Date.now())phase='expired';
    return {clientId:this.clientId,configured:!!this.clientId,callback:`http://127.0.0.1:${this.port||19197}${CALLBACK_PATH}`,phase,message:this.message,
      account:this.#credentials?{name:this.#credentials.user.name,username:this.#credentials.user.username}:null,
      expiresAt:this.#credentials?.expiresAt||null,remember:this.remember,canRemember:this.canSave(),saved:fs.existsSync(this.file),scopes:SCOPES};
  }
  configure(clientId) {
    if(this.#closed)throw fail('应用正在退出');
    if(this.#pending||this.phase==='checking'||this.phase==='authorizing'||this.#credentials)throw fail('请先取消授权或退出当前账号，再修改 Client ID');
    if(typeof clientId!=='string'||!/^[A-Za-z0-9._~+/=-]{5,256}$/.test(clientId.trim()))throw fail('请输入 X 开发者应用的 OAuth 2.0 Client ID，不是 Client Secret 或 Token');
    if(fs.existsSync(this.file))throw fail('请先清除已保存的授权，再更换 Client ID');
    this.clientId=clientId.trim();writePrivate(this.configFile,JSON.stringify({clientId:this.clientId}));this.message='Client ID 已保存，可以开始授权';return this.snapshot();
  }
  load() {
    if(!fs.existsSync(this.file))return this.snapshot();
    try {
      if(!this.canSave())throw Error();
      const c=JSON.parse(this.crypto.decrypt(fs.readFileSync(this.file)));
      if(c.version!==1||c.clientId!==this.clientId||!c.accessToken||typeof c.accessToken!=='string'||!Number.isFinite(c.expiresAt)||!c.user?.username||!c.user?.name)throw Error();
      this.#credentials=c;this.remember=true;this.phase='unverified';this.message='已读取加密会话，点击“检查身份”向 X 验证';
    } catch {this.phase='locked';this.message='保存的授权暂时无法读取，请解锁系统凭证存储，或清除后重新授权';}
    return this.snapshot();
  }
  #save(credentials) {
    if(!this.canSave())throw fail('系统安全存储不可用，无法记住登录；可选择仅本次使用');
    writePrivate(this.file,this.crypto.encrypt(JSON.stringify(credentials)));
  }
  #stopPending() {
    clearTimeout(this.timer);this.timer=null;this.#pending=null;
    if(this.server){this.server.closeAllConnections();this.server.close();this.server=null;}
  }
  async #request(url,init={}) {
    let response;
    try {response=await this.fetch(url,{...init,redirect:'error',signal:AbortSignal.any([this.controller?.signal||new AbortController().signal,AbortSignal.timeout(15000)])});} catch {throw fail('连接 X 超时或网络中断，请检查网络后重试');}
    if(!response.ok) {
      if([400,401].includes(response.status))throw fail('X 未接受授权：请检查 Client ID、Native App 类型和回调地址，或重新授权');
      if([402,403].includes(response.status))throw fail('X 拒绝此 API 请求，请检查开发者应用权限、访问额度和控制台状态');
      if(response.status===429)throw fail('X 请求过于频繁，请稍后重试');
      throw fail('X 服务暂时不可用，请稍后重试');
    }
    try {return await response.json();} catch {throw fail('X 返回的数据格式异常');}
  }
  async #token(fields) {
    const data=await this.#request(URLS.token,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...fields,client_id:this.clientId})});
    const ttl=Number(data.expires_in);
    if(typeof data.access_token!=='string'||data.access_token.length>16384||!data.access_token||!Number.isFinite(ttl)||ttl<=0||ttl>31536000)throw fail('X 返回的授权信息不完整，请重新授权');
    if(data.token_type&&String(data.token_type).toLowerCase()!=='bearer')throw fail('X 返回的令牌类型不受支持');
    if(typeof data.scope==='string'&&SCOPES.some(s=>!data.scope.split(' ').includes(s)))throw fail('没有获得身份查询所需的授权范围');
    return {version:1,clientId:this.clientId,accessToken:data.access_token,refreshToken:typeof data.refresh_token==='string'?data.refresh_token:null,expiresAt:Date.now()+ttl*1000,user:null};
  }
  async #profile(credentials) {
    const data=await this.#request(URLS.me,{headers:{Authorization:'Bearer '+credentials.accessToken}});
    if(typeof data.data?.username!=='string'||typeof data.data?.name!=='string')throw fail('X 没有返回有效的账号身份');
    return {name:data.data.name.slice(0,100),username:data.data.username.slice(0,100)};
  }
  async begin({remember=false}={}) {
    if(this.#closed)throw fail('应用正在退出');
    if(!this.clientId)throw fail('请先填写 OAuth 2.0 Client ID');
    if(this.#pending||this.phase==='checking'||this.phase==='authorizing')throw fail('已有授权操作进行中');
    if(this.#credentials||fs.existsSync(this.file))throw fail('请先退出并清除当前授权，再连接账号');
    if(typeof remember!=='boolean')throw fail('保存选项无效');
    if(remember&&!this.canSave())throw fail('系统安全存储不可用，请选择仅本次使用');
    const epoch=++this.#epoch;this.controller=new AbortController();this.phase='authorizing';this.message='请在 X 官方页面完成授权；授权窗口十分钟内有效';
    const verifier=randomBytes(48).toString('base64url'),state=randomBytes(32).toString('base64url');
    this.#pending={epoch,verifier,state,remember,used:false};
    this.server=http.createServer((q,r)=>{void this.#callback(q,r);});
    try {
      const srv=this.server;
      await new Promise((resolve,reject)=>{srv.once('error',reject);srv.listen(this.port,'127.0.0.1',resolve);});
      if(epoch!==this.#epoch||this.#closed){srv.close();throw fail('授权已取消');}
      const redirect=`http://127.0.0.1:${srv.address().port}${CALLBACK_PATH}`;this.#pending.redirect=redirect;
      this.timer=setTimeout(()=>{if(epoch===this.#epoch){this.cancel();this.message='授权已超时，请重新开始';}},10*60*1000);this.timer.unref?.();
      const url=new URL(URLS.authorize);url.search=new URLSearchParams({response_type:'code',client_id:this.clientId,redirect_uri:redirect,scope:[...SCOPES,...(remember?['offline.access']:[])].join(' '),state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).toString();
      await this.openExternal(url.href);return this.snapshot();
    } catch(e) {if(epoch===this.#epoch){this.#stopPending();this.phase='disconnected';this.message=e.code==='EADDRINUSE'?'授权回调端口 19197 被占用，请关闭占用程序后重试':publicError(e);}throw fail(this.message||'授权已取消');}
  }
  async #callback(req,res) {
    const answer=(code,text)=>{if(res.destroyed)return;res.writeHead(code,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"});res.end('<!doctype html><meta charset="utf-8"><title>拾影账号授权</title><h1>'+text+'</h1><p>请返回拾影查看状态。可以关闭此页。</p>');};
    const p=this.#pending;let u;try {u=new URL(req.url,p?.redirect||'http://127.0.0.1');}catch {return answer(400,'无效的回调请求');}
    if(!p?.redirect||req.method!=='GET'||u.pathname!==CALLBACK_PATH)return answer(404,'此授权入口不可用');
    if(req.headers.host!==new URL(p.redirect).host||u.searchParams.getAll('state').length!==1||!equal(u.searchParams.get('state'),p.state)||p.used)return answer(400,'授权请求不匹配，请返回拾影重新开始');
    p.used=true;
    if(u.searchParams.has('error')){answer(200,'授权未完成');this.cancel();this.message='你取消了 X 授权';return;}
    const code=u.searchParams.get('code');if(!code||code.length>4096||u.searchParams.getAll('code').length!==1){answer(400,'授权回调缺少有效代码');this.cancel();return;}
    let credentials;
    try {
      credentials=await this.#token({grant_type:'authorization_code',code,redirect_uri:p.redirect,code_verifier:p.verifier});
      if(p.epoch!==this.#epoch||this.#closed)return answer(409,'授权已取消');
      credentials.user=await this.#profile(credentials);
      if(p.epoch!==this.#epoch||this.#closed)return answer(409,'授权已取消');
      if(p.remember)this.#save(credentials);
      this.#credentials=credentials;this.remember=p.remember;this.phase='connected';this.message=p.remember?'账号身份已确认，授权已加密保存':'账号身份已确认，仅在本次运行中保留';
      answer(200,'X 身份授权成功');
    } catch(e) {if(p.epoch===this.#epoch){this.phase='disconnected';this.message=publicError(e);}answer(400,'授权未能完成，请回到拾影查看原因');}
    finally {if(p.epoch===this.#epoch){clearTimeout(this.timer);this.#pending=null;const s=this.server;this.server=null;if(s)s.close();}}
  }
  cancel() {
    ++this.#epoch;this.controller?.abort();this.#stopPending();this.phase=this.#credentials?'unverified':'disconnected';this.message='授权已取消';return this.snapshot();
  }
  async check() {
    if(this.#closed||!this.#credentials)throw fail('请先连接 X 账号');
    if(this.phase==='checking'||this.#pending)throw fail('已有授权操作进行中');
    const epoch=++this.#epoch;this.controller=new AbortController();this.phase='checking';this.message='正在向 X 验证账号身份';let c={...this.#credentials};
    try {
      if(c.expiresAt<=Date.now()+30000) {
        if(!c.refreshToken)throw fail('授权已过期，请退出后重新连接');
        const fresh=await this.#token({grant_type:'refresh_token',refresh_token:c.refreshToken});
        c={...fresh,refreshToken:fresh.refreshToken||c.refreshToken};
        if(epoch!==this.#epoch||this.#closed)return this.snapshot();
        // Persist a rotated refresh token before the following profile request.
        if(this.remember)this.#save({...c,user:this.#credentials.user});
        this.#credentials={...c,user:this.#credentials.user};
      }
      c.user=await this.#profile(c);
      if(epoch!==this.#epoch||this.#closed)return this.snapshot();
      if(this.remember)this.#save(c);this.#credentials=c;this.phase='connected';this.message='X 账号身份已确认';
    } catch(e) {if(epoch===this.#epoch){this.phase='unverified';this.message=publicError(e);}}
    return this.snapshot();
  }
  setRemember(value) {
    if(this.#closed||typeof value!=='boolean')throw fail('保存选项无效');
    if(this.#pending||this.phase==='checking')throw fail('请等待当前授权操作结束');
    if(value) {if(!this.#credentials)throw fail('请先连接账号');this.#save(this.#credentials);}
    else fs.rmSync(this.file,{force:true});
    this.remember=value;this.message=value?'授权已加密保存；未申请离线权限的会话到期后仍需重新授权':'已删除保存的授权，本次会话保留至退出';return this.snapshot();
  }
  async disconnect() {
    const c=this.#credentials;
    const epoch=++this.#epoch;this.controller?.abort();this.#stopPending();this.#credentials=null;this.remember=false;this.phase='disconnected';
    try {fs.rmSync(this.file,{force:true});} catch {this.phase='locked';this.message='内存会话已清除，但保存文件未能删除，请检查文件权限后再次清除';throw fail(this.message);}
    this.message='本机授权已清除';
    if(c) {
      let ok=true;
      // Revocation is best-effort and never restores locally cleared credentials.
      for(const token of new Set([c.refreshToken,c.accessToken].filter(Boolean))) {
        try {const r=await this.fetch(URLS.revoke,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token,client_id:this.clientId}),redirect:'error',signal:AbortSignal.timeout(8000)});if(!r.ok)ok=false;}catch{ok=false;}
      }
      if(epoch===this.#epoch&&!this.#closed&&!this.#credentials&&!this.#pending)this.message=ok?'本机授权已清除，并已向 X 撤销授权':'本机授权已清除；远端撤销未确认，可在 X 的“已连接应用”中撤销';
    }
    return this.snapshot();
  }
  close() {this.#closed=true;++this.#epoch;this.controller?.abort();this.#stopPending();this.#credentials=null;this.phase='disconnected';}
}
module.exports={XIdentity,URLS,SCOPES};

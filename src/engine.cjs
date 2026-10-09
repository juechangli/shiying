/* VD-ATTR-v1:​‌‌​‌‌​​​‌‌​‌​​‌​‌‌​‌‌‌​​‌‌​‌​‌​​‌‌‌​‌​‌​‌‌​​‌​‌​‌‌​​​‌‌​‌‌​‌​​​​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​​‌‌‌​​‌​‌‌‌‌​‌‌​‌​​‌​‌‌‌​​‌​​‌‌​‌‌‌‌​‌‌​‌‌‌​​‌‌​‌‌​‌​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​‌‌​​​‌​​​​​​​‌‌‌​​​‌​‌‌‌​​​‌​​‌​‌‌‌​​‌‌​​​‌‌​‌‌​‌‌‌‌​‌‌​‌‌​‌:END */
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {randomUUID} = require('node:crypto');
const {EventEmitter} = require('node:events');

function validateURL(value) {
  if (typeof value !== 'string' || value.length > 4096) throw Error('请输入有效的视频网址');
  let u; try { u = new URL(value.trim()); } catch { throw Error('请输入完整的视频网址，例如 https://www.bilibili.com/video/…'); }
  if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password) throw Error('仅支持不含账号密码的 HTTP / HTTPS 网址');
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || !h.includes('.') || /^[\d.]+$/.test(h) || h.includes(':')) throw Error('请使用公开视频网站的域名，不支持本机或 IP 地址');
  return u.href;
}
function atomically(filename, data) {
  fs.mkdirSync(path.dirname(filename), {recursive:true});
  const tmp = filename + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(data,null,2), {mode:0o600}); fs.renameSync(tmp,filename);
}
function stopProcess(child) {
  if (!child?.pid) return;
  if (process.platform === 'win32') spawn('taskkill', ['/PID',String(child.pid),'/T','/F'], {windowsHide:true,stdio:'ignore'});
  else { try {process.kill(-child.pid,'SIGTERM');} catch {child.kill('SIGTERM');} }
}
class Engine extends EventEmitter {
  constructor({stateDir,outputDir,tools,spawnProcess=spawn}) {
    super(); this.stateDir=stateDir; this.tools=tools; this.spawnProcess=spawnProcess; this.children=new Map(); this.inspections=new Set(); this.inspectCount=0;
    this.file=path.join(stateDir,'history.json'); this.settingsFile=path.join(stateDir,'settings.json');
    try {this.settings=JSON.parse(fs.readFileSync(this.settingsFile));} catch {this.settings={outputDir};}
    this.settings.outputDir ||= outputDir;
    try {this.jobs=JSON.parse(fs.readFileSync(this.file));} catch {this.jobs=[];}
    for (const j of this.jobs) if (['queued','downloading','merging'].includes(j.status)) {j.status='interrupted';j.error='上次退出时任务尚未完成，可重新下载';}
    this.persist(); this.stopping=false;
  }
  persist(){atomically(this.file,this.jobs.slice(-200));}
  change(){this.emit('change');}
  setDirectory(dir){if(typeof dir!=='string'||!path.isAbsolute(dir))throw Error('请选择完整的文件夹路径');fs.mkdirSync(dir,{recursive:true});fs.accessSync(dir,fs.constants.W_OK);this.settings.outputDir=dir;atomically(this.settingsFile,this.settings);return dir;}
  executable(){const filename=path.join(this.tools,process.platform==='win32'?'yt-dlp.exe':'yt-dlp');if(!fs.existsSync(filename))throw Error('下载组件缺失，请重新安装应用');return filename;}
  common(){return ['--ignore-config','--no-playlist','--no-colors','--no-warnings','--socket-timeout','25','--retries','2'];}
  async inspect(value) {
    const url=validateURL(value);if(this.inspectCount>=2)throw Error('正在解析其他视频，请稍后');this.inspectCount++;
    try{return await new Promise((resolve,reject)=>{
      const child=this.spawnProcess(this.executable(),[...this.common(),'--skip-download','--dump-single-json','--',url],{windowsHide:true,detached:process.platform!=='win32'});
      this.inspections.add(child);let out='',err='';const timer=setTimeout(()=>{stopProcess(child);reject(Error('解析超时，请检查网址或网络'));},60000);
      child.stdout.on('data',b=>{out+=b;if(out.length>12e6){stopProcess(child);reject(Error('视频信息过大，请使用单个视频链接'));}});
      child.stderr.on('data',b=>{err=(err+b).slice(-2000);});
      child.on('error',e=>{clearTimeout(timer);this.inspections.delete(child);reject(e);});
      child.on('close',code=>{clearTimeout(timer);this.inspections.delete(child);if(code)return reject(Error(cleanError(err)));try{const d=JSON.parse(out);resolve({title:d.title||'未命名视频',duration:d.duration||0,uploader:d.uploader||'',site:d.extractor_key||new URL(url).hostname,id:d.id,formats:(d.formats||[]).filter(f=>f.vcodec!=='none').map(f=>({width:f.width,height:f.height})).slice(-20)});}catch{reject(Error('无法解析此视频，请检查链接是否指向单个视频'));}});
    });}finally{this.inspectCount--;}
  }
  add({url,quality='best',title,owner='desktop'}) {
    url=validateURL(url);if(!['best','1080','720','480'].includes(quality))throw Error('不支持的画质');
    if(this.jobs.filter(j=>['queued','downloading','merging'].includes(j.status)).length>=8)throw Error('最多同时排队 8 个任务，请等待下载完成');
    const duplicate=this.jobs.find(j=>j.url===url&&j.owner===owner&&['queued','downloading','merging'].includes(j.status));if(duplicate)return duplicate;
    const dir=this.settings.outputDir;fs.mkdirSync(dir,{recursive:true});fs.accessSync(dir,fs.constants.W_OK);
    const j={id:randomUUID(),owner,url,title:String(title||new URL(url).hostname).slice(0,200),quality,directory:dir,status:'queued',progress:0,created:Date.now(),file:null,error:null};
    this.jobs.push(j);this.persist();this.change();this.pump();return j;
  }
  pump(){if(this.stopping||this.children.size)return;const j=this.jobs.find(j=>j.status==='queued');if(j)this.run(j);}
  run(j) {
    j.status='downloading';j.phase='preparing';j.progress=null;j.started=Date.now();this.change();
    let executable;try{executable=this.executable();}catch(e){j.status='failed';j.error=e.message;this.persist();this.change();this.pump();return;}
    const args=[...this.common(),'--progress','--newline','--no-overwrites','--continue','--no-simulate','--ffmpeg-location',this.tools,
      '--format','bv[ext=mp4][vcodec^=avc1]+ba[ext=m4a]/b[ext=mp4]/bv[ext=mp4]+ba[ext=m4a]/bv+ba/b',
      '--merge-output-format','mp4/mkv','--windows-filenames','--paths',j.directory,'--output','%(title).140B [%(id)s].%(ext)s',
      '--progress-template','download:VIDEODOCK_PROGRESS:%(progress)j','--print','before_dl:VIDEODOCK_TITLE:%(title)j','--print','after_move:VIDEODOCK_FILE:%(filepath)j'];
    if(j.quality!=='best')args.push('--format-sort',`res:${j.quality}`);
    args.push('--',j.url);
    const child=this.spawnProcess(executable,args,{windowsHide:true,detached:process.platform!=='win32'});this.children.set(j.id,child);
    let buffer='',errorBuffer='',errors='',reportedFile=null,done=false;
    const line=text=>{
      try {
        if(text.startsWith('VIDEODOCK_PROGRESS:')){const p=JSON.parse(text.slice(19));j.phase='transferring';j.downloadedBytes=p.downloaded_bytes||0;j.progress=p.total_bytes||p.total_bytes_estimate?Math.min(100,Math.round(100*(p.downloaded_bytes||0)/(p.total_bytes||p.total_bytes_estimate))):null;j.speed=p.speed||0;j.eta=p.eta??null;j.status='downloading';if(p.status==='finished')j.phase='processing';this.change();}
        else if(text.startsWith('VIDEODOCK_TITLE:'))j.title=String(JSON.parse(text.slice(16))).slice(0,200);
        else if(text.startsWith('VIDEODOCK_FILE:'))reportedFile=JSON.parse(text.slice(15));
        else if(text.includes('[Merger]')){j.status='merging';this.change();}
      } catch {/* Ignore unrelated output from a supported extractor. */}
    };
    child.stdout.on('data',b=>{buffer+=b;const lines=buffer.split(/\r?\n/);buffer=lines.pop();for(const text of lines)line(text);if(buffer.length>2e6)buffer='';});
    child.stderr.on('data',b=>{errors=(errors+b).slice(-5000);errorBuffer+=b;const lines=errorBuffer.split(/\r?\n/);errorBuffer=lines.pop();for(const text of lines)line(text);if(errorBuffer.length>2e6)errorBuffer='';});
    const finish=(code,error)=>{if(done)return;done=true;if(buffer)line(buffer);if(errorBuffer)line(errorBuffer);this.children.delete(j.id);
      if(j.status!=='cancelled'){
        if(code===0&&reportedFile){try{const real=fs.realpathSync(reportedFile),root=fs.realpathSync(j.directory);if(!real.startsWith(root+path.sep)||!fs.statSync(real).isFile())throw Error('文件位置异常');j.file=real;j.size=fs.statSync(real).size;j.status='completed';j.progress=100;}catch(e){j.status='failed';j.error=e.message;}}
        else {j.status='failed';j.error=cleanError(error?.message||errors||'下载未完成');}
      }
      j.finished=Date.now();this.persist();this.change();this.pump();
    };
    child.on('error',e=>finish(1,e));child.on('close',code=>finish(code));
  }
  cancel(id,owner,admin=false){const j=this.find(id,owner,admin);if(!['queued','downloading','merging'].includes(j.status))return;j.status='cancelled';stopProcess(this.children.get(id));this.persist();this.change();this.pump();}
  find(id,owner,admin=false){const j=this.jobs.find(j=>j.id===id&&(admin||j.owner===owner));if(!j)throw Error('任务不存在');return j;}
  visible(owner,admin=false){return this.jobs.filter(j=>admin||j.owner===owner).slice(-100).reverse().map(j=>{const {directory,file,url,...safe}=j;return {...safe,filename:file?path.basename(file):null,...(admin?{directory,url}:{}),downloadable:j.status==='completed'&&Boolean(file)&&fs.existsSync(file)};});}
  shutdown(){this.stopping=true;for(const c of this.children.values())stopProcess(c);for(const c of this.inspections)stopProcess(c);}
}
function cleanError(s){return String(s).replace(/\x1b\[[0-9;]*m/g,'').split('\n').filter(x=>x.includes('ERROR:')).slice(-1).join(' ').replace(/^ERROR:\s*/,'').slice(0,450)||String(s).trim().slice(-450)||'下载失败，请检查网址、网络或网站访问权限';}
module.exports={Engine,validateURL,atomically};

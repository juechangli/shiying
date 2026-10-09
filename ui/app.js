/* VD-ATTR-v1:​‌‌​‌‌​​​‌‌​‌​​‌​‌‌​‌‌‌​​‌‌​‌​‌​​‌‌‌​‌​‌​‌‌​​‌​‌​‌‌​​​‌‌​‌‌​‌​​​​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​​‌‌‌​​‌​‌‌‌‌​‌‌​‌​​‌​‌‌‌​​‌​​‌‌​‌‌‌‌​‌‌​‌‌‌​​‌‌​‌‌​‌​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​‌‌​​​‌​​​​​​​‌‌‌​​​‌​‌‌‌​​​‌​​‌​‌‌‌​​‌‌​​​‌‌​‌‌​‌‌‌‌​‌‌​‌‌​‌:END */
(() => {
const $=id=>document.getElementById(id),desktop=window.desktop;
let state={jobs:[]},preview=null,view='download',signature='',online=false,poll;
document.body.classList.add(desktop?'is-desktop':'is-mobile');
async function api(route,body){const r=await fetch('/api/'+route,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(route==='inspect'?70000:15000),body:body===undefined?undefined:JSON.stringify(body)});const d=await r.json();if(!r.ok){if(r.status===401&&!desktop&&!$('pair-dialog').open)$('pair-dialog').showModal();throw Error(d.error||'请求失败');}return d;}
async function native(promise){const r=await promise;if(!r.ok)throw Error(r.error);return r.data;}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),4500);}
function error(text){$('form-error').textContent=text;$('form-error').classList.toggle('hidden',!text);$('url').setAttribute('aria-invalid',String(Boolean(text)));if(text){toast(text);$('form-error').scrollIntoView({block:'nearest',behavior:'smooth'});}}
const bytes=n=>{if(!Number.isFinite(n))return '';return n>=1024**3?(n/1024**3).toFixed(2)+' GB':n>=1024**2?(n/1024**2).toFixed(1)+' MB':(n/1024).toFixed(0)+' KB';};
const duration=n=>Number.isFinite(n)&&n>0?`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`:'时长待确认';
const labels={queued:'等待下载',downloading:'下载中',merging:'正在合并音视频',completed:'已完成',cancelled:'已取消',failed:'下载失败',interrupted:'上次下载已中断'};
function go(name){view=name;for(const k of ['download','history','mobile','account']){$(k+'-view').classList.toggle('hidden',k!==name);$('nav-'+k)?.classList.toggle('active',k===name);}$('breadcrumb-current').textContent={download:'视频下载',history:'下载记录',mobile:'连接手机',account:'账号授权'}[name];render(true);}
function jobCard(j){
 const card=document.createElement('article');card.className='job '+j.status;const icon=document.createElement('div');icon.className='job-icon';icon.textContent=j.status==='completed'?'✓':j.status==='failed'?'!':'↓';
 const content=document.createElement('div');content.className='job-content';const top=document.createElement('div');top.className='job-top';const title=document.createElement('strong');title.textContent=j.title;title.title=j.title;const status=document.createElement('span');status.className='job-status';status.textContent=j.status==='downloading'&&j.phase==='preparing'?'正在获取视频信息':labels[j.status]||j.status;top.append(title,status);
 const meta=document.createElement('div');meta.className='job-meta';meta.textContent=j.status==='downloading'?`${j.phase==='preparing'?'已开始 · 正在连接网站，请稍候':j.phase==='processing'?'分段下载完成，正在处理音视频':j.progress==null?'正在下载 · '+bytes(j.downloadedBytes||0):j.progress+'%'}${j.speed?' · '+bytes(j.speed)+'/s':''}${j.eta?' · 剩余 '+Math.ceil(j.eta)+' 秒':''}`:j.status==='completed'?`100% · ${bytes(j.size)} · ${j.filename||'视频文件'}`:j.error||new Date(j.created).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});content.append(top,meta);
 if(['downloading','merging','queued'].includes(j.status)){const track=document.createElement('div');track.className='progress';const bar=document.createElement('div');bar.style.width=(j.status==='merging'?100:j.progress??25)+'%';if(j.progress==null)track.classList.add('indeterminate');track.append(bar);content.append(track);}
 const controls=document.createElement('div');controls.className='job-actions';
 const button=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){toast(e.message);}finally{b.disabled=false;}};controls.append(b);};
 if(['queued','downloading','merging'].includes(j.status))button('取消',async()=>{await api(`jobs/${j.id}/cancel`,{});await refresh();});
 if(j.status==='completed'&&j.downloadable){if(desktop)button('查看文件 ↗',()=>native(desktop.reveal(j.id)));else{const a=document.createElement('a');a.href='/api/files/'+j.id;a.textContent='保存到手机 ↓';a.download=j.filename||'video.mp4';controls.append(a);}}
 if(desktop&&['failed','cancelled','interrupted'].includes(j.status)&&j.url)button('重试',async()=>{await api('jobs',{url:j.url,quality:j.quality,title:j.title});await refresh();});
 card.append(icon,content,controls);return card;
}
function render(force=false){const next=JSON.stringify(state.jobs);if(next===signature&&!force)return;signature=next;const active=state.jobs.filter(j=>['queued','downloading','merging'].includes(j.status));const recent=state.jobs.filter(j=>!active.includes(j));$('task-count').textContent=active.length;$('history-count').textContent=recent.length;
 $('tasks').replaceChildren(...[...active,...recent.slice(0,3)].map(jobCard));$('empty').classList.toggle('hidden',state.jobs.length>0);$('history').replaceChildren(...recent.map(jobCard));if(!recent.length){const p=document.createElement('p');p.className='empty-text';p.textContent='还没有下载记录，先保存一个喜欢的视频吧。';$('history').append(p);}}
async function refresh(){try{state=await api('state');online=true;$('directory').textContent=desktop?state.directory:'下载完成后，点击「保存到手机」';$('directory').title=state.directory||'';if(!state.engineReady)error('下载组件不可用，请检查电脑端安装。');render();}catch(e){online=false;error('连接下载服务失败，请重新打开应用。'+(e.name==='TimeoutError'?' 请求已超时。':''));}}
async function submit(inspectOnly){if($('download').disabled)return;const url=$('url').value.trim();if(!url){$('url').focus();return error('先粘贴一个视频链接。');}try{const parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol)||!parsed.hostname.includes('.')||/https?:\/\//i.test(parsed.pathname))throw Error();}catch{$('url').focus();return error('链接格式不正确：请清空输入框，重新粘贴一个完整的视频网址。');}error('');$('inspect').disabled=$('download').disabled=true;
 const b=inspectOnly?$('inspect'):$('download'),old=b.textContent;b.textContent=inspectOnly?'正在解析…':'加入任务…';
 try{if(inspectOnly){preview=await api('inspect',{url});preview.url=url;$('preview-title').textContent=preview.title;$('preview-detail').textContent=[preview.site,preview.uploader,duration(preview.duration)].filter(Boolean).join(' · ');$('preview').classList.remove('hidden');}else{await api('jobs',{url,quality:$('quality').value,title:preview?.url===url?preview.title:undefined});toast('已开始下载，进度显示在下方');await refresh();$('tasks').scrollIntoView({block:'nearest',behavior:'smooth'});}}
 catch(e){error(e.name==='TimeoutError'?'请求超时，请检查网络后重试。':e.message);}finally{$('inspect').disabled=$('download').disabled=false;b.textContent=old;}}
$('inspect').onclick=()=>submit(true);$('download').onclick=()=>submit(false);$('url').onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();submit(false);}};$('url').oninput=()=>{$('preview').classList.add('hidden');preview=null;error('');};$('url').onpaste=e=>{const text=e.clipboardData?.getData('text').trim();if(text&&/^https?:\/\//i.test(text)){e.preventDefault();$('url').value=text;$('url').dispatchEvent(new Event('input'));toast('已替换为新链接，点击「开始下载」即可');}};$('clear-url').onclick=()=>{$('url').value='';error('');preview=null;$('preview').classList.add('hidden');$('url').focus();};
for(const v of ['download','history','mobile','account'])$('nav-'+v).onclick=()=>go(v);
if(desktop){
 $('choose-folder').onclick=async()=>{try{const dir=await native(desktop.chooseDirectory());if(dir){$('directory').textContent=dir;toast('新的下载会保存到此文件夹');}}catch(e){toast(e.message);}};
 $('open-folder').onclick=()=>native(desktop.openDirectory()).catch(e=>toast(e.message));
 $('enable-mobile').onclick=async()=>{try{const d=await native(desktop.enableMobile());$('mobile-connection').classList.remove('hidden');$('disable-mobile').classList.remove('hidden');$('enable-mobile').textContent='重新生成配对码';$('pair-code').textContent=d.code;$('addresses').replaceChildren(...d.addresses.map(url=>{const p=document.createElement('p');p.textContent=url;return p;}));if(d.qr)$('qr').src=d.qr;else toast('没有检测到局域网地址，请先连接 Wi-Fi');}catch(e){toast(e.message);}};
 $('disable-mobile').onclick=async()=>{try{await native(desktop.disableMobile());$('mobile-connection').classList.add('hidden');$('disable-mobile').classList.add('hidden');$('enable-mobile').textContent='开启手机连接';toast('手机访问已关闭');}catch(e){toast(e.message);}};
}else{$('directory-label').textContent='手机保存方式';$('platform-tip').textContent='下载在连接的电脑上完成。点击「保存到手机」后，在浏览器中保存到“文件”或下载目录。';}
$('pair-form').onsubmit=async e=>{e.preventDefault();try{await api('pair',{code:$('code').value.trim()});$('pair-dialog').close();$('code').value='';await refresh();}catch(err){$('pair-error').textContent=err.message;}};
async function boot(){try{const h=await api('hello');if(!h.authenticated&&!desktop)$('pair-dialog').showModal();else await refresh();}catch{error('无法连接下载服务。');}poll=setInterval(refresh,1200);}
if(!desktop&&window.isSecureContext&&'serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
boot();

})();

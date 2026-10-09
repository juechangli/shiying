const path=require('node:path');const fs=require('node:fs');const os=require('node:os');const assert=require('node:assert/strict');
const {Engine}=require('../src/engine.cjs');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'videodock-real-'));
const e=new Engine({stateDir:path.join(dir,'state'),outputDir:path.join(dir,'中文 视频'),tools:path.join(__dirname,'../vendor/mac-arm64')});
const url='https://www.bilibili.com/video/BV15Ct66VEK4/';
(async()=>{
 const p=await e.inspect(url);assert.equal(p.id,'BV15Ct66VEK4');console.log('Metadata verified:',p.title,p.duration);
 const j=e.add({url,title:p.title});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Download timed out')),180000);e.on('change',()=>{if(j.status==='completed'){clearTimeout(timer);resolve();}else if(j.status==='failed'){clearTimeout(timer);reject(Error(j.error));}});});
 assert.ok(j.size>1000000);assert.ok(j.file.endsWith('.mp4'));console.log(JSON.stringify({status:j.status,file:j.file,size:j.size}));
 fs.mkdirSync(path.join(__dirname,'../private'),{recursive:true});fs.writeFileSync(path.join(__dirname,'../private/download-test.json'),JSON.stringify({at:new Date().toISOString(),title:p.title,file:j.file,size:j.size},null,2));
})().catch(err=>{console.error(err);process.exitCode=1;}).finally(()=>e.shutdown());

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {once}=require('node:events');
const {Engine,validateURL}=require('../src/engine.cjs');const {Service}=require('../src/server.cjs');
test('input validation rejects local files, command schemes and credentials',()=>{for(const u of ['file:///etc/passwd','javascript:alert(1)','https://u:p@example.com','http://127.0.0.1:1234/','http://localhost/'])assert.throws(()=>validateURL(u));assert.match(validateURL(' https://www.bilibili.com/video/BV15Ct66VEK4/ '),/^https:/);});
test('phone access is paired, isolated and revocable',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'videodock-test-'));const engine=new Engine({stateDir:dir,outputDir:path.join(dir,'output'),tools:dir});
 const service=new Service(engine,{uiDir:path.join(__dirname,'../ui'),mobilePort:0});await service.start();
 const local=service.localOrigin;await service.enableMobile();const lan=`http://127.0.0.1:${service.lan.address().port}`;
 const req=async(base,route,cookie,body,origin)=>{const r=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{...(cookie?{Cookie:cookie}:{}),'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 try{
  const desktop='vd_session='+service.adminToken;
  await t.test('anonymous clients cannot list tasks',async()=>assert.equal((await req(lan,'/api/state')).status,401));
  await t.test('admin token is not accepted by LAN listener',async()=>assert.equal((await req(lan,'/api/state',desktop)).status,401));
  await t.test('cross-origin state changes are rejected',async()=>assert.equal((await req(lan,'/api/pair',null,{code:service.pair.code},'http://evil.example')).status,403));
  assert.equal((await req(lan,'/api/pair',null,{code:'000000'})).status,401);
  const a=await req(lan,'/api/pair',null,{code:service.pair.code}),b=await req(lan,'/api/pair',null,{code:service.pair.code});assert.equal(a.status,200);assert.equal(b.status,200);
  const owner=service.auth({headers:{cookie:a.cookie}},true).owner;
  engine.stopping=true;const j=engine.add({url:'https://www.bilibili.com/video/BV15Ct66VEK4/',owner});
  await t.test('each phone sees only its own tasks',async()=>{assert.equal((await req(lan,'/api/state',a.cookie)).data.jobs.length,1);assert.equal((await req(lan,'/api/state',b.cookie)).data.jobs.length,0);assert.equal((await req(lan,`/api/jobs/${j.id}/cancel`,b.cookie,{})).status,400);});
  await t.test('phone cannot choose filesystem destinations',async()=>{assert.equal((await req(lan,'/api/settings',a.cookie,{directory:'/tmp'})).status,404);assert.equal((await req(lan,'/api/state',a.cookie)).data.directory,null);});
  await t.test('duplicate active requests do not start another job',()=>{assert.equal(engine.add({url:j.url,owner}).id,j.id);});
  await t.test('file route verifies ownership and real path',async()=>{fs.mkdirSync(j.directory,{recursive:true});j.file=path.join(j.directory,'test.mp4');fs.writeFileSync(j.file,'safe-video');j.status='completed';const r=await fetch(lan+'/api/files/'+j.id,{headers:{Cookie:a.cookie}});assert.equal(r.status,200);assert.equal(await r.text(),'safe-video');assert.equal((await req(lan,'/api/files/'+j.id,b.cookie)).status,400);const other=path.join(dir,'private.txt');fs.writeFileSync(other,'secret');fs.unlinkSync(j.file);fs.symlinkSync(other,j.file);assert.equal((await req(lan,'/api/files/'+j.id,a.cookie)).status,403);});
  await t.test('disabling sharing invalidates phone credentials',async()=>{await service.disableMobile();assert.equal((await req(local,'/api/state',a.cookie)).status,401);});
 }finally{await service.close();fs.rmSync(dir,{recursive:true,force:true});}
});

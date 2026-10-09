'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {XIdentity,URLS}=require('../src/auth/x-identity.cjs');
function fixture(t,overrides={}) {
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'shiying-auth-'));
 const key=crypto.randomBytes(32);let opened;const calls=[];
 const vault={available:()=>true,encrypt:s=>{const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key,iv);const b=Buffer.concat([c.update(s),c.final()]);return Buffer.concat([iv,c.getAuthTag(),b]);},decrypt:b=>{const d=crypto.createDecipheriv('aes-256-gcm',key,b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return Buffer.concat([d.update(b.subarray(28)),d.final()]).toString();}};
 const options={directory,port:0,crypto:vault,openExternal:async url=>{opened=new URL(url);},fetchImpl:async(url,init)=>{calls.push({url,init});if(url===URLS.token)return Response.json({access_token:'test-access-sensitive',refresh_token:'test-refresh-sensitive',expires_in:3600,token_type:'bearer',scope:'tweet.read users.read'});if(url===URLS.me)return Response.json({data:{name:'Test Person',username:'tester'}});if(url===URLS.revoke)return new Response(null,{status:200});throw Error('unexpected endpoint');},...overrides};
 const auth=new XIdentity(options);auth.configure('public-client-id');
 t.after(()=>{auth.close();fs.rmSync(directory,{recursive:true,force:true});});
 return {auth,options,calls,get opened(){return opened;},callback:()=>{const u=new URL(opened.searchParams.get('redirect_uri'));u.searchParams.set('state',opened.searchParams.get('state'));u.searchParams.set('code','test-code');return u;}};
}
test('temporary PKCE authorization exposes identity only, no tokens on disk',async t=>{
 const f=fixture(t);await f.auth.begin();assert.equal(f.opened.origin,'https://x.com');assert.equal(f.opened.searchParams.get('code_challenge_method'),'S256');assert(!f.opened.searchParams.get('scope').includes('offline.access'));
 assert.equal((await fetch(f.callback())).status,200);assert.equal(f.auth.snapshot().phase,'connected');assert.deepEqual(f.auth.snapshot().account,{name:'Test Person',username:'tester'});
 assert(!JSON.stringify(f.auth.snapshot()).includes('sensitive'));assert(!fs.existsSync(f.auth.file));
 const token=f.calls.find(c=>c.url===URLS.token);assert.equal(crypto.createHash('sha256').update(token.init.body.get('code_verifier')).digest('base64url'),f.opened.searchParams.get('code_challenge'));
 assert(!token.init.body.has('client_secret'));assert.deepEqual(f.calls.map(c=>c.url),[URLS.token,URLS.me]);f.auth.close();assert.equal(f.auth.snapshot().account,null);
});
test('wrong state and duplicate state never exchange a token',async t=>{
 const f=fixture(t);await f.auth.begin();const u=f.callback();u.searchParams.set('state','wrong');assert.equal((await fetch(u)).status,400);const v=f.callback();v.searchParams.append('state','other');assert.equal((await fetch(v)).status,400);assert.equal(f.calls.length,0);assert.equal((await fetch(f.callback())).status,200);
});
test('persistent session encrypted, restored unverified, removable without logout',async t=>{
 const f=fixture(t);await f.auth.begin({remember:true});assert(f.opened.searchParams.get('scope').includes('offline.access'));await fetch(f.callback());assert(fs.existsSync(f.auth.file));assert(!fs.readFileSync(f.auth.file).includes(Buffer.from('test-access-sensitive')));
 const restored=new XIdentity(f.options);t.after(()=>restored.close());assert.equal(restored.load().phase,'unverified');assert.equal((await restored.check()).phase,'connected');restored.setRemember(false);assert(!fs.existsSync(f.auth.file));assert(restored.snapshot().account);
});
test('unavailable system encryption rejects persistence before opening browser',async t=>{
 const f=fixture(t,{crypto:{available:()=>false}});await assert.rejects(f.auth.begin({remember:true}),/系统安全存储/);assert.equal(f.opened,undefined);await f.auth.begin();await fetch(f.callback());assert.throws(()=>f.auth.setRemember(true),/系统安全存储/);
});
test('cancel during token exchange cannot restore credentials',async t=>{
 let resolveToken,started;const ready=new Promise(r=>{started=r;});const f=fixture(t,{fetchImpl:async()=>{started();return new Promise(r=>{resolveToken=r;});}});await f.auth.begin({remember:true});const response=fetch(f.callback()).catch(()=>null);await ready;f.auth.cancel();resolveToken(Response.json({access_token:'late-token',expires_in:3600}));await response;await new Promise(r=>setImmediate(r));assert.equal(f.auth.snapshot().account,null);assert(!fs.existsSync(f.auth.file));
});
test('logout clears encrypted session even when remote revocation fails',async t=>{
 const f=fixture(t);await f.auth.begin({remember:true});await fetch(f.callback());f.auth.fetch=async()=>{throw Error('offline');};const s=await f.auth.disconnect();assert.equal(s.account,null);assert(!fs.existsSync(f.auth.file));assert.match(s.message,/远端撤销未确认/);
});
test('provider errors do not expose response secrets or claim success',async t=>{
 const f=fixture(t,{fetchImpl:async()=>new Response('secret-provider-detail',{status:403})});await f.auth.begin();await fetch(f.callback());assert.equal(f.auth.snapshot().phase,'disconnected');assert(!JSON.stringify(f.auth.snapshot()).includes('secret-provider-detail'));
});

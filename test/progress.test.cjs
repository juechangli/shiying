const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {EventEmitter}=require('node:events');const {PassThrough}=require('node:stream');const {Engine}=require('../src/engine.cjs');
test('progress works on stderr with split chunks and requests explicit output',()=>{
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vd-progress-'));let args;
const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();
fs.writeFileSync(path.join(dir,'yt-dlp'),'');
const engine=new Engine({stateDir:dir,outputDir:dir,tools:dir,spawnProcess:(_bin,a)=>{args=a;return child;}});
try{const j=engine.add({url:'https://example.com/video'});assert.equal(j.phase,'preparing');assert.equal(j.progress,null);assert.ok(args.includes('--progress'));
child.stderr.write('VIDEODOCK_PRO');child.stderr.write('GRESS:{"status":"downloading","downloaded_bytes":42,"total_bytes":100,"speed":20,"eta":3}\n');
assert.equal(j.progress,42);assert.equal(j.phase,'transferring');assert.equal(j.speed,20);
child.stdout.write('VIDEODOCK_PROGRESS:{"status":"downloading","downloaded_bytes":73,"total_bytes":100}\n');assert.equal(j.progress,73);
child.stderr.write('ERROR: Test network failure\n');child.emit('close',1);assert.equal(j.status,'failed');assert.equal(j.error,'Test network failure');
}finally{engine.shutdown();fs.rmSync(dir,{recursive:true,force:true});}
});

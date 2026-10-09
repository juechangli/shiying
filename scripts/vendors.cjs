/* VD-ATTR-v1:​‌‌​‌‌​​​‌‌​‌​​‌​‌‌​‌‌‌​​‌‌​‌​‌​​‌‌‌​‌​‌​‌‌​​‌​‌​‌‌​​​‌‌​‌‌​‌​​​​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​​‌‌‌​​‌​‌‌‌‌​‌‌​‌​​‌​‌‌‌​​‌​​‌‌​‌‌‌‌​‌‌​‌‌‌​​‌‌​‌‌​‌​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​‌‌​​​‌​​​​​​​‌‌‌​​​‌​‌‌‌​​​‌​​‌​‌‌‌​​‌‌​​​‌‌​‌‌​‌‌‌‌​‌‌​‌‌​‌:END */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFile}=require('node:child_process');
const run=require('node:util').promisify(execFile);
const root=path.resolve(__dirname,'..');
const release='https://github.com/yt-dlp/yt-dlp/releases/download/2026.08.19';
async function fetchFile(url,dest){if(fs.existsSync(dest))return;fs.mkdirSync(path.dirname(dest),{recursive:true});console.log('Download:',path.basename(dest));const source=process.env.VIDEODOCK_DOWNLOAD_MIRROR&&url.includes('/releases/download/')?process.env.VIDEODOCK_DOWNLOAD_MIRROR+url:url;await run('/usr/bin/curl',['-fsSL','--retry','1','--connect-timeout','15','--max-time','180','-o',dest+'.part',source]);fs.renameSync(dest+'.part',dest);}
async function main(){
 const cache=path.join(root,'vendor/.cache');await fetchFile(release+'/SHA2-256SUMS',path.join(cache,'SHA2-256SUMS'));
 const sums=fs.readFileSync(path.join(cache,'SHA2-256SUMS'),'utf8');
 await Promise.all([['mac-arm64','yt-dlp_macos','darwin-arm64'],['win-x64','yt-dlp.exe','win32-x64']].map(async([dir,name,ffarch])=>{
  const folder=path.join(root,'vendor',dir);fs.mkdirSync(folder,{recursive:true});const bin=path.join(folder,dir.startsWith('win')?'yt-dlp.exe':'yt-dlp');
  await fetchFile(release+'/'+name,bin);const wanted=sums.split('\n').find(l=>l.trim().endsWith(' '+name))?.trim().split(/\s+/)[0];const actual=crypto.createHash('sha256').update(fs.readFileSync(bin)).digest('hex');if(!wanted||actual!==wanted)throw Error('yt-dlp checksum mismatch: '+name);fs.chmodSync(bin,0o755);
  await fetchFile('https://raw.githubusercontent.com/yt-dlp/yt-dlp/3a08beaf031ab68f966401ead017ac81fe8486cf/THIRD_PARTY_LICENSES.txt',path.join(folder,'yt-dlp-LICENSES.txt'));
  fs.writeFileSync(path.join(folder,'yt-dlp-SOURCES.txt'),`yt-dlp 2026.08.19\n${release}/${name}\nSHA256: ${actual}\nSource: https://github.com/yt-dlp/yt-dlp/tree/2026.08.19\n`);
  console.log('Verified yt-dlp:',dir);
 }));
 console.log('FFmpeg is not downloaded automatically. Supply a redistributable build and corresponding license/source materials; see THIRD_PARTY_NOTICES.md.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});

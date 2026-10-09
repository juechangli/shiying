/* VD-ATTR-v1:​‌‌​‌‌​​​‌‌​‌​​‌​‌‌​‌‌‌​​‌‌​‌​‌​​‌‌‌​‌​‌​‌‌​​‌​‌​‌‌​​​‌‌​‌‌​‌​​​​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​​‌‌‌​​‌​‌‌‌‌​‌‌​‌​​‌​‌‌‌​​‌​​‌‌​‌‌‌‌​‌‌​‌‌‌​​‌‌​‌‌​‌​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​‌‌​​​‌​​​​​​​‌‌‌​​​‌​‌‌‌​​​‌​​‌​‌‌‌​​‌‌​​​‌‌​‌‌​‌‌‌‌​‌‌​‌‌​‌:END */
// Optional standalone service for a trusted LAN. Desktop users use the in-app toggle.
const path=require('node:path');const os=require('node:os');
const {Engine}=require('./engine.cjs');const {Service}=require('./server.cjs');
if(!process.argv.includes('--lan')){console.log('手机服务不会默认暴露到网络。\n在可信局域网中运行：node src/mobile-server.cjs --lan\n也可以直接打开桌面应用的“连接手机”页面。');process.exit(0);}
const root=path.resolve(__dirname,'..');
const engine=new Engine({stateDir:path.join(os.homedir(),'.videodock-service'),outputDir:process.env.VIDEODOCK_OUTPUT||path.join(os.homedir(),'Downloads','VideoDock'),tools:process.env.VIDEODOCK_TOOLS||path.join(root,'vendor',`${process.platform==='darwin'?'mac':'win'}-${process.arch}`)});
const service=new Service(engine,{uiDir:path.join(root,'ui')});
(async()=>{await service.start();const s=await service.enableMobile();console.log('可信 Wi-Fi 内的手机浏览器访问：\n'+s.addresses.join('\n'));console.log('五分钟配对码：'+s.code);console.log('此服务为 HTTP 局域网连接；请勿将端口直接暴露到公网。Ctrl+C 关闭并撤销手机访问。');})().catch(e=>{console.error(e.message);process.exit(1);});
process.on('SIGINT',async()=>{await service.close();process.exit(0);});
process.on('SIGTERM',async()=>{await service.close();process.exit(0);});

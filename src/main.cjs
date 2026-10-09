/* VD-ATTR-v1:​‌‌​‌‌​​​‌‌​‌​​‌​‌‌​‌‌‌​​‌‌​‌​‌​​‌‌‌​‌​‌​‌‌​​‌​‌​‌‌​​​‌‌​‌‌​‌​​​​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​​‌‌‌​​‌​‌‌‌‌​‌‌​‌​​‌​‌‌‌​​‌​​‌‌​‌‌‌‌​‌‌​‌‌‌​​‌‌​‌‌​‌​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​‌‌​​​‌​​​​​​​‌‌‌​​​‌​‌‌‌​​​‌​​‌​‌‌‌​​‌‌​​​‌‌​‌‌​‌‌‌‌​‌‌​‌‌​‌:END */
const {app,BrowserWindow,ipcMain,dialog,shell,session,safeStorage}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const QRCode=require('qrcode');
const {Engine}=require('./engine.cjs');
const {Service}=require('./server.cjs');
const {XIdentity}=require('./auth/x-identity.cjs');
let win,engine,service,identity,quitting=false;
if(!app.requestSingleInstanceLock())app.quit();
else {
app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.show();win.focus();}});
app.whenReady().then(async()=>{
 const tools=app.isPackaged?path.join(process.resourcesPath,'tools'):path.join(__dirname,'../vendor',`${process.platform==='darwin'?'mac':'win'}-${process.arch}`);
 engine=new Engine({stateDir:app.getPath('userData'),outputDir:path.join(app.getPath('downloads'),'VideoDock'),tools});
 service=new Service(engine,{uiDir:path.join(__dirname,'../ui')});const origin=await service.start();
 await session.defaultSession.cookies.set({url:origin,name:'vd_session',value:service.adminToken,httpOnly:true,sameSite:'strict',path:'/'});
 session.defaultSession.setPermissionRequestHandler((_w,_p,cb)=>cb(false));
 identity=new XIdentity({directory:path.join(app.getPath('userData'),'accounts'),openExternal:url=>shell.openExternal(url),crypto:{available:()=>safeStorage.isEncryptionAvailable()&&(process.platform!=='linux'||!['basic_text','unknown'].includes(safeStorage.getSelectedStorageBackend())),encrypt:value=>safeStorage.encryptString(value),decrypt:bytes=>safeStorage.decryptString(bytes)}});
 identity.load();
 function handle(name,fn){ipcMain.handle(name,async(e,...args)=>{if(!win||e.sender!==win.webContents||e.senderFrame!==win.webContents.mainFrame||!e.senderFrame?.url.startsWith(origin+'/'))return {ok:false,error:'不可信页面'};try{return {ok:true,data:await fn(...args)};}catch(err){return {ok:false,error:err.message};}});}
 handle('choose-directory',async()=>{const result=await dialog.showOpenDialog(win,{title:'选择视频保存位置',defaultPath:engine.settings.outputDir,properties:['openDirectory','createDirectory']});if(result.canceled)return null;return engine.setDirectory(result.filePaths[0]);});
 handle('open-directory',async()=>{fs.mkdirSync(engine.settings.outputDir,{recursive:true});const err=await shell.openPath(engine.settings.outputDir);if(err)throw Error(err);});
 handle('reveal',id=>{const j=engine.find(id,'desktop',true);if(j.status!=='completed'||!j.file||!fs.existsSync(j.file))throw Error('文件不存在');shell.showItemInFolder(j.file);});
 handle('identity-state',()=>identity.snapshot());
 handle('identity-configure',clientId=>identity.configure(clientId));
 handle('identity-connect',options=>identity.begin(options));
 handle('identity-cancel',()=>identity.cancel());
 handle('identity-check',()=>identity.check());
 handle('identity-remember',value=>identity.setRemember(value));
 handle('identity-disconnect',()=>identity.disconnect());
 handle('identity-help',()=>shell.openExternal('https://console.x.com'));
 handle('mobile-state',()=>service.mobileState());
 handle('enable-mobile',async()=>{const s=await service.enableMobile();return {...s,qr:s.addresses[0]?await QRCode.toDataURL(s.addresses[0],{width:220,margin:2}):null};});
 handle('disable-mobile',()=>service.disableMobile());
 win=new BrowserWindow({width:1180,height:820,minWidth:870,minHeight:650,title:'VideoDock · 拾影',backgroundColor:'#f7f8fa',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith(origin+'/'))e.preventDefault();});
 win.on('close',e=>{if(!quitting&&engine.children.size){const choice=dialog.showMessageBoxSync(win,{type:'question',title:'仍有视频正在下载',message:'退出应用会停止当前下载，也会断开手机连接。',buttons:['继续下载','停止并退出'],defaultId:0,cancelId:0});if(choice===0)e.preventDefault();else quitting=true;}});
 await win.loadURL(origin);app.on('activate',()=>win?.show());
}).catch(e=>{dialog.showErrorBox('VideoDock 无法启动',e.message);app.quit();});
app.on('window-all-closed',()=>app.quit());
app.on('will-quit',()=>{identity?.close();service?.engine.shutdown();});
}

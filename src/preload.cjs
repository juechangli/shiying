/* VD-ATTR-v1:​‌‌​‌‌​​​‌‌​‌​​‌​‌‌​‌‌‌​​‌‌​‌​‌​​‌‌‌​‌​‌​‌‌​​‌​‌​‌‌​​​‌‌​‌‌​‌​​​​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​​‌‌‌​​‌​‌‌‌‌​‌‌​‌​​‌​‌‌‌​​‌​​‌‌​‌‌‌‌​‌‌​‌‌‌​​‌‌​‌‌​‌​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​‌‌​​​‌​​​​​​​‌‌‌​​​‌​‌‌‌​​​‌​​‌​‌‌‌​​‌‌​​​‌‌​‌‌​‌‌‌‌​‌‌​‌‌​‌:END */
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('desktop',{
 identityState:()=>ipcRenderer.invoke('identity-state'),identityConfigure:id=>ipcRenderer.invoke('identity-configure',id),identityConnect:options=>ipcRenderer.invoke('identity-connect',options),identityCancel:()=>ipcRenderer.invoke('identity-cancel'),identityCheck:()=>ipcRenderer.invoke('identity-check'),identityRemember:value=>ipcRenderer.invoke('identity-remember',value),identityDisconnect:()=>ipcRenderer.invoke('identity-disconnect'),identityHelp:()=>ipcRenderer.invoke('identity-help'),
 chooseDirectory:()=>ipcRenderer.invoke('choose-directory'),openDirectory:()=>ipcRenderer.invoke('open-directory'),reveal:id=>ipcRenderer.invoke('reveal',id),
 mobileState:()=>ipcRenderer.invoke('mobile-state'),enableMobile:()=>ipcRenderer.invoke('enable-mobile'),disableMobile:()=>ipcRenderer.invoke('disable-mobile')
});

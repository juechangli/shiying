/* VD-ATTR-v1:​‌‌​‌‌​​​‌‌​‌​​‌​‌‌​‌‌‌​​‌‌​‌​‌​​‌‌‌​‌​‌​‌‌​​‌​‌​‌‌​​​‌‌​‌‌​‌​​​​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​​‌‌‌​​‌​‌‌‌‌​‌‌​‌​​‌​‌‌‌​​‌​​‌‌​‌‌‌‌​‌‌​‌‌‌​​‌‌​‌‌​‌​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​‌‌​​​‌​​​​​​​‌‌‌​​​‌​‌‌‌​​​‌​​‌​‌‌‌​​‌‌​​​‌‌​‌‌​‌‌‌‌​‌‌​‌‌​‌:END */
(() => {
  const bridge=window.desktop;if(!bridge)return;
  const $=id=>document.getElementById(id);
  let state=null,busy=false;
  const phaseNames={disconnected:'未连接',authorizing:'等待授权',connected:'已连接',expired:'已过期',unverified:'待验证',checking:'验证中',locked:'需清理或解锁'};
  function showError(message){$('identity-error').textContent=message;$('identity-error').classList.toggle('hidden',!message);}
  function render(s){
    state=s;const pending=['authorizing','checking'].includes(s.phase),has=!!s.account;
    $('identity-badge').textContent=s.configured?phaseNames[s.phase]||s.phase:'未配置';
    $('identity-message').textContent=s.message||'请先配置 Client ID，再连接 X 账号。';
    $('identity-user').textContent=has?`${s.account.name} · @${s.account.username}`:'';
    $('identity-expiry').textContent=s.expiresAt?'访问令牌到期：'+new Date(s.expiresAt).toLocaleString('zh-CN'):'';
    if(document.activeElement!==$('identity-client'))$('identity-client').value=s.clientId;
    $('identity-callback').value=s.callback;
    $('identity-client').disabled=busy||has||pending||s.saved;
    $('identity-save-config').disabled=busy||has||pending||s.saved;
    $('identity-connect').disabled=busy||!s.configured||pending||has||s.saved;
    $('identity-cancel').classList.toggle('hidden',s.phase!=='authorizing');
    $('identity-check').classList.toggle('hidden',!has);$('identity-check').disabled=busy||pending;
    $('identity-disconnect').classList.toggle('hidden',!has&&!s.saved);$('identity-disconnect').disabled=busy;
    $('identity-remember').disabled=busy||pending||(!s.canRemember&&!s.remember);
    if(has||s.saved)$('identity-remember').checked=s.remember;
    if(!s.canRemember&&!s.remember)$('identity-remember').checked=false;
    $('identity-storage-note').textContent=s.canRemember?'默认仅在内存中使用，退出后不恢复。勾选后使用系统加密存储；取消勾选会删除已保存授权。':'系统加密存储当前不可用，不能新增长期保存；可以临时授权或清除已有保存记录。';
  }
  async function call(promise){const r=await promise;if(!r.ok)throw Error(r.error);return r.data;}
  async function action(fn){if(busy)return;busy=true;showError('');if(state)render(state);try{await fn();}catch(e){showError(e.message);}finally{busy=false;await refresh();}}
  async function refresh(){try{render(await call(bridge.identityState()));}catch{showError('无法读取账号状态，请重启拾影后重试');}}
  $('identity-save-config').onclick=()=>{const value=$('identity-client').value.trim();return action(()=>call(bridge.identityConfigure(value)));};
  $('identity-help').onclick=()=>action(()=>call(bridge.identityHelp()));
  $('identity-connect').onclick=()=>{const remember=$('identity-remember').checked;return action(()=>call(bridge.identityConnect({remember})));};
  $('identity-cancel').onclick=()=>action(()=>call(bridge.identityCancel()));
  $('identity-check').onclick=()=>action(()=>call(bridge.identityCheck()));
  $('identity-disconnect').onclick=()=>action(()=>call(bridge.identityDisconnect()));
  $('identity-remember').onchange=()=>{if(state?.account||state?.saved){const remember=$('identity-remember').checked;return action(()=>call(bridge.identityRemember(remember)));}};
  refresh();setInterval(()=>{if(!busy)refresh();},1500);
})();

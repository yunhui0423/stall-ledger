export async function startCloud(ui) {
  const response = await fetch('./ledger-cloud-config.json');
  if (!response.ok) return;
  const config = await response.json();
  if (!config?.projectId) return;

  const url = 'https://www.gstatic.com/firebasejs/11.10.0/';
  const [app, authApi, dbApi] = await Promise.all([
    import(url + 'firebase-app.js'), import(url + 'firebase-auth.js'), import(url + 'firebase-firestore.js')
  ]);
  const firebase = app.initializeApp(config);
  const auth = authApi.getAuth(firebase);
  const db = dbApi.getFirestore(firebase);
  const provider = new authApi.GoogleAuthProvider();
  const doc = id => dbApi.doc(db, 'ledgers', id);
  const cacheKey = id => 'stall-ledger-cloud-' + id;
  const encode = days => JSON.stringify({format:'stall-ledger',version:1,days});
  let user = null;
  let revision = 0;
  let pending = null;
  let task = null;
  let loadToken = 0;
  let loginInProgress = false;

  function cache() {
    try { localStorage.setItem(cacheKey(user.uid), JSON.stringify({revision,pending})); return true; }
    catch { return false; }
  }
  function flush() {
    if (!user || !pending || task) return task;
    const id = user.uid;
    task = (async () => {
      try {
        while (pending) {
          const backup = pending;
          if (new TextEncoder().encode(backup).length > 750000) throw new Error('cloud-full');
          const current = revision;
          await dbApi.runTransaction(db, async transaction => {
            const ref = doc(id);
            const remote = await transaction.get(ref);
            if ((remote.data()?.revision ?? 0) !== current) throw new Error('cloud-conflict');
            transaction.set(ref, {revision:current+1,backup});
          });
          revision = current+1;
          if (pending === backup) pending = null;
          cache();
        }
        ui.status('已同步雲端帳本。');
      } catch (error) {
        ui.status(error.message === 'cloud-conflict'
          ? '另一台裝置已有較新的變更。本機修改已保留，請先下載備份。'
          : error.message === 'cloud-full' ? '帳本超過雲端同步容量，請下載完整備份。' : '雲端同步失敗。請確認網路，再按「同步帳本」。');
      }
    })().finally(() => { task = null; });
    return task;
  }

  ui.setup({
    login: async () => {
      if (ui.hasDraft()) { ui.status('請先處理待確認帳目再登入。'); return; }
      if (loginInProgress) return;
      loginInProgress = true;
      ui.status('正在開啟 Google 登入。若沒看到新視窗，請用 Chrome 或 Safari 直接開啟本站。');
      try { await authApi.signInWithPopup(auth, provider); }
      catch (error) {
        const messages = {
          'auth/popup-blocked': '瀏覽器擋住了 Google 登入視窗。請允許本站的彈出視窗，或用 Chrome 或 Safari 直接開啟本站。',
          'auth/popup-closed-by-user': '登入視窗已關閉。請重新點「使用 Google 登入」。',
          'auth/unauthorized-domain': '這個網址尚未獲 Firebase 授權。請從正式的收攤對帳網址開啟。',
          'auth/operation-not-allowed': 'Firebase 尚未啟用 Google 登入。',
          'auth/web-storage-unsupported': '瀏覽器限制登入所需的儲存功能。請用 Chrome 或 Safari 的一般分頁開啟本站。',
          'auth/network-request-failed': '無法連到 Google 登入服務，請確認網路後重試。'
        };
        ui.status(messages[error.code] || 'Google 登入未完成。錯誤代碼：' + (error.code || 'unknown'));
      } finally { loginInProgress = false; }
    },
    logout: async () => {
      if (ui.hasDraft()) { ui.status('請先處理待確認帳目再登出。'); return; }
      await flush();
      if (pending && !cache()) {
        ui.status('尚有未同步紀錄，請先下載完整備份再關閉網頁。'); return;
      }
      await authApi.signOut(auth);
    },
    sync: () => pending ? flush() : loadAccount(auth.currentUser),
    importLocal: () => {
      if (!user) return;
      const preview = ui.previewImport();
      if (!preview.added) { ui.status('沒有可匯入的新日期。重複日期保留雲端帳目。'); return; }
      if (confirm('匯入 '+preview.added+' 天的本機帳目？'+
          (preview.skipped ? '將略過 '+preview.skipped+' 天重複日期。' : ''))) {
        try { ui.importDays(preview.merged); }
        catch { ui.status('本機空間不足，無法匯入。'); }
      }
    }
  });

  async function loadAccount(account) {
    const token = ++loadToken;
    if (!account) {
      user = null;
      pending = null;
      ui.local();
      return;
    }
    if (user && pending) return;
    let saved;
    try { saved = JSON.parse(localStorage.getItem(cacheKey(account.uid)) || 'null'); } catch {}
    ui.status('正在載入雲端帳本。');
    try {
      const snapshot = await dbApi.getDocFromServer(doc(account.uid));
      if (token !== loadToken) return;
      const remote = snapshot.data();
      pending = saved?.pending ?? null;
      revision = pending ? saved.revision : (remote?.revision ?? 0);
      const backup = pending || remote?.backup || encode({});
      const days = ui.decode(backup);
      user = account;
      ui.account(days, updated => {
        const previous = pending;
        pending = encode(updated);
        if (!cache()) { pending = previous; throw new Error('local-cache'); }
        void flush();
      });
      if (pending) void flush();
      else ui.status('已登入，雲端帳本已載入。');
    } catch (error) {
      if (token === loadToken) ui.status(error.code === 'permission-denied'
        ? 'Google 已登入，但 Firestore 拒絕讀取帳本。請回報此畫面。'
        : 'Google 已登入，但雲端帳本載入失敗。請確認連線，再按「同步帳本」。');
    }
  }
  authApi.onAuthStateChanged(auth, account => {
    ui.authenticated(Boolean(account));
    void loadAccount(account);
  });
}

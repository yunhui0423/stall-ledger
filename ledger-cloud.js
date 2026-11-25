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
      try { await authApi.signInWithPopup(auth, provider); }
      catch { ui.status('Google 登入未完成，請確認瀏覽器允許開啟登入視窗。'); }
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
    } catch {
      if (token === loadToken) ui.status('無法載入雲端帳本。請檢查連線，再按「同步帳本」。');
    }
  }
  authApi.onAuthStateChanged(auth, account => {
    ui.authenticated(Boolean(account));
    void loadAccount(account);
  });
}

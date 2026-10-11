/* SNAPBOX backend — tempel di Extensions > Apps Script pada spreadsheet kamu.
   Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone.
   Sheet "Lobby" (lobby & kode), "Chat", "Photos" dibuat otomatis. */

const CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function doGet(e) { return out(handle(e.parameter, {})); }
function doPost(e) { return out(handle(e.parameter, JSON.parse(e.postData.contents || '{}'))); }
function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function sheet(n, head) {
  const ss = SpreadsheetApp.getActive();
  let s = ss.getSheetByName(n);
  if (!s) { s = ss.insertSheet(n); s.appendRow(head); s.setFrozenRows(1); }
  return s;
}
// Kolom Lobby: A kode | B dibuat | C player1 | D player2 | E ready1 | F ready2 | G startAt | H round | I musik
function findLobby(s, code) {
  const d = s.getDataRange().getValues();
  for (let i = 1; i < d.length; i++) if (String(d[i][0]) === code) return { row: i + 1, v: d[i] };
  return null;
}

function handle(p, b) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const L = sheet('Lobby', ['Kode', 'Dibuat', 'Player1', 'Player2', 'Ready1', 'Ready2', 'StartAt', 'Round', 'Musik']);
    const C = sheet('Chat', ['Kode', 'Nama', 'Pesan', 'Waktu']);
    const P = sheet('Photos', ['Kode', 'Round', 'Role', 'Data']);
    const a = p.a, code = String(p.code || '').toUpperCase(), now = Date.now();

    if (a === 'create') {
      let k;
      do { k = ''; for (let i = 0; i < 6; i++) k += CH[Math.floor(Math.random() * CH.length)]; } while (findLobby(L, k));
      L.appendRow([k, new Date(), p.name, '', 0, 0, 0, 0, '']);
      return { ok: true, code: k, role: 1 };
    }
    const lb = findLobby(L, code);
    if (!lb) return { ok: false, err: 'Kode lobby tidak ditemukan' };

    if (a === 'join') {
      if (lb.v[3]) return { ok: false, err: 'Lobby sudah penuh (2 orang)' };
      L.getRange(lb.row, 4).setValue(p.name);
      return { ok: true, code: code, role: 2 };
    }
    if (a === 'ready') {
      const role = Number(p.role), val = Number(p.val);
      L.getRange(lb.row, role === 1 ? 5 : 6).setValue(val);
      const r1 = role === 1 ? val : lb.v[4], r2 = role === 2 ? val : lb.v[5];
      if (r1 && r2 && lb.v[2] && lb.v[3]) {
        L.getRange(lb.row, 5, 1, 2).setValues([[0, 0]]);
        L.getRange(lb.row, 7).setValue(now + 5000);
        L.getRange(lb.row, 8).setValue(Number(lb.v[7]) + 1);
      }
      return { ok: true };
    }
    if (a === 'chat') {
      C.appendRow([code, p.name, String(p.msg).slice(0, 200), now]);
      return { ok: true };
    }
    if (a === 'music') {
      L.getRange(lb.row, 9).setValue(p.url || '');
      return { ok: true };
    }
    if (a === 'photo') {
      const d = P.getDataRange().getValues();
      for (let i = 1; i < d.length; i++)
        if (String(d[i][0]) === code && Number(d[i][1]) === Number(p.r) && Number(d[i][2]) === Number(p.role)) return { ok: true };
      P.appendRow([code, Number(p.r), Number(p.role), b.data]);
      return { ok: true };
    }
    if (a === 'state') {
      const chat = C.getDataRange().getValues().filter(r => String(r[0]) === code).slice(-40).map(r => ({ n: r[1], m: r[2] }));
      const rnd = Number(lb.v[7]), photos = {};
      if (rnd > 0) P.getDataRange().getValues().forEach(r => {
        if (String(r[0]) === code && Number(r[1]) === rnd) photos[r[2]] = r[3];
      });
      return {
        ok: true, now: now, p1: lb.v[2], p2: lb.v[3], r1: lb.v[4], r2: lb.v[5],
        startAt: Number(lb.v[6]), round: rnd, music: lb.v[8], chat: chat, photos: photos
      };
    }
    return { ok: false, err: 'Aksi tidak dikenal' };
  } finally { lock.releaseLock(); }
}

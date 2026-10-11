/* =====================================================================
   PAGV online — Google Apps Script que grava as respostas numa Planilha Google
   Como usar:
   1. Crie uma Planilha Google nova. Menu Extensões → Apps Script.
   2. Apague o que estiver lá e cole TODO este arquivo.
   3. Troque TROQUE-ESTA-CHAVE (abaixo) por uma senha só sua. Salve.
   4. Implantar → Nova implantação → tipo "App da Web".
      Executar como: Eu. Quem pode acessar: Qualquer pessoa. Autorize o acesso.
   5. Copie a URL do App da Web (termina em /exec) e cole em assets/pagv-config.js,
      no campo endpoint. Publique o site.
   O nome do respondente fica só na planilha: a página de resultado nunca o recebe.
   ===================================================================== */
const CHAVE = 'TROQUE-ESTA-CHAVE';
const ABA = 'Respostas';
const CABECALHO = ['Data', 'Empresa', 'Nivel', 'NivelNome', 'Nome', 'Respostas', 'Versao'];

function aba_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(ABA);
  if (!sh) { sh = ss.insertSheet(ABA); sh.appendRow(CABECALHO); sh.setFrozenRows(1); }
  return sh;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    const resp = String(d.respostas || '');
    const nivel = parseInt(d.nivel, 10);
    if (!/^[CSD-]{66}$/.test(resp) || !(nivel >= 1 && nivel <= 6)) return json_({ ok: false, erro: 'dados' });
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      aba_().appendRow([new Date(), String(d.empresa || '').slice(0, 80), nivel, String(d.nivelNome || '').slice(0, 40),
        String(d.nome || '').slice(0, 80), resp, String(d.versao || 'PAGV26')]);
    } finally { lock.releaseLock(); }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, erro: 'falha' });
  }
}

function doGet(e) {
  const p = e.parameter || {};
  if (p.acao !== 'listar') return json_({ ok: true, servico: 'PAGV' });
  if (p.chave !== CHAVE) return json_({ ok: false, erro: 'chave' });
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const alvo = norm(p.empresa);
  const rows = aba_().getDataRange().getValues().slice(1)
    .filter(r => !alvo || norm(r[1]) === alvo)
    .map(r => ({ ts: r[0] instanceof Date ? r[0].toISOString() : String(r[0]), empresa: r[1], nivel: r[2], nivelNome: r[3], respostas: r[5] }));
  return json_({ ok: true, rows: rows });
}

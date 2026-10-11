/* PAGV online — questionário do respondente (pesquisa.html).
   Link de aplicação: pesquisa.html?e=<empresa>&n=<nível 1>|<nível 2>|...  (gerado em resultado.html) */
(function () {
  'use strict';
  var D = window.PAGV_DATA, CFG = window.PAGV_CONFIG || {};
  if (!D) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var ITENS = D.itens, POR_BLOCO = 11, NB = Math.ceil(ITENS.length / POR_BLOCO);
  var qs = new URLSearchParams(location.search);
  var empresa = (qs.get('e') || '').trim().slice(0, 80);
  var niveis = (qs.get('n') || '').split('|').map(function (s) { return s.trim().slice(0, 40); }).filter(Boolean).slice(0, 6);
  if (!niveis.length) niveis = ['Diretoria', 'Gerência', 'Coordenação / supervisão', 'Vendedor(a) interno(a)', 'Vendedor(a) externo(a)', 'Representante'];
  var KEY = 'pagv26:' + (empresa || 'sem-empresa');
  var st = { resp: {}, nivel: '', nome: '', bloco: 0 };

  function load() { try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.resp) st = s; } catch (e) {} }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function clear() { try { localStorage.removeItem(KEY); } catch (e) {} }

  var elIntro = $('#pv-intro'), elQ = $('#pv-quest'), elFim = $('#pv-fim');
  var elEmp = $('#pv-empresa'), selN = $('#pv-nivel'), inNome = $('#pv-nome'), ckLgpd = $('#pv-lgpd');

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- tela inicial ---------- */
  function intro() {
    load();
    if (empresa) { elEmp.textContent = empresa; $('#pv-empresa-row').hidden = false; }
    selN.innerHTML = '<option value="">Selecione o seu nível</option>' + niveis.map(function (n, i) {
      return '<option value="' + (i + 1) + '">' + esc(n) + '</option>';
    }).join('');
    if (st.nivel) selN.value = st.nivel;
    if (st.nome) inNome.value = st.nome;
    var feitos = Object.keys(st.resp).length;
    if (feitos) $('#pv-start').textContent = 'Continuar de onde parei (' + feitos + ' de ' + ITENS.length + ')';
  }

  $('#pv-form-intro').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var ok = true;
    $('#pv-nivel-err').hidden = !!selN.value; if (!selN.value) ok = false;
    $('#pv-lgpd-err').hidden = ckLgpd.checked; if (!ckLgpd.checked) ok = false;
    if (!ok) { (selN.value ? ckLgpd : selN).focus(); return; }
    st.nivel = selN.value; st.nome = inNome.value.trim().slice(0, 80); save();
    elIntro.hidden = true; elQ.hidden = false;
    var primeiro = NB - 1;
    for (var b = 0; b < NB; b++) { if (!blocoCompleto(b)) { primeiro = b; break; } }
    render(primeiro);
  });

  /* ---------- perguntas ---------- */
  function blocoItens(b) { return ITENS.slice(b * POR_BLOCO, (b + 1) * POR_BLOCO); }
  function blocoCompleto(b) { return blocoItens(b).every(function (it) { return st.resp[it.n]; }); }
  var OPC = [['C', 'Concordo'], ['S', 'Sem opinião'], ['D', 'Discordo']];

  function render(b) {
    st.bloco = b; save();
    var its = blocoItens(b);
    $('#pv-bloco').textContent = 'Bloco ' + (b + 1) + ' de ' + NB;
    $('#pv-faixa').textContent = 'Afirmativas ' + its[0].n + ' a ' + its[its.length - 1].n;
    $('#pv-list').innerHTML = its.map(function (it) {
      var name = 'q' + it.n;
      return '<li class="pv-item" id="it-' + it.n + '"><fieldset><legend><span class="pv-n">' + it.n + '</span><span class="pv-x">' + esc(it.x) + '</span></legend>' +
        '<div class="pv-opts">' + OPC.map(function (o) {
          var id = name + o[0];
          return '<input type="radio" name="' + name + '" id="' + id + '" value="' + o[0] + '"' + (st.resp[it.n] === o[0] ? ' checked' : '') + '>' +
            '<label for="' + id + '" class="pv-opt pv-opt--' + o[0] + '">' + o[1] + '</label>';
        }).join('') + '</div></fieldset></li>';
    }).join('');
    $('#pv-prev').hidden = b === 0;
    $('#pv-next').textContent = b === NB - 1 ? 'Enviar respostas' : 'Próximo bloco';
    $('#pv-missing').hidden = true;
    progresso();
    var top = $('#pv-quest'); if (top.scrollIntoView) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function progresso() {
    var n = Object.keys(st.resp).length, p = Math.round(n / ITENS.length * 100);
    $('#pv-bar').style.width = p + '%';
    $('#pv-prog').textContent = n + ' de ' + ITENS.length + ' respondidas';
    $('#pv-progbar').setAttribute('aria-valuenow', String(p));
  }

  $('#pv-list').addEventListener('change', function (ev) {
    var t = ev.target; if (!t.name || t.name.charAt(0) !== 'q') return;
    st.resp[t.name.slice(1)] = t.value; save(); progresso();
    var li = t.closest('.pv-item'); if (li) li.classList.remove('is-missing');
  });

  $('#pv-prev').addEventListener('click', function () { if (st.bloco > 0) render(st.bloco - 1); });
  $('#pv-next').addEventListener('click', function () {
    var faltam = blocoItens(st.bloco).filter(function (it) { return !st.resp[it.n]; });
    document.querySelectorAll('.pv-item.is-missing').forEach(function (li) { li.classList.remove('is-missing'); });
    if (faltam.length) {
      faltam.forEach(function (it) { var li = $('#it-' + it.n); if (li) li.classList.add('is-missing'); });
      var m = $('#pv-missing'); m.hidden = false;
      m.textContent = faltam.length === 1 ? 'Falta responder a afirmativa ' + faltam[0].n + '.' : 'Faltam ' + faltam.length + ' afirmativas: ' + faltam.map(function (i) { return i.n; }).join(', ') + '.';
      var f = $('#it-' + faltam[0].n + ' input'); if (f) f.focus();
      return;
    }
    if (st.bloco < NB - 1) render(st.bloco + 1); else enviar();
  });

  /* ---------- envio ---------- */
  function codigo() {
    var r = ITENS.map(function (it) { return st.resp[it.n] || '-'; }).join('');
    var nivelNome = niveis[+st.nivel - 1] || ('Nível ' + st.nivel);
    return { versao: D.versao, empresa: empresa, nivel: +st.nivel, nivelNome: nivelNome, nome: st.nome, respostas: r, ts: new Date().toISOString() };
  }
  function linha(p) { return [p.versao, p.empresa, p.nivel, p.nivelNome, p.respostas, p.ts].map(function (v) { return String(v).replace(/\|/g, '/'); }).join('|'); }

  function enviar() {
    var btn = $('#pv-next'); btn.disabled = true; btn.textContent = 'Enviando…';
    var p = codigo(), cod = linha(p), envios = [];
    if (CFG.endpoint) {
      envios.push(fetch(CFG.endpoint, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(p) }).then(function () { return 'planilha'; }));
    }
    if (CFG.emailEndpoint) {
      envios.push(fetch(CFG.emailEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ _subject: 'PAGV 2026 · ' + (p.empresa || 'sem empresa') + ' · ' + p.nivelNome, _template: 'box', _captcha: 'false',
          empresa: p.empresa || '(não informada)', nivel: p.nivel + ' · ' + p.nivelNome, respondente: p.nome || '(anônimo)', codigo_de_resposta: cod })
      }).then(function (r) { if (!r.ok) throw new Error('email'); return 'email'; }));
    }
    var fim = function (ok) {
      clear();
      elQ.hidden = true; elFim.hidden = false;
      $('#pv-cod').value = cod;
      $('#pv-fim-ok').hidden = !ok; $('#pv-fim-manual').hidden = ok;
      var txt = encodeURIComponent('PAGV 2026 — código de resposta:\n' + cod);
      $('#pv-wa').href = 'https://wa.me/' + (CFG.whatsapp || '') + '?text=' + txt;
      $('#pv-mail').href = 'mailto:growthetc@gmail.com?subject=' + encodeURIComponent('PAGV 2026 · ' + (p.empresa || '')) + '&body=' + txt;
      try { (window.dataLayer = window.dataLayer || []).push({ event: 'pagv_envio', pagv_ok: ok }); } catch (e) {}
      elFim.focus();
    };
    if (!envios.length) return fim(false);
    Promise.allSettled(envios).then(function (rs) { fim(rs.some(function (r) { return r.status === 'fulfilled'; })); });
  }

  $('#pv-copy').addEventListener('click', function () {
    var t = $('#pv-cod'); t.select();
    var done = function () { $('#pv-copy').textContent = 'Copiado'; };
    if (navigator.clipboard) navigator.clipboard.writeText(t.value).then(done, function () { document.execCommand('copy'); done(); });
    else { document.execCommand('copy'); done(); }
  });

  intro();
})();

/* PAGV online — tabulação e resultado (resultado.html).
   Cálculo idêntico ao da planilha "02. PAGV Tabulação - Modelo I 2026":
   índice da afirmativa = (respostas iguais ao gabarito ÷ respondentes do nível) × 4;
   índice do tema = média das suas afirmativas. "Sem opinião" e em branco não pontuam. */
(function () {
  'use strict';
  var D = window.PAGV_DATA, CFG = window.PAGV_CONFIG || {};
  if (!D) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var ITENS = D.itens, TEMAS = D.temas, NI = ITENS.length, MIN = CFG.minPorNivel || 3;
  var CORES = ['#DF5D2B', '#2F6DB5', '#2E8B57', '#8A5CB8', '#A67C00', '#5F6F7A'];
  var NIVEIS_PADRAO = ['Diretoria', 'Gerência', 'Coordenação / supervisão', 'Vendedor(a) interno(a)', 'Vendedor(a) externo(a)', 'Representante'];
  var LS = 'pagv26:consultor';
  var dados = [], visiveis = {};

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
  function fmt(v) { return v == null || isNaN(v) ? '—' : v.toFixed(2).replace('.', ','); }
  function pct(v) { return v == null || isNaN(v) ? '—' : Math.round(v * 100) + '%'; }
  function status(t) { $('#pr-status').textContent = t; }
  function lsGet() { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) { return {}; } }
  function lsSet(o) { try { localStorage.setItem(LS, JSON.stringify(o)); } catch (e) {} }

  /* ---------- 1. link da pesquisa ---------- */
  var mem = lsGet();
  var lvBox = $('#pr-levels');
  lvBox.innerHTML = NIVEIS_PADRAO.map(function (n, i) {
    var v = (mem.niveis && mem.niveis[i] != null) ? mem.niveis[i] : (i < 6 ? n : '');
    return '<div class="pr-lv"><label for="lv' + i + '">N' + (i + 1) + '</label><input id="lv' + i + '" maxlength="40" value="' + esc(v) + '"></div>';
  }).join('');
  if (mem.empresa) $('#pr-emp').value = mem.empresa;
  function niveisAtuais() { var a = []; for (var i = 0; i < 6; i++) a.push($('#lv' + i).value.trim()); return a; }
  function baseUrl() { return /^https?:/.test(location.protocol) ? new URL('pesquisa.html', location.href).href : 'https://rafaeldonascimentocastro-collab.github.io/PAGV/pesquisa.html'; }
  function atualizaLink() {
    var nv = niveisAtuais(); while (nv.length && !nv[nv.length - 1]) nv.pop();
    var emp = $('#pr-emp').value.trim();
    var u = baseUrl() + '?e=' + encodeURIComponent(emp) + '&n=' + nv.map(encodeURIComponent).join('|');
    $('#pr-url').value = u; $('#pr-open').href = u;
    lsSet({ empresa: emp, niveis: niveisAtuais() });
  }
  $('#pr-emp').addEventListener('input', atualizaLink); lvBox.addEventListener('input', atualizaLink); atualizaLink();
  $('#pr-copy').addEventListener('click', function () {
    var i = $('#pr-url'); i.select();
    (navigator.clipboard ? navigator.clipboard.writeText(i.value) : Promise.reject()).then(null, function () { document.execCommand('copy'); });
    $('#pr-copy').textContent = 'Link copiado';
  });

  /* ---------- 2. fontes de respostas ---------- */
  document.querySelectorAll('.pr-tab').forEach(function (t) {
    t.addEventListener('click', function () {
      document.querySelectorAll('.pr-tab').forEach(function (o) { o.setAttribute('aria-selected', String(o === t)); });
      document.querySelectorAll('[data-pane]').forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== t.getAttribute('data-src'); });
    });
  });
  $('#pr-noendp').hidden = !!CFG.endpoint;

  function registro(emp, nivel, nivelNome, resp, ts) {
    resp = String(resp || '').toUpperCase().replace(/[^CSD-]/g, '');
    nivel = parseInt(nivel, 10);
    if (resp.length !== NI || !(nivel >= 1 && nivel <= 6)) return null;
    return { empresa: String(emp || '').trim(), nivel: nivel, nivelNome: String(nivelNome || '').trim(), respostas: resp, ts: String(ts || '') };
  }

  function parseCSV(txt) {
    var rows = [], row = [], f = '', q = false, sep = txt.indexOf(';') > -1 && txt.split('\n')[0].split(';').length > txt.split('\n')[0].split(',').length ? ';' : ',';
    for (var i = 0; i < txt.length; i++) {
      var c = txt[i];
      if (q) { if (c === '"') { if (txt[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === sep) { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows;
  }

  function lerTexto(txt) {
    var out = [];
    var codes = txt.match(/PAGV26\|[^\r\n"<]+/g) || [];
    codes.forEach(function (l) {
      var p = l.split('|');
      var r = registro(p[1], p[2], p[3], p[4], p[5]); if (r) out.push(r);
    });
    if (!out.length) {
      var rows = parseCSV(txt).filter(function (r) { return r.some(function (c) { return c.trim(); }); });
      if (rows.length > 1) {
        var h = rows[0].map(norm), ix = function () { for (var a = 0; a < arguments.length; a++) { var k = h.indexOf(arguments[a]); if (k > -1) return k; } return -1; };
        var ie = ix('empresa'), il = ix('nivel', 'nível'), inn = ix('nivelnome', 'nivel nome', 'nome do nivel'), ir = ix('respostas', 'resposta'), it = ix('data', 'ts', 'carimbo de data/hora');
        if (ir > -1 && il > -1) rows.slice(1).forEach(function (r) {
          var x = registro(r[ie], r[il], inn > -1 ? r[inn] : '', r[ir], it > -1 ? r[it] : ''); if (x) out.push(x);
        });
      }
    }
    return out;
  }

  function carregar(regs, origem) {
    var vistos = {}, unicos = [];
    regs.forEach(function (r) { var k = [r.empresa, r.nivel, r.respostas, r.ts].join('|'); if (!vistos[k]) { vistos[k] = 1; unicos.push(r); } });
    var emp = norm($('#pr-emp').value);
    var empresas = {}; unicos.forEach(function (r) { empresas[r.empresa || '(sem empresa)'] = 1; });
    if (emp) {
      var f = unicos.filter(function (r) { return norm(r.empresa) === emp; });
      if (f.length) unicos = f;
    }
    dados = unicos;
    if (!dados.length) { status('Nenhuma resposta válida encontrada ' + origem + '. Confira o formato (66 respostas C, S ou D por pessoa).'); $('#pr-out').hidden = true; return; }
    var ne = Object.keys(empresas).length;
    status(dados.length + ' respostas carregadas ' + origem + (ne > 1 && !emp ? ' · atenção: há ' + ne + ' empresas misturadas; preencha o campo Empresa para filtrar.' : '') + '.');
    tabular();
  }

  $('#pr-parse').addEventListener('click', function () { carregar(lerTexto($('#pr-paste').value), 'do texto colado'); });
  $('#pr-file').addEventListener('change', function (ev) {
    var f = ev.target.files && ev.target.files[0]; if (!f) return;
    var rd = new FileReader(); rd.onload = function () { carregar(lerTexto(String(rd.result)), 'do arquivo'); }; rd.readAsText(f, 'utf-8');
  });
  $('#pr-fetch').addEventListener('click', function () {
    if (!CFG.endpoint) { status('A Planilha Google ainda não foi conectada (veja o passo a passo no fim da página ou o README).'); return; }
    var key = $('#pr-key').value; if (!key) { status('Informe a chave de acesso.'); $('#pr-key').focus(); return; }
    status('Buscando…');
    fetch(CFG.endpoint + '?acao=listar&chave=' + encodeURIComponent(key) + '&empresa=' + encodeURIComponent($('#pr-emp').value.trim()))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j.ok) { status(j.erro === 'chave' ? 'Chave incorreta.' : 'A planilha respondeu com erro.'); return; }
        carregar((j.rows || []).map(function (r) { return registro(r.empresa, r.nivel, r.nivelNome, r.respostas, r.ts); }).filter(Boolean), 'da Planilha Google');
      })
      .catch(function () { status('Não foi possível acessar a planilha. Confira a URL em assets/pagv-config.js.'); });
  });
  $('#pr-demo').addEventListener('click', function () {
    var seed = 7; var rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    var nomes = niveisAtuais(), qt = [3, 6, 9, 16], vies = TEMAS.map(function () { return rnd() * 0.5 - 0.15; }), out = [];
    var tIdx = {}; TEMAS.forEach(function (t, i) { tIdx[t.id] = i; });
    qt.forEach(function (q, li) {
      for (var k = 0; k < q; k++) {
        var s = ITENS.map(function (it) {
          var p = 0.55 + vies[tIdx[it.t]] - li * 0.04, x = rnd();
          if (x < 0.12) return 'S';
          return x < 0.12 + p * 0.88 ? it.g : (it.g === 'C' ? 'D' : 'C');
        }).join('');
        out.push(registro($('#pr-emp').value.trim() || 'Empresa Exemplo', li + 1, nomes[li], s, 'demo-' + li + '-' + k));
      }
    });
    carregar(out, 'de exemplo');
  });

  /* ---------- 3. tabulação ---------- */
  var R = null;
  function tabular() {
    var porNivel = {};
    dados.forEach(function (r) { (porNivel[r.nivel] = porNivel[r.nivel] || []).push(r); });
    var nomes = niveisAtuais();
    var niveis = Object.keys(porNivel).map(Number).sort().map(function (n) {
      var nm = porNivel[n][0].nivelNome || nomes[n - 1] || ('Nível ' + n);
      return { id: 'N' + n, num: n, nome: nm, regs: porNivel[n] };
    });
    var series = [{ id: 'G', nome: 'Geral', regs: dados, geral: true }].concat(niveis);
    series.forEach(function (s, si) {
      s.n = s.regs.length; s.cor = s.geral ? '#182933' : CORES[(s.num - 1) % CORES.length];
      s.oculto = !s.geral && s.n < MIN;
      s.item = ITENS.map(function (it, i) {
        var ac = 0, so = 0;
        s.regs.forEach(function (r) { var a = r.respostas.charAt(i); if (a === it.g) ac++; else if (a === 'S') so++; });
        return { idx: s.n ? ac / s.n * 4 : null, ac: ac, so: so };
      });
      s.tema = TEMAS.map(function (t) {
        var v = [], so = 0, tot = 0;
        ITENS.forEach(function (it, i) { if (it.t === t.id) { v.push(s.item[i].idx); so += s.item[i].so; tot += s.n; } });
        return { idx: v.length && s.n ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null, so: tot ? so / tot : null };
      });
      var tv = s.tema.map(function (x) { return x.idx; }).filter(function (x) { return x != null; });
      s.indice = tv.length ? tv.reduce(function (a, b) { return a + b; }, 0) / tv.length : null;
      if (visiveis[s.id] == null) visiveis[s.id] = !s.oculto;
    });
    R = { series: series, niveis: niveis };
    render();
  }

  function faixa(v) { return v == null ? 'na' : v >= 2.8 ? 'hi' : v >= 2 ? 'mid' : 'lo'; }

  function render() {
    var G = R.series[0];
    $('#pr-out').hidden = false;
    var emp = (dados[0] && dados[0].empresa) || $('#pr-emp').value.trim();
    $('#pr-empname').textContent = emp ? '· ' + emp : '';
    var ordem = TEMAS.map(function (t, i) { return { t: t, v: G.tema[i].idx }; }).filter(function (x) { return x.v != null; }).sort(function (a, b) { return a.v - b.v; });
    var nC = 0, tot = 0, iguais = 0;
    dados.forEach(function (r) { for (var i = 0; i < NI; i++) { if (r.respostas[i] === 'C') nC++; tot++; } if (/^(.)\1*$/.test(r.respostas)) iguais++; });
    $('#pr-kpis').innerHTML = [
      ['<b>' + G.n + '</b><span>respondentes</span>', ''],
      ['<b>' + R.niveis.length + '</b><span>níveis hierárquicos</span>', ''],
      ['<b>' + fmt(G.indice) + '</b><span>índice geral (0–4)</span>', faixa(G.indice) === 'lo' ? ' pr-kpi--warn' : ''],
      ['<b style="font-size:1.25rem;line-height:1.25">' + esc(ordem.length ? ordem[ordem.length - 1].t.nome : '—') + '</b><span>tema mais forte</span>', ''],
      ['<b style="font-size:1.25rem;line-height:1.25">' + esc(ordem.length ? ordem[0].t.nome : '—') + '</b><span>tema mais crítico</span>', ' pr-kpi--warn']
    ].map(function (k) { return '<div class="pr-kpi' + k[1] + '">' + k[0] + '</div>'; }).join('');
    var w = [];
    R.niveis.forEach(function (s) { if (s.n < MIN) w.push('O nível <b>' + esc(s.nome) + '</b> tem só ' + s.n + ' respondente(s): fica fora dos gráficos e da tabela para preservar o anonimato (entra no Geral).'); });
    if (tot && nC / tot > 0.7) w.push('<b>' + Math.round(nC / tot * 100) + '% das respostas são “Concordo”.</b> Como 48 das 66 afirmativas têm gabarito “Concordo”, quem concorda com tudo pontua alto: leia os índices com cautela.');
    if (iguais) w.push(iguais + ' respondente(s) marcaram a mesma opção em todas as afirmativas. Considere excluí-los.');
    $('#pr-warns').innerHTML = w.map(function (x) { return '<p class="pr-warn">' + x + '</p>'; }).join('');
    renderSeries(); renderChart(); renderTable(); renderCrit();
  }

  function renderSeries() {
    $('#pr-series').innerHTML = R.series.map(function (s) {
      var dis = s.oculto ? ' disabled' : '';
      return '<label' + (s.oculto ? ' style="opacity:.5" title="Menos de ' + MIN + ' respondentes"' : '') + '><input type="checkbox" data-s="' + s.id + '"' + (visiveis[s.id] && !s.oculto ? ' checked' : '') + dis + '><span class="pr-sw" style="background:' + s.cor + '"></span>' + esc(s.nome) + ' (' + s.n + ')</label>';
    }).join('');
  }
  $('#pr-series').addEventListener('change', function (ev) { var id = ev.target.getAttribute('data-s'); if (id) { visiveis[id] = ev.target.checked; renderChart(); } });

  function renderChart() {
    var W = 1000, x0 = 360, x1 = 860, rowH = 34, top = 40, grupos = [], y = top, pos = [];
    var persp = null;
    TEMAS.forEach(function (t, i) {
      if (t.persp !== persp) { persp = t.persp; grupos.push({ nome: persp, y: y }); y += 26; }
      pos.push(y + rowH / 2); y += rowH;
    });
    var H = y + 34, X = function (v) { return x0 + (x1 - x0) * v / 4; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Índice por tema e nível, de 0 a 4" font-family="Hanken Grotesk, Segoe UI, sans-serif">';
    s += '<rect x="' + X(0) + '" y="' + (top - 6) + '" width="' + (X(2) - X(0)) + '" height="' + (H - top - 28) + '" fill="#DF5D2B" opacity=".07"/>';
    for (var g = 0; g <= 4; g++) {
      s += '<line x1="' + X(g) + '" x2="' + X(g) + '" y1="' + (top - 6) + '" y2="' + (H - 34) + '" stroke="#182933" stroke-opacity="' + (g === 2 ? .35 : .12) + '"' + (g === 2 ? ' stroke-dasharray="4 4"' : '') + '/>';
      s += '<text x="' + X(g) + '" y="' + (top - 14) + '" text-anchor="middle" font-size="13" fill="#566570">' + g + '</text>';
    }
    s += '<text x="' + X(1) + '" y="' + (H - 12) + '" text-anchor="middle" font-size="12" fill="#BC491C">oportunidade (&lt; 2,0)</text>';
    s += '<text x="' + X(3.4) + '" y="' + (H - 12) + '" text-anchor="middle" font-size="12" fill="#566570">ponto forte (≥ 2,8)</text>';
    grupos.forEach(function (gr) { s += '<text x="0" y="' + (gr.y + 16) + '" font-size="12" font-weight="700" fill="#182933" letter-spacing="1.2">' + esc(gr.nome.toUpperCase()) + '</text>'; });
    TEMAS.forEach(function (t, i) {
      var yy = pos[i];
      s += '<line x1="0" x2="' + W + '" y1="' + (yy + rowH / 2) + '" y2="' + (yy + rowH / 2) + '" stroke="#182933" stroke-opacity=".06"/>';
      s += '<text x="0" y="' + (yy + 5) + '" font-size="14" fill="#182933">' + esc(t.nome) + '</text>';
      s += '<text x="' + (x0 - 12) + '" y="' + (yy + 5) + '" text-anchor="end" font-size="12" fill="#8A97A0">' + esc(t.neg) + '</text>';
      s += '<text x="' + (x1 + 12) + '" y="' + (yy + 5) + '" font-size="12" fill="#566570">' + esc(t.pos) + '</text>';
    });
    R.series.slice().reverse().forEach(function (se) {
      if (!visiveis[se.id] || se.oculto) return;
      var pts = []; se.tema.forEach(function (x, i) { if (x.idx != null) pts.push([X(x.idx), pos[i], x.idx, TEMAS[i].nome]); });
      s += '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1]; }).join(' ') + '" fill="none" stroke="' + se.cor + '" stroke-width="' + (se.geral ? 3 : 2) + '" stroke-opacity="' + (se.geral ? 1 : .8) + '"/>';
      pts.forEach(function (p) { s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1] + '" r="' + (se.geral ? 6 : 4.5) + '" fill="' + se.cor + '" stroke="#fff" stroke-width="1.5"><title>' + esc(se.nome + ' · ' + p[3] + ': ' + fmt(p[2])) + '</title></circle>'; });
    });
    s += '</svg>';
    $('#pr-chart').innerHTML = s;
  }

  function renderTable() {
    var cols = R.series.filter(function (s) { return !s.oculto; });
    var h = '<thead><tr><th>Tema</th><th>Polo − / polo +</th>' + cols.map(function (s) { return '<th>' + esc(s.nome) + '<br><small style="font-weight:400">n = ' + s.n + '</small></th>'; }).join('') + '<th>Sem opinião</th><th>Leitura (Geral)</th></tr></thead><tbody>';
    var persp = null;
    TEMAS.forEach(function (t, i) {
      if (t.persp !== persp) { persp = t.persp; h += '<tr class="pr-persp"><td colspan="' + (cols.length + 4) + '">' + esc(persp) + '</td></tr>'; }
      var g = R.series[0].tema[i], f = faixa(g.idx);
      var leitura = f === 'hi' ? 'Ponto forte: ' + t.pos : f === 'mid' ? 'Atenção' : f === 'lo' ? 'Oportunidade: ' + t.neg : '—';
      h += '<tr><td><b>' + esc(t.nome) + '</b><br><small style="color:var(--mute)">' + esc(t.desc) + '</small></td><td class="pr-read">' + esc(t.neg) + ' / ' + esc(t.pos) + '</td>' +
        cols.map(function (s) { var v = s.tema[i].idx; return '<td><span class="pr-b pr-b--' + faixa(v) + '">' + fmt(v) + '</span></td>'; }).join('') +
        '<td>' + (g.so != null && g.so > 0.25 ? '<b style="color:#8A2E0E">' + pct(g.so) + '</b>' : pct(g.so)) + '</td><td class="pr-read">' + esc(leitura) + '</td></tr>';
    });
    h += '<tr><td><b>Índice geral</b></td><td></td>' + cols.map(function (s) { return '<td><span class="pr-b pr-b--' + faixa(s.indice) + '">' + fmt(s.indice) + '</span></td>'; }).join('') + '<td></td><td></td></tr></tbody>';
    $('#pr-table').innerHTML = h;
  }

  function renderCrit() {
    var G = R.series[0], tn = {}; TEMAS.forEach(function (t) { tn[t.id] = t.nome; });
    var lst = ITENS.map(function (it, i) { return { it: it, v: G.item[i].idx, so: G.item[i].so }; }).sort(function (a, b) { return a.v - b.v || a.it.n - b.it.n; }).slice(0, 10);
    $('#pr-crit').innerHTML = lst.map(function (x) {
      return '<li><span class="pr-cn">' + x.it.n + '</span><div>' + esc(x.it.x) + '<small>' + esc(tn[x.it.t]) + ' · gabarito: ' + (x.it.g === 'C' ? 'Concordo' : 'Discordo') + ' · ' + pct(G.n ? x.so / G.n : null) + ' sem opinião</small></div><span class="pr-b pr-b--' + faixa(x.v) + '">' + fmt(x.v) + '</span></li>';
    }).join('');
  }

  /* ---------- exportar ---------- */
  function baixar(nome, linhas) {
    var csv = '﻿' + linhas.map(function (l) { return l.map(function (c) { c = c == null ? '' : String(c); return /[;"\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(';'); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  var num = function (v) { return v == null ? '' : v.toFixed(2).replace('.', ','); };
  $('#pr-csv').addEventListener('click', function () {
    if (!R) return;
    var cols = R.series.filter(function (s) { return !s.oculto; });
    var L = [['Perspectiva', 'Tema', 'Polo +', 'Polo −'].concat(cols.map(function (s) { return s.nome + ' (n=' + s.n + ')'; })).concat(['% sem opinião (Geral)'])];
    TEMAS.forEach(function (t, i) { L.push([t.persp, t.nome, t.pos, t.neg].concat(cols.map(function (s) { return num(s.tema[i].idx); })).concat([pct(R.series[0].tema[i].so)])); });
    L.push([]); L.push(['Nº', 'Tema', 'Gabarito', 'Afirmativa'].concat(cols.map(function (s) { return s.nome; })));
    ITENS.forEach(function (it, i) { L.push([it.n, it.t, it.g, it.x].concat(cols.map(function (s) { return num(s.item[i].idx); }))); });
    baixar('PAGV-tabulacao.csv', L);
  });
  $('#pr-raw').addEventListener('click', function () {
    var L = [['empresa', 'nivel', 'nivelNome', 'respostas', 'data']];
    dados.forEach(function (r) { L.push([r.empresa, r.nivel, r.nivelNome, r.respostas, r.ts]); });
    baixar('PAGV-respostas.csv', L);
  });
  $('#pr-print').addEventListener('click', function () { window.print(); });
})();

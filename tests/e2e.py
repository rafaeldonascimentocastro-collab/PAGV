"""Teste de ponta a ponta da PAGV: python tests/e2e.py (requer playwright + chromium)."""
import json, random, re
from playwright.sync_api import sync_playwright
import sys, pathlib, subprocess, time
ROOT=pathlib.Path(__file__).resolve().parent.parent
OUT=str(ROOT/'tests'/'saida')
BASE='http://localhost:8799'
srv=subprocess.Popen([sys.executable,'-m','http.server','8799'],cwd=str(ROOT),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
import os; os.makedirs(OUT, exist_ok=True)
data=json.loads(re.search(r'window.PAGV_DATA = (.*);\s*$', open(ROOT/'assets'/'pagv-data.js', encoding='utf-8').read(), re.S).group(1))
items=data['itens']
captured=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    # ---- survey on phone
    ctx=b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2)
    pg=ctx.new_page()
    errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    def handle(route):
        captured.append(route.request.post_data); route.fulfill(status=200, body='{"success":"true"}', headers={'content-type':'application/json'})
    pg.route('https://formsubmit.co/**', handle)
    pg.goto(BASE+'/pesquisa.html?e=Acme%20Ltda&n=Diretoria|Ger%C3%AAncia|Vendedores')
    pg.screenshot(path=OUT+'/s1-intro.png', full_page=False)
    pg.click('#pv-start'); assert pg.is_visible('#pv-nivel-err')
    pg.select_option('#pv-nivel','3'); pg.check('#pv-lgpd'); pg.click('#pv-start')
    random.seed(1); ans={}
    for blk in range(6):
        its=items[blk*11:(blk+1)*11]
        if blk==0:
            pg.click('#pv-next'); assert pg.is_visible('#pv-missing'), 'missing msg'
            pg.screenshot(path=OUT+'/s2-missing.png')
        for it in its:
            v=random.choice('CCSD'); ans[it['n']]=v
            pg.click(f'label[for="q{it["n"]}{v}"]')
        if blk==1: pg.screenshot(path=OUT+'/s3-bloco.png')
        pg.click('#pv-next')
    pg.wait_for_selector('#pv-fim:not([hidden])')
    pg.screenshot(path=OUT+'/s4-fim.png')
    code=pg.input_value('#pv-cod')
    assert not errs, errs
    assert captured and 'codigo_de_resposta' in captured[0], 'e-mail nao enviado'
    print('pesquisa ok:', code[:60]+'...')
    exp=''.join(ans[it['n']] for it in items)
    assert code.split('|')[4]==exp, 'answers mismatch'
    assert code.split('|')[1]=='Acme Ltda' and code.split('|')[2]=='3' and code.split('|')[3]=='Vendedores'
    ctx.close()
    # ---- results: build 12 respondents (+the survey one), compare with spreadsheet formula
    random.seed(5); codes=[code]; regs=[(3,exp)]
    for k in range(12):
        lv=1 if k<3 else 2 if k<7 else 3
        s=''.join(random.choice('CCDS') for _ in items); regs.append((lv,s))
        codes.append(f'PAGV26|Acme Ltda|{lv}|nivel|{s}|t{k}')
    codes.append('PAGV26|Outra SA|1|x|'+'C'*66+'|z')  # other company, should be filtered
    def expected(rs):
        n=len(rs); it=[4*sum(1 for _,s in rs if s[i]==items[i]['g'])/n for i in range(66)]
        th={}
        for i,x in enumerate(items): th.setdefault(x['t'],[]).append(it[i])
        return {k:sum(v)/len(v) for k,v in th.items()}
    E={'G':expected(regs),'N1':expected([r for r in regs if r[0]==1]),'N2':expected([r for r in regs if r[0]==2]),'N3':expected([r for r in regs if r[0]==3])}
    ctx=b.new_context(viewport={'width':1366,'height':900}); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE+'/resultado.html')
    pg.fill('#pr-emp','acme ltda')
    pg.click('[data-src=colar]'); pg.fill('#pr-paste','\n'.join(codes)+'\n'+codes[1])
    pg.click('#pr-parse'); pg.wait_for_selector('#pr-out:not([hidden])')
    assert pg.inner_text('#pr-status').startswith('13 respostas'), pg.inner_text('#pr-status')
    rows=pg.eval_on_selector_all('#pr-table tbody tr:not(.pr-persp)', 'rs=>rs.map(r=>Array.from(r.cells).map(c=>c.innerText.trim()))')
    hdr=pg.eval_on_selector_all('#pr-table thead th','hs=>hs.map(h=>h.innerText.split("\\n")[0])')
    names={t['nome']:t['id'] for t in data['temas']}
    maxdiff=0
    for r in rows[:-1]:
        tid=names[r[0].split('\n')[0]]
        for ci,key in [(2,'G'),(3,'N1'),(4,'N2'),(5,'N3')]:
            v=float(r[ci].replace(',','.')); maxdiff=max(maxdiff,abs(v-round(E[key][tid],2)))
    assert maxdiff==0 and not errs, (maxdiff, errs)
    print('tabulacao ok: diferenca para a formula da planilha =', maxdiff)
    pg.screenshot(path=OUT+'/r1.png', full_page=True)
    # demo
    pg.click('[data-src=exemplo]'); pg.click('#pr-demo'); pg.wait_for_timeout(300)
    assert '34 respostas' in pg.inner_text('#pr-status')
    pg.goto(BASE+'/index.html'); pg.wait_for_selector('#pi-temas tr')
    assert pg.eval_on_selector_all('#pi-temas tbody tr','r=>r.length')==13
    pg.screenshot(path=OUT+'/inicio.png', full_page=True)
    print('inicio ok')
    pg.screenshot(path=OUT+'/r2-demo.png', full_page=True)
    ctx.close(); b.close()
srv.terminate()
print('TODOS OS TESTES PASSARAM')

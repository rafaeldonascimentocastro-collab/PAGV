# PAGV 2026 — Pesquisa Atitudinal de Gerenciamento de Vendas

Pesquisa online da Growth.Etc, com tabulação automática e resultado por tema e por nível hierárquico.
É um site estático (HTML + JavaScript), sem servidor e sem banco de dados próprio.

**Endereço (GitHub Pages):** https://rafaeldonascimentocastro-collab.github.io/PAGV/

| Página | Para quem | O que faz |
| --- | --- | --- |
| `index.html` | Todos | Apresenta a PAGV e leva à pesquisa ou à área do consultor |
| `pesquisa.html` | Participantes | 66 afirmativas em 6 blocos (Concordo / Sem opinião / Discordo), nível hierárquico, nome opcional e consentimento LGPD. Salva o progresso no aparelho |
| `resultado.html` | Consultor | Gera o link por empresa, carrega as respostas e tabula: índice 0–4 por tema e nível, polos, % “sem opinião”, 10 afirmativas críticas, CSV e PDF |

## 1. Publicar (uma vez)

1. No GitHub: **Settings → Pages**.
2. Em *Build and deployment*, escolha **Source: Deploy from a branch**, **Branch: `main`**, pasta **`/ (root)`**, e salve.
3. Em 1 ou 2 minutos o site fica no endereço acima.

## 2. Aplicar a pesquisa

1. Abra `resultado.html`, preencha a **Empresa** e os nomes dos **níveis** (N1 a N6) e copie o link.
2. Envie o link aos participantes (WhatsApp, e-mail, QR code). Exemplo:
   `pesquisa.html?e=Empresa%20Exemplo&n=Diretoria|Gerência|Vendedores`

## 3. Como as respostas chegam

Há dois caminhos, que podem funcionar juntos:

- **Por e-mail (já funciona):** cada resposta é enviada a `growthetc@gmail.com` pelo FormSubmit, com um *código de resposta*.
  Na área do consultor, aba **Colar códigos ou CSV**, cole os códigos (ou o texto dos e-mails) e clique em **Tabular**.
  Na primeira resposta de um site novo, o FormSubmit pode mandar um e-mail de **ativação**: clique em confirmar uma vez.
- **Planilha Google (recomendado para muitas respostas):** cada resposta vira uma linha numa planilha, e o resultado carrega com um clique.
  1. Crie uma Planilha Google. Menu **Extensões → Apps Script**.
  2. Cole o conteúdo de [`apps-script/Codigo.gs`](apps-script/Codigo.gs) e troque `TROQUE-ESTA-CHAVE` por uma senha sua.
  3. **Implantar → Nova implantação → App da Web**. *Executar como:* você. *Quem pode acessar:* qualquer pessoa. Autorize.
  4. Copie a URL que termina em `/exec` e cole em [`assets/pagv-config.js`](assets/pagv-config.js), no campo `endpoint`. Faça o commit.
  5. Na área do consultor, aba **Planilha Google**, digite a senha e clique em **Buscar respostas**.

Se nenhum dos dois estiver configurado, o participante recebe o código na tela para enviar por WhatsApp ou e-mail.

## 4. Cálculo (igual à planilha *02. PAGV Tabulação - Modelo I 2026*)

- Afirmativa: `índice = (respostas iguais ao gabarito ÷ respondentes do nível) × 4`. “Sem opinião” e em branco não pontuam.
- Tema: média das afirmativas do tema. Índice geral: média dos 13 temas.
- Leitura: ≥ 2,8 ponto forte · 2,0 a 2,8 atenção · < 2,0 oportunidade de desenvolvimento.
- Anonimato: níveis com menos de 3 respondentes ficam fora dos gráficos e da tabela (`minPorNivel` em `assets/pagv-config.js`). Eles continuam contando no Geral.

## 5. Editar afirmativas, gabarito ou temas

Tudo fica em [`assets/pagv-data.js`](assets/pagv-data.js): 66 afirmativas (`n`, tema `t`, gabarito `g` = C ou D, texto `x`) e 13 temas (perspectiva, polos e descrição).
Os dados vieram das abas N1, Gráficos de linha e Conceito da planilha 2026.

**Atenção ao gabarito:** 48 das 66 afirmativas têm gabarito “Concordo”. Quem concorda com tudo pontua alto, e a área do consultor avisa quando isso acontece. Para um instrumento mais robusto, convém equilibrar (cerca de metade C e metade D).

## 6. Testar

```bash
pip install playwright && python -m playwright install chromium
python tests/e2e.py
```

O teste responde à pesquisa no navegador, confere o código enviado e compara a tabulação da página com a fórmula da planilha, calculada à parte (a diferença deve ser 0).

## Estrutura

```
index.html  pesquisa.html  resultado.html
assets/  base.css  pagv.css  pagv-config.js  pagv-data.js  pesquisa.js  resultado.js  fonts/
apps-script/Codigo.gs
img/  tests/e2e.py
```

© 2026 Growth.Etc – Sales Innovation. Fontes Outfit e Hanken Grotesk sob a SIL Open Font License (`assets/fonts/OFL-*.txt`).

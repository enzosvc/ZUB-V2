# ZUB — instruções para o Claude

Painel pessoal do Enzo (versão 2). Repositório próprio, independente do **BESS ZUB**
(modelagem financeira de BESS, repo `enzosvc/BESS---zub`). São duas plataformas
diferentes: não misturar código, banco ou decisões entre elas.

Responda sempre em português, de forma direta e concisa.

## Stack

- Site estático em HTML/CSS/JS puro, sem build e sem framework: `index.html`, `style.css`, `app.js`, `config.js`.
- Backend: Supabase (Auth + Postgres) acessado direto do navegador via `supabase-js`. Deploy no Vercel.
- `config.js` guarda `SUPABASE_URL` e a chave **publishable** (`sb_publishable_...`), que é pública por design. **Nunca** colocar chave `sb_secret_...`/service-role nem outro segredo neste repo. A chave da Metals-API é opcional (vazia = modo demonstração).
- Como o acesso ao banco parte do navegador, a segurança depende das **políticas RLS** do Supabase. Qualquer tabela nova precisa de RLS por usuário; avise o Enzo e entregue o SQL.

## Funcionalidades (abas)

- **Geral:** cotações ao vivo (dólar USD/BRL, LME alumínio, lítio SMM, aço HRC) e links de notícias.
- **Agenda / Assuntos:** assuntos por zona (Transmissão, Geração e Armazenamento, M&A, Outros), com status (ativo, em andamento, análise, concluído), prazos, visão em blocos ou lista e calendário anual.
- **Desenvolvimento:** temas/notas com editor de texto rico (`contenteditable` + `execCommand`).
- **Arquivos:** pastas com links (Drive, OneDrive etc.).
- Login por e-mail e senha (Supabase Auth); a tela do app só aparece após a sessão.

## Regras de trabalho

1. Manter simples: sem frameworks, bundlers ou dependências novas sem alinhar com o Enzo antes.
2. Todo conteúdo digitado pelo usuário que vai para o HTML passa por `escHtml()`; não usar `innerHTML` com texto cru.
3. O Enzo usa o ZUB no dia a dia: mudanças não podem quebrar dados existentes. Alterações em tabelas do Supabase exigem SQL incremental e idempotente, entregue por escrito.
4. Discuta antes de mudanças grandes de layout ou de estrutura de dados; implemente após a confirmação.
5. Interface em português do Brasil; manter o estilo visual atual (`style.css`) ao adicionar elementos.
6. Antes de commitar, abra o `index.html` localmente (ex.: `python3 -m http.server`) e confira que o login, as abas e o console do navegador não têm erros.
7. Antes de dar push, rode `git fetch origin` e confirme que a branch local está em dia.
8. Continuidade: o estado do trabalho fica em `PROGRESSO.md` (importado abaixo). Ao terminar uma sessão ou antes de uma pausa, atualize-o (em andamento, próximos passos, decisões, esquema do banco) no mesmo commit do trabalho.

## Estado atual

@PROGRESSO.md

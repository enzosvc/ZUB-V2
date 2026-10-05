# ZUB — progresso do desenvolvimento

Arquivo de continuidade entre sessões. Ler no início de cada sessão; atualizar no fim
de cada sessão (ou antes de uma pausa), no mesmo commit do trabalho.

_Última atualização: 2026-10-05_

## Em andamento

- Nada em andamento.

## Próximos passos

- Conferir em produção se dólar, euro, Ibovespa e ALUP11 batem com o mercado (só testados com dados simulados).
- Conferir no painel do Supabase as políticas RLS das tabelas abaixo e registrar o SQL
  real na seção "Esquema do banco" (hoje o esquema foi deduzido do `app.js`).

## Decisões

- 2026-10-05 — Card da ALUP11 (Alupar) adicionado às cotações, via brapi.dev (grade de 4 colunas).
- 2026-10-05 — Cotações: dólar, euro e Ibovespa. Cards de metais (alumínio, lítio, aço) e a
  Metals-API removidos (só mostravam valores de demonstração).
- 2026-10-05 — Botão do BESS ZUB: ícone da bateria (`bess-zub.png`, copiado de
  `frontend/app/apple-icon.png` do repo `enzosvc/BESS---zub`) à esquerda do nome do usuário;
  abre em nova aba; URL em `config.js` (`BESS_ZUB_URL` = `https://bess-zub.vercel.app/dashboard`;
  vazia = botão oculto).
- 2026-10-05 — `CLAUDE.md` guarda regras e visão geral (estável); `PROGRESSO.md` guarda o
  estado do trabalho (muda a cada sessão) e é importado pelo `CLAUDE.md`.

## Esquema do banco (Supabase)

Deduzido das chamadas em `app.js`; tipos e RLS **não confirmados** no painel.

| Tabela     | Colunas usadas pelo app                                                        | Observações |
|------------|---------------------------------------------------------------------------------|-------------|
| `assuntos` | `id`, `nome`, `descricao` (HTML), `data` (prazo, pode ser nulo), `status`, `zona`, `user_id`, `created_at` | `status`: `ativo`, `andamento`, `analise`, `concluido`. `zona`: `transmissao`, `geracao`, `ma`, `outros`. |
| `notas`    | `id`, `titulo`, `conteudo` (HTML), `user_id`, `created_at`, `updated_at`        | `created_at`/`updated_at` enviados pelo app. |
| `pastas`   | `id`, `nome`, `user_id`, `created_at`                                           | Ao excluir uma pasta, o app apaga antes os `links` dela. |
| `links`    | `id`, `nome`, `url`, `descricao`, `tipo`, `pasta_id`, `user_id`, `created_at`   | `tipo`: `drive`, `pdf`, `sheet`, `ppt`, `link`. |

RLS esperada: cada tabela restrita a `user_id = auth.uid()` em select/insert/update/delete.

### APIs externas

- Dólar e euro: `economia.awesomeapi.com.br` (`USD-BRL,EUR-BRL`, sem chave).
- Ibovespa e ALUP11: `brapi.dev` (`/api/quote/^BVSP` e `/api/quote/ALUP11`, uma chamada cada) com `BRAPI_TOKEN` em `config.js` (vazio = "Indisponível").

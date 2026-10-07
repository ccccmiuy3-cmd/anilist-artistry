# Testes de runtime (staging/Supabase)

Roteiros manuais para validar os grupos 1–6 em ambiente real (staging com
Supabase). Exigem: projeto Supabase com as migrations 0030–0032 aplicadas,
`.env` preenchido (SUPABASE_* / VITE_SUPABASE_*) e, onde indicado, um segundo
usuário/duas janelas anônimas.

## 0. Preparação — aplicar migrations

```bash
# (apenas quem tem acesso ao projeto; nunca em produção sem backup)
npx supabase login
npx supabase link --project-ref <PROJECT_ID>
npx supabase db push          # aplica 0030, 0031, 0032 em ordem do journal
```

Confira depois de aplicar:
- `\df claim_first_admin`, `\df consume_tts_quota` existem.
- Tabelas `tts_rate_limit`, `media_settings`, `storage.objects` com as policies
  da auditoria (ver `docs/MIGRATIONS.md`).

### 1. Upload → assinatura → TTL → fallback (Grupo 1)

1. Como uploader, suba capítulos novos (zip/pdf) em uma obra.
2. Abra o leitor em outra janela **sem login**:
   - capítulo **publicado** deve abrir normalmente (URLs assinadas 6h; recarregue
     a página e confira que nada depende de URL de anos).
3. Inspecione o network: `object/sign/...` com `X-Amz-Expires`/token curto —
   **nunca** `expires` de 10 anos.
4. Edite o capítulo ainda não publicado e confira que rascunho exige login.
5. Teste de TTL: assine e espere expirar (ou rode localmente com
   `PRIVATE_URL_TTL_SECONDS` reduzido) e confirme que o app tenta re-assinar e
   mostra loading novamente (fallback por `usePageUrls`).

### 2. Corrida do primeiro admin (Grupo 6)

1. Deixe o Supabase sem administradores (role `admin` vazio; ou um projeto novo).
2. Abra o fluxo "reivindicar admin" em **duas abas ao mesmo tempo** e clique
   "virar admin" quase simultaneamente.
3. Resultado esperado: **exatamente um** admin criado (advisory lock),
   o outro recebe "já existe um admin" sem duplicar perfil/flag.

### 3. Cota TTS (Grupo 4)

1. Com `.env` nos defaults: narre um capítulo de novel até passar de
   `TTS_PER_MINUTE_CHARS` (6000 chars/min default).
2. Esperado: 429 com `Retry-After: 60` e mensagem "Limite de narração por
   minuto atingido — aguarde um instante."; o botão **não** tenta de novo
   sozinho.
3. Rode o mesmo com `TTS_MAX_CHARS` baixo e texto maior — esperado 400 de
   tamanho sem consumir cota.
4. Confirme no banco que `tts_rate_limit` registrou consumos (incluindo
   tentativas recusadas por tamanho? não — só as que passaram para o TTS).

### 4. Validação de upload (Grupos 2 e 3)

1. Envie: `.pdf` com senha (esperado: erro amigável "PDF protegido"), zip com
   `../../` (esperado: rejeitado), zip gigante (esperado: rejeitado por limite),
   imagem com extensão `.png` mas conteúdo `.jpg` (esperado: "extensão não
   confere"), imagem > 5 MB (esperado: recusada).
2. Avatar com imagem < 32px (esperado: recusada com mensagem de dimensão).
3. Cancelamento: inicie upload grande e clique "Cancelar" (esperado: aborta e
   o card volta ao estado inicial).

### 5. Consultas públicas × privadas (Grupo 5)

1. Perfil de outro usuário (anônimo): favoritos/status/histórico **não**
   aparecem; seguidores/listas públicas/badges sim.
2. No seu perfil, logado: tudo aparece.
3. `reading_history`, `xp_events`, `support_messages` e `media_settings`
   (api_secret) inacessíveis via anon (SQL direto: `select` retorna vazio).

## Registro

Após cada bloco, anote: ambiente, data, resultado, e qualquer divergência com
o esperado acima (abrir issue no repo).
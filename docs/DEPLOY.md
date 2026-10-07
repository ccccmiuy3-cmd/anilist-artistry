# Deploy

Este projeto usa **TanStack Start (Vite 8 + Nitro 3)** e é hospedado pela
Lovable (o push em `main` dispara o deploy automático). Nitro builda com
target Cloudflare como padrão (`nip cloudflare`), mas a app roda em Node.

## Local

```bash
npm install
npm run dev        # dev server
npm run build      # build de produção (Vite + Nitro)
npm run preview    # serve o build localmente
```

Pré-requisitos: `node >= 20.19` (Vite 8) e o `.env` preenchido (veja
`.env.example`). **Nunca** commitar o `.env` real.

## Produção (Lovable)

1. `git push origin main` — o pipeline da Lovable constrói e publica
   automaticamente (não faça force-push/rebases: o histórico sincroniza com o
   editor da Lovable, ver AGENTS.md).
2. Variáveis de ambiente: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e versões
   `VITE_*` no painel da Lovable; segredos de servidor (ex.: `SUPABASE_SERVICE_ROLE`)
   em secrets/`.dev.vars` — **nunca** no `.env` versionado.

## Deploy manual (Cloudflare Workers/Pages ou Node)

```bash
npx nitro deploy --prebuilt   # usa o build de `npm run build`
```

Para outro provider (Node/Fly/etc), veja a documentação do Nitro
(`npx nitro help`). Após alterar tabelas/policies, aplicar migrations:
`npx supabase db push` (ver `docs/MIGRATIONS.md` e `docs/TEST_RUNTIME.md`).

## CI

`.github/workflows/ci.yml` roda **typecheck + lint + testes + build** em cada
push/PR em `main` (Node 20 e 22). Sem `package-lock` no repo, roda `npm install`.

## Verificação pré-deploy

```bash
npm run typecheck && npm run lint && npm test && npm run build
```
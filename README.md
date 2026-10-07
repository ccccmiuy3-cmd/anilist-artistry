# Comic Canvas

analise os print cria site de mangas comics completo com painel e tudo use aniliste pra min poder publica os mangas.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://anilist-artistry.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5a75f7de-5d10-4bd2-8338-8ba46e49f18c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js (>= 20.19) and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
cp .env.example .env   # preencha SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY
npm run dev
```

### Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` | build de produção (Vite + Nitro) |
| `npm run typecheck` | checagem de tipos (`tsc --noEmit`) |
| `npm run lint` | ESLint + Prettier |
| `npm run test` | testes unitários (vitest) |
| `npm run format:check` | confere formatação |
| `npm run preview` | serve o build local |

### Documentação

- `docs/MIGRATIONS.md` — migrations SQL (fonte oficial), arquitetura e revisão de RLS
- `docs/AUDIT.md` — status da auditoria de segurança/qualidade (itens 1–15)
- `docs/DEPLOY.md` — deploy Lovable/Cloudflare e verificação pré-deploy
- `docs/TEST_RUNTIME.md` — roteiros manuais de teste em staging

> **Segurança:** nunca commitar o `.env` real — veja `.env.example`.

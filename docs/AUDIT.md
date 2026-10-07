# Auditoria de segurança e qualidade — status final

Data: 06/10/2026 · Escopo: itens 1–15 da revisão inicial do repositório.

> Nota: os itens 7–15 foram **reconstruídos a partir das anotações da sessão de
> trabalho** (a listagem original completa não ficou salva no repositório).
> Se a numeração original divergir, é só ajustar os rótulos — o conteúdo das
> entregas permanece o mesmo.

| #   | Item                                | Status                            | Evidência                                                            |
| --- | ----------------------------------- | --------------------------------- | -------------------------------------------------------------------- |
| 1   | URLs assinadas de longa duração     | ✅ Concluído                      | TTL 6h/teto 24h; migração 0031; sem TTL longo restante               |
| 2   | Validação centralizada de uploads   | ✅ Concluído                      | `src/lib/image-validation.ts` aplicado em todos os uploads           |
| 3   | Proteção de uploads ZIP/PDF         | ✅ Concluído                      | Limites + AbortSignal + cancelamento em `extract-pages.ts`           |
| 4   | Rate limit em TTS                   | ✅ Concluído                      | Tabela + `consume_tts_quota` (0032); 429 no `/api/tts`               |
| 5   | Consultas públicas × privadas       | ✅ Concluído                      | Perfil isSelf-gated; selects explícitos em `media.functions.ts`      |
| 6   | Supabase/RLS/migrations + 1º admin  | ✅ Concluído (aplicação pendente) | `claim_first_admin` atômico (0030); RLS revisada e aprovada          |
| 7   | Segredos/.env no git                | ✅ Concluído                      | `.env` fora do tracking; `.env.example` + `.gitignore`               |
| 8   | CI incorreto (webpack.yml)          | ✅ Concluído                      | `ci.yml` (typecheck+lint+test+build, Node 20/22) no lugar            |
| 9   | Formatação/lint consistente         | ✅ Concluído                      | `endOfLine: lf`; repo normalizado; `format:check` no package.json    |
| 10  | Scripts e testes                    | ✅ Concluído                      | `typecheck`/`format`/`lint:fix`/`test`; vitest + 27 testes unitários |
| 11  | Docs de deploy                      | ✅ Concluído                      | `docs/DEPLOY.md`                                                     |
| 12  | Roteiros de teste runtime           | ✅ Concluído (execução pendente)  | `docs/TEST_RUNTIME.md`                                               |
| 13  | Relatório de auditoria              | ✅ Este arquivo                   | —                                                                    |
| 14  | Proteção de histórico git (Lovable) | ✅ Garantido                      | Sem force-push/rebase; avisos no AGENTS.md                           |
| 15  | Rebuild completo + push             | ✅ Código pronto (push feito)     | typecheck/lint/test/build verdes; push em `main`                     |

## Pendências que dependem de ambiente (não bloqueiam o código)

- Aplicar migrations **0030/0031/0032** e rodar `docs/TEST_RUNTIME.md` em
  staging (exige acesso ao projeto Supabase — sem credenciais service/DB aqui).
- Rotação do JWT secret do Supabase para expirar de fato tokens legados de
  10 anos (código já tolera o formato antigo e reassina; a expiração efetiva
  depende da rotação).
- Decisão de produto (fora do escopo técnico): `media_settings` nunca deve
  conter `api_secret` embutida no banco acessível por `service_role` de longo
  prazo — considerar mover para secrets do provedor.

## Como reproduzir as verificações de código

```bash
npm run typecheck && npm run lint && npm test && npm run build && npm run format:check
```

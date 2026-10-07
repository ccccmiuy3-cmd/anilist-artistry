# Corrigir falhas de SEO

## Escopo

- Adicionar um título principal visível à página inicial e ao leitor de capítulos.
- Tornar títulos, descrições, URLs sociais e dados de compartilhamento das páginas de obra, capítulo e lista específicos para cada conteúdo.
- Criar `sitemap.xml` com páginas públicas e obras publicadas, sem incluir painel, autenticação ou páginas privadas.
- Referenciar o sitemap em `robots.txt`.
- Conectar e concluir a configuração do Google Search Console para `https://bettermanga.net/`, incluindo verificação e envio do sitemap.
- Não criar a página `/manhwa`, conforme solicitado; essa oportunidade continuará pendente.

## Detalhes técnicos

- Carregar dados públicos das rotas dinâmicas no loader para que os metadados sejam renderizados no HTML inicial.
- Usar a capa real da obra como imagem social apenas quando houver URL HTTPS absoluta; não criar imagem genérica.
- Usar canonical e `og:url` autorreferentes em cada página pública.
- O sitemap consultará todas as obras publicadas em páginas, usando acesso público e falhando por inteiro se a consulta falhar.
- Marcar como corrigidos somente os findings totalmente resolvidos; a oportunidade `/manhwa` permanecerá falhando.

## Validação

- Conferir compilação, HTML renderizado, títulos principais e conteúdo XML do sitemap.
- Publicar as alterações necessárias para a verificação do Search Console somente pelo fluxo de aprovação.

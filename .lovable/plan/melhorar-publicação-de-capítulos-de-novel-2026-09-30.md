# Melhorar publicação de capítulos de novel

## Objetivo

Transformar o formulário atual em uma área de escrita e publicação mais segura e organizada para capítulos em texto.

## Alterações

- Reorganizar a tela em duas áreas: lista de capítulos da novel e editor do capítulo selecionado.
- Permitir criar, editar, publicar/despublicar e excluir capítulos de novel.
- Adicionar busca na lista, ordenação por número e indicação clara de rascunho/publicado.
- Melhorar o editor com contagem de palavras, caracteres, tempo estimado de leitura e prévia formatada.
- Salvar o texto em rascunho no navegador durante a escrita para evitar perda acidental.
- Bloquear números duplicados e confirmar ações destrutivas.

## Detalhes técnicos

- Usar a tabela de capítulos existente; nenhuma mudança no banco é necessária.
- Atualizar somente a área administrativa de novels e reutilizar os controles visuais existentes.
- Invalidar os dados da novel, detalhes públicos e leitor após cada alteração publicada.

## Validação

- Testar criação, edição, rascunho, publicação e exclusão.
- Conferir desktop e celular, incluindo textos longos e ausência de estouro lateral.
- Verificar compilação e erros do navegador antes de concluir.

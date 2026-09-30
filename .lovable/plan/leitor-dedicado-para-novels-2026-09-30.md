# Leitor dedicado para novels

## Objetivo
Atualizar somente a experiência de leitura de obras do tipo **Novel**, seguindo o modelo enviado e preservando o leitor atual de mangás/comics.

## Alterações
- Criar uma barra superior compacta para novels com retorno à obra, título/capítulo, tela cheia e acesso à página inicial.
- Adicionar um painel de leitura com controles de tamanho da fonte, largura do texto, espaçamento entre linhas e tema de leitura escuro/suave.
- Melhorar a apresentação do capítulo com título, texto justificado, hierarquia tipográfica e largura confortável para leitura longa.
- Adaptar os controles para celular, mantendo as ações principais visíveis e agrupando as opções de leitura.
- Refinar a navegação “Anterior / Capítulos / Seguinte” e manter comentários, progresso salvo e retomada exata já existentes.

## Detalhes técnicos
- A mudança ficará concentrada na rota atual do leitor e será ativada apenas quando `kind === "Novel"`.
- Serão reutilizados os componentes, tokens de cor e dados existentes; nenhuma alteração no banco será necessária.
- O leitor de páginas por imagem permanecerá inalterado.

## Validação
- Conferir o leitor de novel em desktop e celular.
- Confirmar controles de fonte/tema/largura, navegação de capítulos e ausência de mudanças no modo mangá.
- Verificar erros de compilação e execução antes de concluir.

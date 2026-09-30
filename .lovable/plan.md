# Atualizar o perfil pelo modelo enviado

## O que será feito
- Reorganizar o topo do perfil para usar o banner em toda a largura, avatar sobreposto e informações alinhadas como na referência.
- Exibir nome, @usuário, nível, todos os selos de assinatura/evento e o selo ADMIN no cabeçalho.
- Mostrar seguidores, seguindo, posição no ranking, progresso de XP, estatísticas da conta e data de entrada.
- Manter os botões de seguir e editar perfil, favoritos, comentários e demais recursos já existentes.
- Adaptar o mesmo visual para celular sem esconder informações importantes.

## Detalhes técnicos
- Reaproveitar `FramedAvatar`, `UserBadges` e os dados já existentes no Lovable Cloud.
- Consultar selos, cargo e contadores públicos do perfil com as permissões atuais.
- Usar os componentes e cores do tema escuro atual, sem copiar dependências externas do HTML de referência.
- Validar o perfil em desktop e celular, além de confirmar que a compilação continua sem erros.

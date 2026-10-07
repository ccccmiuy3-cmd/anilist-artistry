# Selos expirados e gestão por perfil

## Resultado

- Cadastrar como eventos encerrados todos os selos com imagem encontrados no modelo enviado.
- Manter esses selos indisponíveis para resgate público.
- No painel de contas, permitir ao administrador escolher um selo cadastrado e entregá-lo a qualquer usuário.
- Exibir os selos já recebidos e permitir removê-los do perfil.

## Implementação

- Inserir os oito selos do arquivo enviado em `badge_events` com estado inativo e data de término no passado, evitando duplicações pela imagem.
- Substituir o cadastro manual de nome/URL na edição da conta por uma galeria dos selos cadastrados, incluindo os expirados.
- Ao entregar um selo, criar o vínculo com o evento para impedir duplicação e preservar a origem do emblema.
- Manter as verificações administrativas e as regras atuais de acesso.

## Verificação

- Confirmar os oito eventos encerrados no banco.
- Validar o painel de contas em desktop e celular, incluindo entrega e remoção sem alterar dados reais durante o teste visual.
- Confirmar compilação e ausência de erros no navegador.

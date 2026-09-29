# PsyCase — codigo-fonte

Esta pasta contem a versao atual do PsyCase para abrir no computador. O visual e as telas sao os mesmos do projeto; os registros de pacientes nao estao incluidos.

## Abrir no computador

1. Instale o [Bun](https://bun.sh/docs/installation).
2. Descompacte o ZIP e abra um terminal **dentro da pasta PsyCase**.
3. Copie `.env.example` para `.env` (no Windows: `copy .env.example .env`; no macOS/Linux: `cp .env.example .env`). O arquivo ja tem os valores **publicos** da conexao atual.
4. Execute `bun install` e, depois, `bun run dev`.
5. Abra o endereco local exibido no terminal.

A conexao atual usa Lovable Cloud: para acessar os casos existentes, entre com a mesma conta confirmada usada no PsyCase online. A pasta nao contem prontuarios, senhas, sessoes de login ou dados clinicos. Login Google local pode exigir configuracao de origem/retorno autorizada; login por e-mail e senha continua disponivel.

## Enviar ao GitHub

Envie **o conteudo da pasta PsyCase descompactada**, nao apenas o ZIP. Prefira um repositorio privado por conter codigo de um sistema clinico. O `.env` e ignorado pelo Git; confira antes de enviar e nunca publique senhas, chaves privadas nem dados de pacientes. Esta copia e independente: se depois voce conectar o GitHub pelo Lovable, nao misture dois repositorios sem conferir o historico.

As migracoes em `drizzle/migrations` documentam o banco ja existente. **Nao as execute novamente** na conexao atual. IA generativa e a pesquisa cientifica do Observatorio ainda nao foram integradas.

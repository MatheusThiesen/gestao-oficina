# Publicar uma versão nova

Os programas instalados verificam as Releases do GitHub ao abrir e a cada 4 horas, baixam a versão nova
em segundo plano e mostram "Reiniciar e atualizar". Se o usuário não reiniciar, a atualização é instalada
quando ele fecha o programa. Os dados (banco, logo, logs) ficam na pasta do usuário e não são tocados.

## Uma vez

1. O repositório é `MatheusThiesen/gestao-oficina` e precisa continuar **público**: em repositório
   privado o programa precisaria carregar um token do GitHub, que qualquer um extrairia. Para usar
   outro, troque `owner`/`repo` em `electron-builder.yml` → `publish` e a URL em `package.json`.
2. O workflow `.github/workflows/release.yml` publica as versões.
3. Em *Settings → Actions → General → Workflow permissions*, deixe **Read and write permissions**.

## A cada versão

```bash
npm version patch        # 0.1.0 → 0.1.1 (ou minor / major); cria o commit e a tag v0.1.1
git push --follow-tags
```

O GitHub Actions confere se a tag bate com o `package.json`, roda typecheck e testes, gera o instalador
do Windows (`Gestao-Oficina-Setup-<versão>.exe`) e publica na Release com o `latest.yml`, que os programas
instalados leem.

## Mudança no banco

Gere a migration normalmente (`npm run db:migrate -- --name descricao`) e faça commit da pasta
`prisma/migrations`. Ao abrir a versão nova, o programa guarda uma cópia do banco
(`dados.antes-da-atualizacao-<data>.db`) e aplica os `.sql` pendentes.

## Observações

- O instalador não é assinado digitalmente; o Windows SmartScreen mostra "Editor desconhecido" na
  primeira instalação ("Mais informações → Executar assim mesmo"). Para tirar o aviso é preciso um
  certificado de assinatura de código.
- Log do programa, para suporte: `%APPDATA%\Gestão Oficina\logs\main.log`.
- Gerar o instalador local, sem publicar: `npm run dist:win` (no Windows).

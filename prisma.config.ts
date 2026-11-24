import { defineConfig } from 'prisma/config'

// Banco só de desenvolvimento, usado pelo `prisma migrate dev` para gerar os .sql.
// O app usa o banco em app.getPath('userData')/dados.db, migrado pelo runner próprio.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: 'file:./prisma/dev.db' }
})

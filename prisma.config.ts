import { definePrismaConfig } from 'prisma/config';
import pgvector from '@prisma/orm-extension-pgvector/control';
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';
import { config } from './src/config.js';

export default definePrismaConfig({
  orm: ormConfig({
    contract: './src/prisma/contract.prisma',
    extensions: [pgvector],
    db: {
      connection: config.pgUrl!,
    },
  }),
});

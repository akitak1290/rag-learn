import pgvector from '@prisma/orm-extension-pgvector/runtime';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';
import type { Contract } from './contract.d.js';
import contractJson from './contract.json' with { type: 'json' };
import { config } from '../config.js';

// must use v8
// must run npm run db:generate:contract first
//
// basic setup for vector extensions
// https://www.prisma.io/docs/orm/extensions/using-extensions
export const db = postgres<Contract>({
  contract: contractFromJson<Contract>(contractJson),
  url: config.pgUrl!, 
  extensions: [pgvector],
});
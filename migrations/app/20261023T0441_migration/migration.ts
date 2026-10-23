#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/e9a81bee1b6d35b89795457df1e089e828d3b5fa5466b2db2753931d5e7468e1/contract';
import endContract from '../../snapshots/e9a81bee1b6d35b89795457df1e089e828d3b5fa5466b2db2753931d5e7468e1/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f0062f8ae86917aff5e9b53bc19dce67cd8d70129da1fb2e3aa679362016975d/contract';
import startContract from '../../snapshots/f0062f8ae86917aff5e9b53bc19dce67cd8d70129da1fb2e3aa679362016975d/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropConstraint({ schema: 'public', table: 'Faq', constraint: 'Faq_contentHash_key' }),
      this.addRequiredColumnToEmptyTable({
        schema: 'public',
        table: 'Faq',
        column: 'sourceKey',
        type: 'text',
      }),
      this.addUnique({
        schema: 'public',
        table: 'Faq',
        constraint: 'Faq_sourceKey_key',
        columns: ['sourceKey'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

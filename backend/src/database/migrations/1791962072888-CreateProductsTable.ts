import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductsTable1791962072888 implements MigrationInterface {
  name = 'CreateProductsTable1791962072888';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`PRODUCTS\` (
        \`CREATED_AT\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`UPDATED_AT\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),
        \`ID\` int NOT NULL AUTO_INCREMENT,
        \`NAME\` varchar(150) NOT NULL,
        \`SKU\` varchar(50) NOT NULL,
        \`DESCRIPTION\` text NULL,
        \`UNIT_PRICE\` decimal(12,2) NOT NULL,
        \`UNIT\` varchar(20) NOT NULL DEFAULT 'PCS',
        \`ORGANIZATION_ID\` int NOT NULL,
        \`IS_ACTIVE\` tinyint NOT NULL DEFAULT 1,
        UNIQUE INDEX \`IDX_PRODUCTS_ORG_SKU\`
          (\`ORGANIZATION_ID\`, \`SKU\`),
        PRIMARY KEY (\`ID\`),
        CONSTRAINT \`FK_PRODUCTS_ORGANIZATION\`
          FOREIGN KEY (\`ORGANIZATION_ID\`)
          REFERENCES \`ORGANIZATIONS\` (\`ID\`)
          ON DELETE RESTRICT ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `PRODUCTS`');
  }
}

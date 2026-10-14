import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePurchaseOrdersTables1791968968508 implements MigrationInterface {
  name = 'CreatePurchaseOrdersTables1791968968508';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`PURCHASE_ORDERS\` (
        \`CREATED_AT\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`UPDATED_AT\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),
        \`ID\` int NOT NULL AUTO_INCREMENT,
        \`ORDER_NUMBER\` varchar(50) NOT NULL,
        \`ORDER_DATE\` date NOT NULL,
        \`EXPECTED_DELIVERY_DATE\` date NULL,
        \`STATUS\` enum(
          'DRAFT',
          'SUBMITTED',
          'APPROVED',
          'REJECTED',
          'CANCELLED'
        ) NOT NULL DEFAULT 'DRAFT',
        \`TOTAL_AMOUNT\` decimal(14,2) NOT NULL DEFAULT 0,
        \`NOTES\` text NULL,
        \`ORGANIZATION_ID\` int NOT NULL,
        \`SUPPLIER_ID\` int NOT NULL,
        UNIQUE INDEX \`IDX_PO_ORG_NUMBER\`
          (\`ORGANIZATION_ID\`, \`ORDER_NUMBER\`),
        PRIMARY KEY (\`ID\`),
        CONSTRAINT \`FK_PO_ORGANIZATION\`
          FOREIGN KEY (\`ORGANIZATION_ID\`)
          REFERENCES \`ORGANIZATIONS\` (\`ID\`)
          ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT \`FK_PO_SUPPLIER\`
          FOREIGN KEY (\`SUPPLIER_ID\`)
          REFERENCES \`SUPPLIERS\` (\`ID\`)
          ON DELETE RESTRICT ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`PURCHASE_ORDER_ITEMS\` (
        \`CREATED_AT\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`UPDATED_AT\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),
        \`ID\` int NOT NULL AUTO_INCREMENT,
        \`PURCHASE_ORDER_ID\` int NOT NULL,
        \`PRODUCT_ID\` int NOT NULL,
        \`QUANTITY\` int NOT NULL,
        \`UNIT_PRICE\` decimal(12,2) NOT NULL,
        \`LINE_TOTAL\` decimal(14,2) NOT NULL,
        PRIMARY KEY (\`ID\`),
        CONSTRAINT \`FK_PO_ITEM_ORDER\`
          FOREIGN KEY (\`PURCHASE_ORDER_ID\`)
          REFERENCES \`PURCHASE_ORDERS\` (\`ID\`)
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT \`FK_PO_ITEM_PRODUCT\`
          FOREIGN KEY (\`PRODUCT_ID\`)
          REFERENCES \`PRODUCTS\` (\`ID\`)
          ON DELETE RESTRICT ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `PURCHASE_ORDER_ITEMS`');
    await queryRunner.query('DROP TABLE `PURCHASE_ORDERS`');
  }
}

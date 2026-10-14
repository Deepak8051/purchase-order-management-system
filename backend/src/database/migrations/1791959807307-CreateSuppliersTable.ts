import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSuppliersTable1791959807307 implements MigrationInterface {
  name = 'CreateSuppliersTable1791959807307';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`SUPPLIERS\` (
        \`CREATED_AT\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`UPDATED_AT\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),
        \`ID\` int NOT NULL AUTO_INCREMENT,
        \`NAME\` varchar(150) NOT NULL,
        \`CODE\` varchar(50) NOT NULL,
        \`CONTACT_PERSON\` varchar(100) NULL,
        \`EMAIL\` varchar(150) NULL,
        \`PHONE\` varchar(20) NULL,
        \`ADDRESS\` text NULL,
        \`ORGANIZATION_ID\` int NOT NULL,
        \`IS_ACTIVE\` tinyint NOT NULL DEFAULT 1,
        UNIQUE INDEX \`IDX_SUPPLIERS_ORG_CODE\`
          (\`ORGANIZATION_ID\`, \`CODE\`),
        PRIMARY KEY (\`ID\`),
        CONSTRAINT \`FK_SUPPLIERS_ORGANIZATION\`
          FOREIGN KEY (\`ORGANIZATION_ID\`)
          REFERENCES \`ORGANIZATIONS\` (\`ID\`)
          ON DELETE RESTRICT ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `SUPPLIERS`');
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1791953695886 implements MigrationInterface {
  name = 'CreateUsersTable1791953695886';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`USERS\` (
        \`ID\` int NOT NULL AUTO_INCREMENT,
        \`NAME\` varchar(100) NOT NULL,
        \`EMAIL\` varchar(150) NOT NULL,
        \`PASSWORD_HASH\` varchar(255) NOT NULL,
        \`ROLE\` enum('SUPER_ADMIN','ORG_ADMIN')
          NOT NULL DEFAULT 'ORG_ADMIN',
        \`ORGANIZATION_ID\` int NULL,
        \`IS_ACTIVE\` tinyint NOT NULL DEFAULT 1,
        \`CREATED_AT\` datetime(6)
          NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`UPDATED_AT\` datetime(6)
          NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_USERS_EMAIL\` (\`EMAIL\`),
        PRIMARY KEY (\`ID\`),
        CONSTRAINT \`FK_USERS_ORGANIZATION\`
          FOREIGN KEY (\`ORGANIZATION_ID\`)
          REFERENCES \`ORGANIZATIONS\` (\`ID\`)
          ON DELETE RESTRICT
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE \`USERS\`');
  }
}

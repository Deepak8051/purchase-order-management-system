import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserRoles1791953695887 implements MigrationInterface {
  name = 'UpdateUserRoles1791953695887';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Temporarily support both old and new role names.
    await queryRunner.query(`
      ALTER TABLE \`USERS\`
      MODIFY COLUMN \`ROLE\`
      enum(
        'SUPER_ADMIN',
        'SUPER_ADMIN',
        'OUTLET_SUPER_ADMIN',
        'ORG_ADMIN',
        'USER'
      ) NOT NULL DEFAULT 'ORG_ADMIN'
    `);

    // Preserve the existing Super Admin account.
    await queryRunner.query(`
      UPDATE \`USERS\`
      SET \`ROLE\` = 'SUPER_ADMIN'
      WHERE \`ROLE\` = 'SUPER_ADMIN'
    `);

    // Remove the legacy role after migrating existing accounts.
    await queryRunner.query(`
      ALTER TABLE \`USERS\`
      MODIFY COLUMN \`ROLE\`
      enum(
        'SUPER_ADMIN',
        'OUTLET_SUPER_ADMIN',
        'ORG_ADMIN',
        'USER'
      ) NOT NULL DEFAULT 'ORG_ADMIN'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore compatibility with the previous role model.
    await queryRunner.query(`
      ALTER TABLE \`USERS\`
      MODIFY COLUMN \`ROLE\`
      enum(
        'SUPER_ADMIN',
        'SUPER_ADMIN',
        'OUTLET_SUPER_ADMIN',
        'ORG_ADMIN',
        'USER'
      ) NOT NULL DEFAULT 'ORG_ADMIN'
    `);

    await queryRunner.query(`
      UPDATE \`USERS\`
      SET \`ROLE\` = 'SUPER_ADMIN'
      WHERE \`ROLE\` = 'SUPER_ADMIN'
    `);

    await queryRunner.query(`
      ALTER TABLE \`USERS\`
      MODIFY COLUMN \`ROLE\`
      enum('SUPER_ADMIN', 'ORG_ADMIN')
      NOT NULL DEFAULT 'ORG_ADMIN'
    `);
  }
}

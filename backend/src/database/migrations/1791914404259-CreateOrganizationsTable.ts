import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateOrganizationsTable1791914404259 implements MigrationInterface {
    name = 'CreateOrganizationsTable1791914404259'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`ORGANIZATIONS\` (\`CREATED_AT\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`UPDATED_AT\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`ID\` int NOT NULL AUTO_INCREMENT, \`NAME\` varchar(150) NOT NULL, \`CODE\` varchar(30) NOT NULL, \`IS_ACTIVE\` tinyint NOT NULL DEFAULT 1, UNIQUE INDEX \`IDX_e84dbd80ac2cfc9919b768f5ab\` (\`NAME\`), UNIQUE INDEX \`IDX_5000b772629ebae82e2740c26a\` (\`CODE\`), PRIMARY KEY (\`ID\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_5000b772629ebae82e2740c26a\` ON \`ORGANIZATIONS\``);
        await queryRunner.query(`DROP INDEX \`IDX_e84dbd80ac2cfc9919b768f5ab\` ON \`ORGANIZATIONS\``);
        await queryRunner.query(`DROP TABLE \`ORGANIZATIONS\``);
    }

}

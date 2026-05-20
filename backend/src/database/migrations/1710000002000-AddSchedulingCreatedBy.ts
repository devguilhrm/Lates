import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSchedulingCreatedBy1710000002000 implements MigrationInterface {
  name = 'AddSchedulingCreatedBy1710000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "schedulings" ADD "createdById" uuid`);
    await queryRunner.query(
      `ALTER TABLE "schedulings" ADD CONSTRAINT "FK_schedulings_created_by" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "schedulings" DROP CONSTRAINT "FK_schedulings_created_by"`);
    await queryRunner.query(`ALTER TABLE "schedulings" DROP COLUMN "createdById"`);
  }
}

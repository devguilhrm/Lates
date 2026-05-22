import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckedInStatusToSchedulings1710000007000 implements MigrationInterface {
  name = 'AddCheckedInStatusToSchedulings1710000007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."schedulings_status_enum" RENAME TO "schedulings_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."schedulings_status_enum" AS ENUM('SCHEDULED', 'CHECKED_IN', 'CANCELLED', 'COMPLETED', 'NO_SHOW')`,
    );
    await queryRunner.query(`ALTER TABLE "schedulings" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "schedulings" ALTER COLUMN "status" TYPE "public"."schedulings_status_enum" USING "status"::text::"public"."schedulings_status_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "schedulings" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED'`);
    await queryRunner.query(`DROP TYPE "public"."schedulings_status_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "schedulings" SET "status" = 'SCHEDULED' WHERE "status" = 'CHECKED_IN'`);
    await queryRunner.query(
      `ALTER TYPE "public"."schedulings_status_enum" RENAME TO "schedulings_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."schedulings_status_enum" AS ENUM('SCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW')`,
    );
    await queryRunner.query(`ALTER TABLE "schedulings" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "schedulings" ALTER COLUMN "status" TYPE "public"."schedulings_status_enum" USING "status"::text::"public"."schedulings_status_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "schedulings" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED'`);
    await queryRunner.query(`DROP TYPE "public"."schedulings_status_enum_old"`);
  }
}

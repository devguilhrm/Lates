import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInternalNotifications1710000008000 implements MigrationInterface {
  name = 'CreateInternalNotifications1710000008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "internal_notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" character varying(80) NOT NULL,
        "title" character varying(160) NOT NULL,
        "message" text NOT NULL,
        "isRead" boolean NOT NULL DEFAULT false,
        "readAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "userId" uuid NOT NULL,
        "schedulingId" uuid,
        CONSTRAINT "PK_internal_notifications_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_internal_notifications_user_createdAt" ON "internal_notifications" ("userId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_internal_notifications_user_isRead" ON "internal_notifications" ("userId", "isRead")`,
    );
    await queryRunner.query(
      `ALTER TABLE "internal_notifications" ADD CONSTRAINT "FK_internal_notifications_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "internal_notifications" ADD CONSTRAINT "FK_internal_notifications_scheduling" FOREIGN KEY ("schedulingId") REFERENCES "schedulings"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "internal_notifications" DROP CONSTRAINT "FK_internal_notifications_scheduling"`,
    );
    await queryRunner.query(
      `ALTER TABLE "internal_notifications" DROP CONSTRAINT "FK_internal_notifications_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_internal_notifications_user_isRead"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_internal_notifications_user_createdAt"`);
    await queryRunner.query(`DROP TABLE "internal_notifications"`);
  }
}

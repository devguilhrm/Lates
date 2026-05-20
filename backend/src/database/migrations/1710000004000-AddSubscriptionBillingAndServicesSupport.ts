import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionBillingAndServicesSupport1710000004000 implements MigrationInterface {
  name = 'AddSubscriptionBillingAndServicesSupport1710000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."clients_plan_enum" ADD VALUE IF NOT EXISTS 'ANNUAL'`);
    await queryRunner.query(
      `CREATE TYPE "public"."client_billings_cycle_enum" AS ENUM('MONTHLY', 'QUARTERLY', 'ANNUAL')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."client_billings_status_enum" AS ENUM('PENDING', 'OVERDUE', 'PAID')`,
    );
    await queryRunner.query(`
      CREATE TABLE "client_billings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "cycle" "public"."client_billings_cycle_enum" NOT NULL,
        "referencePeriod" date NOT NULL,
        "dueDate" date NOT NULL,
        "status" "public"."client_billings_status_enum" NOT NULL DEFAULT 'PENDING',
        "amount" numeric(12,2) NOT NULL,
        "paidAt" TIMESTAMP WITH TIME ZONE,
        "clientId" uuid NOT NULL,
        CONSTRAINT "PK_client_billings_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_client_billings_cycle_period" UNIQUE ("clientId", "cycle", "referencePeriod")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "client_billings" ADD CONSTRAINT "FK_client_billings_client" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(`ALTER TABLE "financial_transactions" ADD "clientId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "financial_transactions" ADD CONSTRAINT "FK_financial_transactions_client" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."schedulings_cancellation_type_enum" AS ENUM('CLIENT_CANCELLED', 'PROFESSIONAL_CANCELLED', 'NO_SHOW')`,
    );
    await queryRunner.query(
      `ALTER TABLE "schedulings" ADD "cancellationType" "public"."schedulings_cancellation_type_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "schedulings" DROP COLUMN "cancellationType"`);
    await queryRunner.query(`DROP TYPE "public"."schedulings_cancellation_type_enum"`);

    await queryRunner.query(
      `ALTER TABLE "financial_transactions" DROP CONSTRAINT "FK_financial_transactions_client"`,
    );
    await queryRunner.query(`ALTER TABLE "financial_transactions" DROP COLUMN "clientId"`);

    await queryRunner.query(`ALTER TABLE "client_billings" DROP CONSTRAINT "FK_client_billings_client"`);
    await queryRunner.query(`DROP TABLE "client_billings"`);
    await queryRunner.query(`DROP TYPE "public"."client_billings_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."client_billings_cycle_enum"`);
  }
}

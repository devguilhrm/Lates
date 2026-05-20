import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFinanceTransactions1710000001000 implements MigrationInterface {
  name = 'AddFinanceTransactions1710000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."financial_transactions_type_enum" AS ENUM('INCOME', 'EXPENSE')`,
    );
    await queryRunner.query(`
      CREATE TABLE "financial_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "description" character varying(140) NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "type" "public"."financial_transactions_type_enum" NOT NULL,
        "category" character varying,
        "occurredAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_financial_transactions_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "financial_transactions"`);
    await queryRunner.query(`DROP TYPE "public"."financial_transactions_type_enum"`);
  }
}

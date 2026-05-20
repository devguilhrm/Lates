import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentFieldsToFinanceTransactions1710000003000 implements MigrationInterface {
  name = 'AddPaymentFieldsToFinanceTransactions1710000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."financial_transactions_payment_method_enum" AS ENUM('PIX', 'CREDIT_CARD', 'DEBIT_CARD')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."financial_transactions_card_brand_enum" AS ENUM('VISA', 'MASTERCARD', 'ELO', 'HIPERCARD', 'AMEX')`,
    );
    await queryRunner.query(
      `ALTER TABLE "financial_transactions" ADD "paymentMethod" "public"."financial_transactions_payment_method_enum" NOT NULL DEFAULT 'PIX'`,
    );
    await queryRunner.query(
      `ALTER TABLE "financial_transactions" ADD "cardBrand" "public"."financial_transactions_card_brand_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "financial_transactions" ADD "installments" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "financial_transactions" DROP COLUMN "installments"`);
    await queryRunner.query(`ALTER TABLE "financial_transactions" DROP COLUMN "cardBrand"`);
    await queryRunner.query(`ALTER TABLE "financial_transactions" DROP COLUMN "paymentMethod"`);
    await queryRunner.query(`DROP TYPE "public"."financial_transactions_card_brand_enum"`);
    await queryRunner.query(`DROP TYPE "public"."financial_transactions_payment_method_enum"`);
  }
}

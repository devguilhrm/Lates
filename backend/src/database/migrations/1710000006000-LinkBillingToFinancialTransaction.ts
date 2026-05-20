import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkBillingToFinancialTransaction1710000006000 implements MigrationInterface {
  name = 'LinkBillingToFinancialTransaction1710000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "client_billings" ADD "paymentTransactionId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "client_billings" ADD CONSTRAINT "FK_client_billings_payment_transaction" FOREIGN KEY ("paymentTransactionId") REFERENCES "financial_transactions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "client_billings" DROP CONSTRAINT "FK_client_billings_payment_transaction"`,
    );
    await queryRunner.query(`ALTER TABLE "client_billings" DROP COLUMN "paymentTransactionId"`);
  }
}

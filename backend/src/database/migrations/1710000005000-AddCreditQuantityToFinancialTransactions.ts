import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreditQuantityToFinancialTransactions1710000005000 implements MigrationInterface {
  name = 'AddCreditQuantityToFinancialTransactions1710000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "financial_transactions" ADD "creditQuantity" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "financial_transactions" DROP COLUMN "creditQuantity"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1710000000000 implements MigrationInterface {
  name = 'InitialSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'RECEPTIONIST', 'PROFESSIONAL', 'CLIENT')`);
    await queryRunner.query(`CREATE TYPE "public"."clients_plan_enum" AS ENUM('MONTHLY', 'QUARTERLY', 'CREDIT_PACK')`);
    await queryRunner.query(`CREATE TYPE "public"."availabilities_dayofweek_enum" AS ENUM('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN')`);
    await queryRunner.query(`CREATE TYPE "public"."schedulings_status_enum" AS ENUM('SCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW')`);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(120) NOT NULL,
        "email" character varying NOT NULL,
        "passwordHash" character varying NOT NULL,
        "refreshTokenHash" character varying,
        "role" "public"."users_role_enum" NOT NULL DEFAULT 'CLIENT',
        "phone" character varying,
        "avatarUrl" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "clients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "birthDate" date,
        "anamnesis" text,
        "emergencyContact" character varying,
        "plan" "public"."clients_plan_enum" NOT NULL,
        "creditsRemaining" integer NOT NULL DEFAULT 0,
        "userId" uuid,
        CONSTRAINT "REL_clients_user" UNIQUE ("userId"),
        CONSTRAINT "PK_clients_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "professionals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "specialty" character varying(80) NOT NULL,
        "bio" character varying,
        "userId" uuid,
        CONSTRAINT "REL_professionals_user" UNIQUE ("userId"),
        CONSTRAINT "PK_professionals_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "availabilities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "dayOfWeek" "public"."availabilities_dayofweek_enum" NOT NULL,
        "startTime" TIME NOT NULL,
        "endTime" TIME NOT NULL,
        "maxConcurrentClients" integer NOT NULL DEFAULT 1,
        "professionalId" uuid,
        CONSTRAINT "PK_availabilities_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "schedulings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "startAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "endAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "status" "public"."schedulings_status_enum" NOT NULL DEFAULT 'SCHEDULED',
        "notes" character varying,
        "cancellationReason" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "clientId" uuid,
        "professionalId" uuid,
        CONSTRAINT "PK_schedulings_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`ALTER TABLE "clients" ADD CONSTRAINT "FK_clients_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "professionals" ADD CONSTRAINT "FK_professionals_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "availabilities" ADD CONSTRAINT "FK_availabilities_professional" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "schedulings" ADD CONSTRAINT "FK_schedulings_client" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "schedulings" ADD CONSTRAINT "FK_schedulings_professional" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "schedulings" DROP CONSTRAINT "FK_schedulings_professional"`);
    await queryRunner.query(`ALTER TABLE "schedulings" DROP CONSTRAINT "FK_schedulings_client"`);
    await queryRunner.query(`ALTER TABLE "availabilities" DROP CONSTRAINT "FK_availabilities_professional"`);
    await queryRunner.query(`ALTER TABLE "professionals" DROP CONSTRAINT "FK_professionals_user"`);
    await queryRunner.query(`ALTER TABLE "clients" DROP CONSTRAINT "FK_clients_user"`);
    await queryRunner.query(`DROP TABLE "schedulings"`);
    await queryRunner.query(`DROP TABLE "availabilities"`);
    await queryRunner.query(`DROP TABLE "professionals"`);
    await queryRunner.query(`DROP TABLE "clients"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."schedulings_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."availabilities_dayofweek_enum"`);
    await queryRunner.query(`DROP TYPE "public"."clients_plan_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}

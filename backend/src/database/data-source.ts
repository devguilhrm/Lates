import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Availability, Client, ClientBilling, FinancialTransaction, Professional, Scheduling, User } from './entities';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  entities: [User, Client, Professional, Availability, Scheduling, FinancialTransaction, ClientBilling],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
});

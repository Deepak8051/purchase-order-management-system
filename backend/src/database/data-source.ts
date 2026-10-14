import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [Organization, User, Supplier],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});

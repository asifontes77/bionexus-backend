import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { resolveDatabaseOptions } from './database.config';

const options: DataSourceOptions = resolveDatabaseOptions(
  {
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_DATABASE: process.env.DB_DATABASE,
  },
  __dirname,
) as DataSourceOptions;

const AppDataSource = new DataSource(options);

export default AppDataSource;

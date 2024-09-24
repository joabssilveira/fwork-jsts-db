import dotenv from 'dotenv'
import { Dialect } from 'sequelize'
import { StringUtils } from 'fwork.common.typescript'
dotenv.config()

export interface ISequelizeSettings {
  username?: string | undefined,
  userpwd?: string | undefined,
  database?: string | undefined,
  host?: string | undefined,
  dialect?: Dialect | undefined,
  logging?: boolean | undefined,
  sync?: boolean | undefined,
  force?: boolean | undefined,
  alter?: boolean | undefined,
}

export const SequelizeEnv: ISequelizeSettings = {
  username: process.env.SEQDB_USERNAME,
  userpwd: process.env.SEQDB_PASSWORD,
  database: process.env.SEQDB_DATABASE,
  host: process.env.SEQDB_HOST,
  dialect: process.env.SEQDB_DIALECT as Dialect,
  logging: StringUtils.toBool(process.env.SEQDB_LOGGING),
  sync: StringUtils.toBool(process.env.SEQDB_SYNC),
  force: StringUtils.toBool(process.env.SEQDB_FORCE),
  alter: StringUtils.toBool(process.env.SEQDB_ALTER),
}
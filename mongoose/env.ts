import dotenv from 'dotenv'
dotenv.config()

export interface IMongooseSettings {
  uri?: string | undefined,
  database?: string | undefined,
}

export const MongooseEnv: IMongooseSettings = {
  uri: process.env.MONDB_URI,
  database: process.env.MONDB_NAME,
}
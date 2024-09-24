import dotenv from 'dotenv'
dotenv.config()

export interface IRedisSettings {
  uri?: string | undefined,
}

export const RedisEnv: IRedisSettings = {
  uri: process.env.REDIS_URI,
}
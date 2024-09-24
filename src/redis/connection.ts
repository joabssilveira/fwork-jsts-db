import { RedisClientType, RedisDefaultModules, RedisFunctions, RedisModules, RedisScripts, createClient } from 'redis';
import { IDbConnection } from '../dbClient/connection';
import { IRedisSettings, RedisEnv } from './env';

export class RedisConnection implements IDbConnection {
  client: RedisClientType<RedisDefaultModules & RedisModules, RedisFunctions, RedisScripts> | undefined
  env: IRedisSettings | undefined

  constructor(env?: IRedisSettings | undefined) {
    console.log('RedisConnection.constructor()');

    this.env = env || RedisEnv
  }

  async open() {
    console.log('RedisConnection.open()')
    console.log(`env: ${JSON.stringify(this.env, null, 4)}`)

    this.client = createClient({
      url: this.env?.uri
      // legacyMode: true
    })
    await this.client?.connect()

    var ping = await this.client?.ping()
    console.log(`RedisConnection.open().ping: ${ping}`)
  }
  async close() {
    await this.client?.disconnect()
    await this.client?.quit()
  }
}
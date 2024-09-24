import mongoose, { Connection, ConnectionStates } from 'mongoose'
import { IDbConnection } from '../dbClient/connection'
import { IMongooseSettings, MongooseEnv } from './env'

export abstract class MongooseConnection implements IDbConnection {
  connection: Connection | undefined
  env: IMongooseSettings | undefined

  constructor(env?: IMongooseSettings | undefined) {
    console.log('MongooseConnection.constructor()')
    
    this.env = env || MongooseEnv
  }

  async open() {
    console.log('MongooseConnection.open()')
    console.log(`env: ${JSON.stringify(this.env, null, 4)}`)

    if (this.connection)
      if (this.connection?.readyState == ConnectionStates.connected)
        throw Error('Connection is already open')

    this.connection = mongoose.createConnection(this.env?.uri || '', {
      dbName: this.env?.database
    })

    console.log(`Database connection (id: ${this.connection.id}) status: ${this.connection.readyState}`)
  }

  async close() {
    await this.connection?.close()
  }
}
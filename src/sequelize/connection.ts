import { Sequelize } from 'sequelize'
import { ISequelizeSettings, SequelizeEnv } from './env'
import { SequelizeTransaction } from './transaction'
import * as tedious from 'tedious'
import * as mysql2 from 'mysql2'
import { IDbConnection } from '../dbClient/connection'

export class DbConnectionSequelize implements IDbConnection {
  sequelize: Sequelize | undefined
  env: ISequelizeSettings | undefined

  onBeforeSync?: () => Promise<void | undefined> | void | undefined
  onAfterSync?: () => Promise<void | undefined> | void | undefined
  onBeforeOpen?: () => Promise<void | undefined> | void | undefined
  onAfterOpen?: () => Promise<void | undefined> | void | undefined

  constructor(env?: ISequelizeSettings | undefined) {
    console.log('DbConnectionSequelize.constructor()');

    this.env = env || SequelizeEnv
  }

  async newTransaction() {
    const transactionObj = await this.sequelize?.transaction()
    if (transactionObj)
      return new SequelizeTransaction({
        transactionObj
      })

    return undefined
  }

  async open() {
    console.log('DbConnectionSequelize.open()')
    console.log(`env: ${JSON.stringify(this.env, null, 4)}`)

    if (this.onBeforeOpen)
      await this.onBeforeOpen()

    // const dialectModuleName =
    //   this.env?.dialect == 'mysql' ?
    //     'mysql2' : this.env?.dialect == 'mssql' ?
    //       'tedious' : 'mysql2'

    // const dialectModule = require(dialectModuleName)

    this.sequelize = new Sequelize({
      username: this.env?.username,
      password: this.env?.userpwd,
      database: this.env?.database,
      host: this.env?.host,
      dialect: this.env?.dialect,
      logging: this.env?.logging,
      dialectModule: this.env?.dialect == 'mssql' ?
        tedious : mysql2,
    })

    if (this.onAfterOpen)
      await this.onAfterOpen()

    if (this.env?.sync) {
      try {
        if (this.onBeforeSync)
          await this.onBeforeSync()
        await this.sequelize.sync({
          logging: this.env.logging,
          force: this.env.force,
          alter: this.env.alter
        })
        if (this.onAfterSync)
          await this.onAfterSync()
      } catch (error) {
        console.log('ERROR -> DbConnectionSequelize.open() this.sequelize.sync()')
        console.log(error)
      }
    }
  }

  async close() {
    await this.sequelize?.close()
  }
}
import { Sequelize } from 'sequelize'
import { ISequelizeSettings, SequelizeEnv } from './env'
import { SequelizeTransaction } from './transaction'
import * as tedious from 'tedious'
import * as mysql2 from 'mysql2'
import { IDbConnection } from '../dbClient/connection'

export class DbConnectionSequelize implements IDbConnection {
  sequelize: Sequelize | undefined
  env: ISequelizeSettings | undefined

  onBeforeSync?: () => void | undefined = undefined

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
  }

  async open() {
    console.log('DbConnectionSequelize.open()')
    console.log(`env: ${JSON.stringify(this.env, null, 4)}`)

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
      // dialectModule
      dialectModule: this.env?.dialect == 'mssql' ?
        tedious : mysql2
    })

    if (this.env?.sync) {
      try {
        if (this.onBeforeSync)
          this.onBeforeSync()
        await this.sequelize.sync({
          logging: this.env.logging,
          force: this.env.force,
          alter: this.env.alter
        })
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
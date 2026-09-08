import * as mysql2 from 'mysql2'
import * as pg from 'pg'
import { ModelDefined, Sequelize } from 'sequelize'
import * as tedious from 'tedious'
import { IDbConnection } from '../dbClient/connection'
import { ISequelizeSettings, SequelizeEnv } from './env'
import { SequelizeTransaction } from './transaction'

export type DbConnectionSequelizeOnBeforeSyncResult = {
  includeModelsOnly?: ModelDefined<any, any>[]
}

export class DbConnectionSequelize implements IDbConnection {
  sequelize: Sequelize | undefined
  env: ISequelizeSettings | undefined

  onBeforeSync?: () => Promise<DbConnectionSequelizeOnBeforeSyncResult | undefined> | DbConnectionSequelizeOnBeforeSyncResult | undefined
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
        tedious : this.env?.dialect == 'postgres' ? pg : mysql2,
    })

    if (this.onAfterOpen)
      await this.onAfterOpen()

    if (this.env?.sync) {
      try {
        const options = await this.onBeforeSync?.()

        if (!options?.includeModelsOnly?.length) {
          await this.sequelize.sync({
            logging: this.env.logging,
            force: this.env.force,
            alter: this.env.alter
          })
        }
        else for (let model of options.includeModelsOnly) {
          model.sync({ alter: this.env.alter, logging: this.env.logging, force: this.env.force })
        }

        await this.onAfterSync?.()
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
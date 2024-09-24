import { Transaction, WhereOptions } from 'sequelize'
import { ISequelizeTransaction } from './transaction'
import { IDbBulkCreateOptions, IDbCreateOptions, IDbCrudOptions, IDbDeleteByKeyOptions, IDbDeleteOptions, IDbGetOptions, IDbUpdateOptions } from '../dbClient/crudOptions'

export interface ISequelizeCrudOptions extends IDbCrudOptions {
  transaction?: ISequelizeTransaction
}

export interface ISequelizeBulkCreateOptions<T> extends IDbBulkCreateOptions<T>, ISequelizeCrudOptions {
  data: T[],
}

export interface ISequelizeCreateOptions<T> extends IDbCreateOptions<T>, ISequelizeCrudOptions {
  data: T
}

export interface ISequelizeGetOptions<T> extends IDbGetOptions, ISequelizeCrudOptions {
  where?: WhereOptions<T>
}

export interface ISequelizeUpdateOptions<T> extends IDbUpdateOptions<T>, ISequelizeCrudOptions {
  data: T
}

export interface ISequelizeDeleteOptions<T> extends IDbDeleteOptions, ISequelizeCrudOptions {
  where: WhereOptions<T>
}

export interface ISequelizeDeleteByKeyOptions<keyType> extends IDbDeleteByKeyOptions<keyType>, ISequelizeCrudOptions {

}
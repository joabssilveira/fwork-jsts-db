import { CreateOptions, WhereOptions } from 'sequelize'
import { IDbBulkCreateOptions, IDbCreateOptions, IDbDeleteByKeyOptions, IDbDeleteOptions, IDbGetOptions, IDbUpdateOptions } from '../dbClient/crudOptions'
import { SequelizeTransaction } from './transaction'
import { StrictOmit } from 'fwork-jsts-common'

export interface ISequelizeCrudOptions {
  transaction?: SequelizeTransaction | undefined
}

export interface ISequelizeBulkCreateOptions<T> extends IDbBulkCreateOptions<T>, ISequelizeCrudOptions {
 
}

export interface ISequelizeCreateOptions<T> extends IDbCreateOptions<T>, ISequelizeCrudOptions, StrictOmit<CreateOptions, 'transaction'> {
 
}

export interface ISequelizeGetOptions<T> extends IDbGetOptions, ISequelizeCrudOptions {
  where?: WhereOptions<T>,
 
}

export interface ISequelizeUpdateOptions<T> extends IDbUpdateOptions<T>, ISequelizeCrudOptions {
 
}

export interface ISequelizeDeleteOptions<T> extends IDbDeleteOptions, ISequelizeCrudOptions {
  where: WhereOptions<T>,
}

export interface ISequelizeDeleteByKeyOptions<keyType> extends IDbDeleteByKeyOptions<keyType>, ISequelizeCrudOptions {
 
} 
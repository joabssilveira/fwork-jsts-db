import { FilterQuery } from 'mongoose'
import { IDbBulkCreateOptions, IDbCreateOptions, IDbDeleteByKeyOptions, IDbDeleteOptions, IDbGetOptions, IDbUpdateOptions } from '../dbClient/crudOptions'
import { MongooseTransaction } from './transaction'

export interface IMongooseCrudOptions {
  transaction?: MongooseTransaction | undefined
}

export interface IMongooseBulkCreateOptions<T> extends IDbBulkCreateOptions<T>, IMongooseCrudOptions {
  
}

export interface IMongooseCreateOptions<T> extends IDbCreateOptions<T>, IMongooseCrudOptions {

}

export interface IMongooseGetOptions<T> extends IDbGetOptions, IMongooseCrudOptions {
  where?: FilterQuery<T>,
  addFields?: Record<string, any>,
}

export interface IMongooseUpdateOptions<T> extends IDbUpdateOptions<T>, IMongooseCrudOptions {

}

export interface IMongooseDeleteOptions<T> extends IDbDeleteOptions, IMongooseCrudOptions {
  where: FilterQuery<T>
}

export interface IMongooseDeleteByKeyOptions<keyType> extends IDbDeleteByKeyOptions<keyType>, IMongooseCrudOptions {

}
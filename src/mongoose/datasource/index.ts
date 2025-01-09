import mongoose from 'mongoose'
import {
  IDbClientDataSource,
  IDbRelationBelongsTo, IDbRelationHasMany, IDbRelationHasOne,
} from '../../dbClient'
import { IDbGetResult } from '../../dbClient/results'
import { IMongooseBulkCreateOptions, IMongooseCreateOptions, IMongooseDeleteByKeyOptions, IMongooseDeleteOptions, IMongooseGetOptions, IMongooseUpdateOptions } from '../crudOptions'
import { MongooseTransaction } from '../transaction'
import { mongooseExecBulkCreate } from './bulkCreate'
import { mongooseExecCreate } from './create'
import { mongooseExecDelete } from './delete'
import { mongooseExecRead } from './read'
import { mongooseExecUpdate } from './update'

export abstract class MongooseDataSource<T> implements IDbClientDataSource<
  T,
  any,
  IMongooseBulkCreateOptions<T>,
  IMongooseCreateOptions<T>,
  IMongooseGetOptions<T>,
  IMongooseUpdateOptions<T>,
  IMongooseDeleteOptions<T>,
  IMongooseDeleteByKeyOptions<any>
> {
  collectionModel: mongoose.Model<T, {}, {}, {}, any>
  transaction: MongooseTransaction | undefined

  constructor(options: {
    collectionModel: mongoose.Model<T, {}, {}, {}, any>,
    keyName: keyof T,
    transaction?: MongooseTransaction | undefined,
    hasMany?: IDbRelationHasMany<any, any>[] | undefined,
    hasOne?: IDbRelationHasOne<any, any>[] | undefined,
    belongsTo?: IDbRelationBelongsTo<any, any>[] | undefined,
  }) {
    this.collectionModel = options.collectionModel
    this.keyName = options.keyName
    this.transaction = options.transaction
    this.hasMany = options.hasMany
    this.hasOne = options.hasOne
    this.belongsTo = options.belongsTo
  }

  keyName: keyof T
  belongsTo?: IDbRelationBelongsTo<any, any>[] | undefined
  hasMany?: IDbRelationHasMany<any, any>[] | undefined
  hasOne?: IDbRelationHasOne<any, any>[] | undefined

  onBeforeBulkCreate(options: IMongooseBulkCreateOptions<T>): IMongooseBulkCreateOptions<T> | Promise<IMongooseBulkCreateOptions<T>> {
    return options

  }
  onAfterBulkCreate(_options: IMongooseBulkCreateOptions<T>, _createdList?: T[] | undefined): void | Promise<void> {

  }
  onBeforeCreate(options: IMongooseCreateOptions<T>): IMongooseCreateOptions<T> | Promise<IMongooseCreateOptions<T>> {
    return options
  }
  onAfterCreate(_options: IMongooseCreateOptions<T>, _created?: T | undefined): void | Promise<void> {

  }
  onBeforeRead(options?: IMongooseGetOptions<T> | undefined): IMongooseGetOptions<T> | Promise<IMongooseGetOptions<T> | undefined> | undefined {
    return options
  }
  onAfterRead(_options?: IMongooseGetOptions<T> | undefined, _result?: IDbGetResult<T[]> | undefined): void | Promise<void> {

  }
  onBeforeUpdate(options: IMongooseUpdateOptions<T>): IMongooseUpdateOptions<T> | Promise<IMongooseUpdateOptions<T>> {
    return options
  }
  onAfterUpdate(_options: IMongooseUpdateOptions<T>, _result?: { modifiedCount: number } | undefined): void | Promise<void> {

  }
  onBeforeDelete(options: IMongooseDeleteOptions<T> | IMongooseDeleteByKeyOptions<any>): IMongooseDeleteOptions<T> | IMongooseDeleteByKeyOptions<any> | Promise<IMongooseDeleteOptions<T> | IMongooseDeleteByKeyOptions<any>> {
    return options
  }
  onAfterDelete(_options: IMongooseDeleteOptions<T> | IMongooseDeleteByKeyOptions<any>, _result: number): void | Promise<void> {

  }

  bulkCreate(options: IMongooseBulkCreateOptions<T>): Promise<T[] | undefined> {
    return mongooseExecBulkCreate(options, {
      collectionModel: this.collectionModel,
      keyName: this.keyName,
      transaction: options.transaction ?? this.transaction,
      belongsTo: this.belongsTo,
      hasMany: this.hasMany,
      hasOne: this.hasOne,
      onBeforeBulkCreate: this.onBeforeBulkCreate,
      onAfterBulkCreate: this.onAfterBulkCreate,
    })
  }

  create(options: IMongooseCreateOptions<T>): Promise<T | undefined> {
    return mongooseExecCreate(options, {
      collectionModel: this.collectionModel,
      keyName: this.keyName,
      transaction: options.transaction ?? this.transaction,
      belongsTo: this.belongsTo,
      hasMany: this.hasMany,
      hasOne: this.hasOne,
      onBeforeCreate: this.onBeforeCreate,
      onAfterCreate: this.onAfterCreate,
    })
  }

  read(options?: IMongooseGetOptions<T> | undefined): Promise<IDbGetResult<T[]> | undefined> {
    return mongooseExecRead({
      options,
      optionsExt: {
        collectionModel: this.collectionModel,
        belongsTo: this.belongsTo,
        hasMany: this.hasMany,
        hasOne: this.hasOne,
        onBeforeRead: this.onBeforeRead,
        onAfterRead: this.onAfterRead,
      }
    })
  }

  update(options: IMongooseUpdateOptions<T>): Promise<T | undefined> {
    return mongooseExecUpdate(options, {
      collectionModel: this.collectionModel,
      keyName: this.keyName,
      transaction: options.transaction ?? this.transaction,
      belongsTo: this.belongsTo,
      hasMany: this.hasMany,
      hasOne: this.hasOne,
      onBeforeUpdate: this.onBeforeUpdate,
      onAfterUpdate: this.onAfterUpdate,
    })
  }

  delete(options: IMongooseDeleteOptions<T> | IMongooseDeleteByKeyOptions<any>): Promise<number> {
    return mongooseExecDelete(
      options, {
      collectionModel: this.collectionModel,
      keyName: this.keyName,
      transaction: options.transaction ?? this.transaction,
      belongsTo: this.belongsTo,
      hasMany: this.hasMany,
      hasOne: this.hasOne,
      onBeforeDelete: this.onBeforeDelete,
      onAfterDelete: this.onAfterDelete,
      onBeforeRead: this.onBeforeRead,
      onAfterRead: this.onAfterRead,
    })
  }

  isDate(value: any) {
    return new Date(value).getFullYear() ? true : false
  }
}
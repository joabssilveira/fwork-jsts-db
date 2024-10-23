import mongoose from 'mongoose'
import {
  IDbBulkCreateOptions, IDbClientDataSource, IDbCreateOptions, IDbDeleteByKeyOptions,
  IDbRelationBelongsTo, IDbRelationHasMany, IDbRelationHasOne, IDbUpdateOptions
} from '../../dbClient'
import { IDbGetResult } from '../../dbClient/results'
import { IMongooseDeleteOptions, IMongooseGetOptions } from '../crudOptions'
import { execBulkCreate } from './bulkCreate'
import { execCreate } from './create'
import { execDelete } from './delete'
import { execRead } from './read'
import { execUpdate } from './update'

export interface IMongooseDataSource<T> extends IDbClientDataSource<
  T,
  any,
  IDbBulkCreateOptions<T>,
  IDbCreateOptions<T>,
  IMongooseGetOptions<T>,
  IDbUpdateOptions<T>,
  IMongooseDeleteOptions<T>,
  IDbDeleteByKeyOptions<any>
> {
  bulkCreate(options?: IDbBulkCreateOptions<T>): Promise<T[] | undefined>
  create(options?: IDbCreateOptions<T>): Promise<T | undefined>
  read(options?: IMongooseGetOptions<T>): Promise<IDbGetResult<T[]> | undefined>
  update(options?: IDbUpdateOptions<T>): Promise<T | undefined>
  delete(options: IMongooseDeleteOptions<T> | IDbDeleteByKeyOptions<any>): Promise<number>
}

export abstract class MongooseDataSource<T> implements IMongooseDataSource<T> {
  // collectionModel: mongoose.Model<T, {}, {}, {}, any> | undefined
  collectionModel: mongoose.Model<T, {}, {}, {}, any>
  keyName: keyof T

  constructor(options: {
    // collectionModel: mongoose.Model<T, {}, {}, {}, any> | undefined,
    collectionModel: mongoose.Model<T, {}, {}, {}, any>,
    keyName: keyof T,
    hasMany?: IDbRelationHasMany<any, any>[] | undefined,
    hasOne?: IDbRelationHasOne<any, any>[] | undefined,
    belongsTo?: IDbRelationBelongsTo<any, any>[] | undefined,
  }) {
    this.collectionModel = options.collectionModel
    this.keyName = options.keyName
    this.hasMany = options.hasMany
    this.hasOne = options.hasOne
    this.belongsTo = options.belongsTo
  }

  belongsTo?: IDbRelationBelongsTo<any, any>[] | undefined

  hasMany?: IDbRelationHasMany<any, any>[] | undefined

  hasOne?: IDbRelationHasOne<any, any>[] | undefined

  onBeforeBulkCreate?: ((options: IDbBulkCreateOptions<T>) => IDbBulkCreateOptions<T> | Promise<IDbBulkCreateOptions<T>>) | undefined

  onAfterBulkCreate?: ((options: IDbBulkCreateOptions<T>, createdList?: T[] | undefined) => void | Promise<void>) | undefined

  onBeforeCreate?: ((options: IDbCreateOptions<T>) => IDbCreateOptions<T> | Promise<IDbCreateOptions<T>>) | undefined

  onAfterCreate?: ((options: IDbCreateOptions<T>, created?: T | undefined) => void | Promise<void>) | undefined

  onBeforeRead?: ((options?: IMongooseGetOptions<T> | undefined) => IMongooseGetOptions<T> | undefined | Promise<IMongooseGetOptions<T> | undefined>) | undefined

  onAfterRead?: ((options?: IMongooseGetOptions<T> | undefined, result?: IDbGetResult<T[]> | undefined) => void | Promise<void>) | undefined

  onBeforeUpdate?: ((options: IDbUpdateOptions<T>) => IDbUpdateOptions<T> | Promise<IDbUpdateOptions<T>>) | undefined

  onAfterUpdate?: ((options: IDbUpdateOptions<T>, result?: { modifiedCount: number } | undefined) => void | Promise<void>) | undefined

  onBeforeDelete?: ((options: IMongooseDeleteOptions<T> | IDbDeleteByKeyOptions<any>) => IMongooseDeleteOptions<T> | IDbDeleteByKeyOptions<any> | Promise<IMongooseDeleteOptions<T> | IDbDeleteByKeyOptions<any>>) | undefined

  onAfterDelete?: ((options: IMongooseDeleteOptions<T> | IDbDeleteByKeyOptions<any>, result: number) => void | Promise<void>) | undefined

  async bulkCreate(options: IDbBulkCreateOptions<T>): Promise<T[] | undefined> {
    return execBulkCreate(options, {
      collectionModel: this.collectionModel,
      keyName: this.keyName,
      belongsTo: this.belongsTo,
      hasMany: this.hasMany,
      hasOne: this.hasOne,
      onBeforeBulkCreate: this.onBeforeBulkCreate,
      onAfterBulkCreate: this.onAfterBulkCreate,
    })
  }

  async create(options: IDbCreateOptions<T>): Promise<T | undefined> {
    return execCreate(options, {
      collectionModel: this.collectionModel,
      keyName: this.keyName,
      belongsTo: this.belongsTo,
      hasMany: this.hasMany,
      hasOne: this.hasOne,
      onBeforeCreate: this.onBeforeCreate,
      onAfterCreate: this.onAfterCreate,
    })
  }

  async read(options?: IMongooseGetOptions<T> | undefined): Promise<IDbGetResult<T[]> | undefined> {
    return execRead({
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

  async update(options: IDbUpdateOptions<T>): Promise<T | undefined> {
    return execUpdate(
      options, {
      collectionModel: this.collectionModel,
      keyName: this.keyName,
      belongsTo: this.belongsTo,
      hasMany: this.hasMany,
      hasOne: this.hasOne,
      onBeforeUpdate: this.onBeforeUpdate,
      onAfterUpdate: this.onAfterUpdate,
    }
    )
  }

  async delete(options: IMongooseDeleteOptions<T> | IDbDeleteByKeyOptions<any>): Promise<number> {
    return execDelete(
      options, {
      collectionModel: this.collectionModel,
      keyName: this.keyName,
      belongsTo: this.belongsTo,
      hasMany: this.hasMany,
      hasOne: this.hasOne,
      onBeforeDelete: this.onBeforeDelete,
      onAfterDelete: this.onAfterDelete,
      onBeforeRead: this.onBeforeRead,
      onAfterRead: this.onAfterRead,
    }
    )
  }

  isDate(value: any) {
    return new Date(value).getFullYear() ? true : false
  }


}
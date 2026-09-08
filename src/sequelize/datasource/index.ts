import { ModelDefined } from 'sequelize'
import { IDbClientDataSource } from '../../dbClient/datasource'
import { IDbGetResult } from '../../dbClient/results'
import { ISequelizeBulkCreateOptions, ISequelizeCreateOptions, ISequelizeDeleteByKeyOptions, ISequelizeDeleteOptions, ISequelizeGetOptions, ISequelizeUpdateOptions } from '../crudOptions'
import { ISequelizeRelationBelongsTo, ISequelizeRelationHasMany, ISequelizeRelationHasOne } from '../relations'
import { SequelizeTransaction } from '../transaction'
import { sequelizeExecBulkCreate } from './bulkCreate'
import { sequelizeExecCreate } from './create'
import { sequelizeExecDelete } from './delete'
import { sequelizeExecRead } from './read'
import { sequelizeExecUpdate } from './update'
import { WithoutSequelizeTimestamps } from '../types'

export abstract class SequelizeDataSource<T extends {}> implements IDbClientDataSource<
  T,
  any,
  ISequelizeBulkCreateOptions<T>,
  ISequelizeCreateOptions<T>,
  ISequelizeGetOptions<T>,
  ISequelizeUpdateOptions<T>,
  ISequelizeDeleteOptions<T>,
  ISequelizeDeleteByKeyOptions<any>
> {

  collectionModel: ModelDefined<T, T | WithoutSequelizeTimestamps<T>>
  keyName: keyof T
  transaction: SequelizeTransaction | undefined

  constructor(options: {
    collectionModel: ModelDefined<T, T | WithoutSequelizeTimestamps<T>>,
    keyName: keyof T,
    transaction?: SequelizeTransaction | undefined,
    belongsTo?: ISequelizeRelationBelongsTo<any, any>[] | undefined
    hasMany?: ISequelizeRelationHasMany<any, any>[] | undefined
    hasOne?: ISequelizeRelationHasOne<any, any>[] | undefined
  }) {
    this.collectionModel = options.collectionModel
    this.keyName = options.keyName
    this.transaction = options.transaction
    this.hasMany = options.hasMany
    this.hasOne = options.hasOne
    this.belongsTo = options.belongsTo
  }

  belongsTo?: ISequelizeRelationBelongsTo<any, any>[] | undefined

  hasMany?: ISequelizeRelationHasMany<any, any>[] | undefined

  hasOne?: ISequelizeRelationHasOne<any, any>[] | undefined

  onBeforeBulkCreate(options: ISequelizeBulkCreateOptions<T>): ISequelizeBulkCreateOptions<T> | Promise<ISequelizeBulkCreateOptions<T>> {
    return options
  }
  onAfterBulkCreate(_options: ISequelizeBulkCreateOptions<T>, _createdList?: T[] | undefined): void | Promise<void> {

  }
  onBeforeCreate(options: ISequelizeCreateOptions<T>): ISequelizeCreateOptions<T> | Promise<ISequelizeCreateOptions<T>> {
    return options
  }
  onAfterCreate(_options: ISequelizeCreateOptions<T>, _created?: T | undefined): void | Promise<void> {

  }
  onBeforeRead(options?: ISequelizeGetOptions<T> | undefined): ISequelizeGetOptions<T> | Promise<ISequelizeGetOptions<T> | undefined> | undefined {
    return options
  }
  onAfterRead(_options?: ISequelizeGetOptions<T> | undefined, _result?: IDbGetResult<T[]> | undefined): void | Promise<void> {

  }
  onBeforeUpdate(options: ISequelizeUpdateOptions<T>): ISequelizeUpdateOptions<T> | Promise<ISequelizeUpdateOptions<T>> {
    return options
  }
  onAfterUpdate(_options: ISequelizeUpdateOptions<T>, _result?: { modifiedCount: number } | undefined): void | Promise<void> {

  }
  onBeforeDelete(options: ISequelizeDeleteOptions<T> | ISequelizeDeleteByKeyOptions<any>): ISequelizeDeleteOptions<T> | ISequelizeDeleteByKeyOptions<any> | Promise<ISequelizeDeleteOptions<T> | ISequelizeDeleteByKeyOptions<any>> {
    return options
  }
  onAfterDelete(_options: ISequelizeDeleteOptions<T> | ISequelizeDeleteByKeyOptions<any>, _result: number): void | Promise<void> {

  }

  overrideCreateMasterOptions(options: ISequelizeCreateOptions<any>) {
    return options
  }
  overrideCreateChildrenOptions(options: ISequelizeCreateOptions<any>) {
    return options
  }
  overrideCreateChildOptions(options: ISequelizeCreateOptions<any>) {
    return options
  }

  overrideBulkCreateMasterOptions(options: ISequelizeBulkCreateOptions<any>) {
    return options
  }
  overrideBulkCreateChildrenOptions(options: ISequelizeBulkCreateOptions<any>) {
    return options
  }
  overrideBulkCreateChildOptions(options: ISequelizeBulkCreateOptions<any>) {
    return options
  }

  async bulkCreate(options: ISequelizeBulkCreateOptions<T>): Promise<T[] | undefined> {
    return sequelizeExecBulkCreate(options, {
      collectionModel: this.collectionModel,
      keyName: this.keyName,
      transaction: options.transaction ?? this.transaction,
      belongsTo: this.belongsTo,
      hasMany: this.hasMany,
      hasOne: this.hasOne,
      onBeforeBulkCreate: this.onBeforeBulkCreate.bind(this),
      onAfterBulkCreate: this.onAfterBulkCreate.bind(this),

      overrideMasterOptions: this.overrideBulkCreateMasterOptions.bind(this),
      overrideChildrenOptions: this.overrideBulkCreateChildrenOptions.bind(this),
      overrideChildOptions: this.overrideBulkCreateChildOptions.bind(this),
    })
  }

  async create(options: ISequelizeCreateOptions<T>): Promise<T | undefined> {
    return sequelizeExecCreate(options, {
      collectionModel: this.collectionModel,
      keyName: this.keyName,
      transaction: options.transaction ?? this.transaction,
      belongsTo: this.belongsTo,
      hasMany: this.hasMany,
      hasOne: this.hasOne,

      // https://chatgpt.com/share/6a88a76c-a768-83e9-9eee-63d3cad22b3c
      // preciso colocar o .bind(this) pra manter o contexto correto
      // sem isso, o this é SequelizeDataSource e nao o seu descendente onde a funcao foi chamada
      // onBeforeCreate: this.onBeforeCreate.bind(this) nao como sujerido nao da certo: o segundo parametro created vem undefined justamente pq nao é passado
      onBeforeCreate: this.onBeforeCreate.bind(this),
      onAfterCreate: this.onAfterCreate.bind(this),

      overrideMasterOptions: this.overrideCreateMasterOptions.bind(this),
      overrideChildrenOptions: this.overrideCreateChildrenOptions.bind(this),
      overrideChildOptions: this.overrideCreateChildOptions.bind(this),
    })
  }

  async read(options?: ISequelizeGetOptions<T> | undefined): Promise<IDbGetResult<T[]> | undefined> {
    return sequelizeExecRead({
      options,
      optionsExt: {
        collectionModel: this.collectionModel,
        transaction: options?.transaction ?? this.transaction,
        belongsTo: this.belongsTo,
        hasMany: this.hasMany,
        hasOne: this.hasOne,
        onBeforeRead: this.onBeforeRead.bind(this),
        onAfterRead: this.onAfterRead.bind(this),
      }
    })
  }

  async update(options: ISequelizeUpdateOptions<T>): Promise<T | undefined> {
    return sequelizeExecUpdate(options, {
      collectionModel: this.collectionModel,
      keyName: this.keyName,
      transaction: options.transaction ?? this.transaction,
      belongsTo: this.belongsTo,
      hasMany: this.hasMany,
      hasOne: this.hasOne,
      onBeforeUpdate: this.onBeforeUpdate.bind(this),
      onAfterUpdate: this.onAfterUpdate.bind(this),
    })
  }

  async delete(options: ISequelizeDeleteOptions<T> | ISequelizeDeleteByKeyOptions<any>): Promise<number> {
    return sequelizeExecDelete(
      options, {
      collectionModel: this.collectionModel,
      keyName: this.keyName,
      transaction: options.transaction ?? this.transaction,
      belongsTo: this.belongsTo,
      hasMany: this.hasMany,
      hasOne: this.hasOne,
      onBeforeDelete: this.onBeforeDelete.bind(this),
      onAfterDelete: this.onAfterDelete.bind(this),
      onBeforeRead: this.onBeforeRead.bind(this),
      onAfterRead: this.onAfterRead.bind(this),
    })
  }
}
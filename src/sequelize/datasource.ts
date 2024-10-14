import { CommonUtils, StringUtils } from 'fwork-jsts-common'
import { FindAttributeOptions, Includeable, ModelDefined, WhereOptions } from 'sequelize/types'
import { MakeNullishOptional } from 'sequelize/types/utils'
import { DataSourceUtils } from '..'
import { ISequelizeBulkCreateOptions, ISequelizeCreateOptions, ISequelizeDeleteByKeyOptions, ISequelizeDeleteOptions, ISequelizeGetOptions, ISequelizeUpdateOptions } from './crudOptions'
import { ISequelizeRelationBelongsTo, ISequelizeRelationHasMany, ISequelizeRelationHasOne } from './relations'
import { SequelizeTransaction } from './transaction'
import { SequelizeUtils } from './utils'
import { IDbClientDataSource } from '../dbClient/datasource'
import { IDbGetResult } from '../dbClient/results'
import { uuidv7 } from 'uuidv7'

export interface ISequelizeDataSource<T> extends IDbClientDataSource<
  T,
  any,
  ISequelizeBulkCreateOptions<T>,
  ISequelizeCreateOptions<T>,
  ISequelizeGetOptions<T>,
  ISequelizeUpdateOptions<T>,
  ISequelizeDeleteOptions<T>,
  ISequelizeDeleteByKeyOptions<any>
> {
  transaction: SequelizeTransaction | undefined
  
  belongsTo?: ISequelizeRelationBelongsTo<any, any>[] | undefined
  hasMany?: ISequelizeRelationHasMany<any, any>[] | undefined
  hasOne?: ISequelizeRelationHasOne<any, any>[] | undefined

  bulkCreate(options: ISequelizeBulkCreateOptions<T>): Promise<T[] | undefined>
  create(options: ISequelizeCreateOptions<T>): Promise<T | undefined>
  read(options?: ISequelizeGetOptions<T>): Promise<IDbGetResult<T[]> | undefined>
  update(options: ISequelizeUpdateOptions<T>): Promise<T | undefined>
  delete(options: ISequelizeDeleteOptions<T>): Promise<number>
}

export abstract class SequelizeDataSource<T extends {}> implements ISequelizeDataSource<T> {

  collectionModel: ModelDefined<T, T> | undefined
  keyName: keyof T
  transaction: SequelizeTransaction | undefined
  
  constructor(options: {
    collectionModel: ModelDefined<T, T>,
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

  onBeforeBulkCreate?: ((options: ISequelizeBulkCreateOptions<T>) => ISequelizeBulkCreateOptions<T>) | undefined
  
  onAfterBulkCreate?: ((options: ISequelizeBulkCreateOptions<T>, createdList?: T[] | undefined) => void) | undefined
  
  onBeforeCreate?: ((options: ISequelizeCreateOptions<T>) => ISequelizeCreateOptions<T>) | undefined
  
  onAfterCreate?: ((options: ISequelizeCreateOptions<T>, created?: T | undefined) => void) | undefined
  
  onBeforeRead?: ((options?: ISequelizeGetOptions<T> | undefined) => ISequelizeGetOptions<T> | undefined) | undefined
  
  onAfterRead?: ((options?: ISequelizeGetOptions<T> | undefined, result?: IDbGetResult<T[]> | undefined) => void) | undefined
  
  onBeforeUpdate?: ((options: ISequelizeUpdateOptions<T>) => ISequelizeUpdateOptions<T>) | undefined
  
  onAfterUpdate?: ((options: ISequelizeUpdateOptions<T>, result?: { modifiedCount: number } | undefined) => void) | undefined
  
  onBeforeDelete?: ((options: ISequelizeDeleteOptions<T> | ISequelizeDeleteByKeyOptions<any>) => ISequelizeDeleteOptions<T> | ISequelizeDeleteByKeyOptions<any>) | undefined
  
  onAfterDelete?: ((options: ISequelizeDeleteOptions<T> | ISequelizeDeleteByKeyOptions<any>, result: number) => void) | undefined

  async bulkCreate(options: ISequelizeBulkCreateOptions<T>): Promise<T[] | undefined> {
    if (!options.data.length) return

    if (this.onBeforeBulkCreate)
      options = this.onBeforeBulkCreate(options)

    for (let d of options.data) 
      // if (this.keyName.toLowerCase() == 'uuid' && !(d as any)[this.keyName])
      //   (d as any)[this.keyName] = CommonUtils.getNewUuid()
      if (this.keyName.toString().toLowerCase() == 'uuid' && StringUtils.isEmpty((d as any)[this.keyName]))
        (d as any)[this.keyName] = uuidv7()
    
    // MASTER RELATIONS
    if (this.belongsTo?.length) {
      for (let relation of this.belongsTo.filter(b => b.createCascade)) {
        const masters = []

        for (let data of options.data) {
          let master = (data as any)[relation.as]
          if (master) {
            (data as any)[relation.foreignKey] = master[relation.masterKey]
            masters.push(master)
          }
        }

        relation.dataSourceBuilder().bulkCreate({
          ...options,
          data: masters
        })
      }
    }

    // TODO-specific sequelize
    const transaction = options.transaction || this.transaction
    const createdResponse = await this.collectionModel!.bulkCreate(options.data as unknown as MakeNullishOptional<T>[], { transaction: transaction?.transactionObj })
    const createdList = createdResponse.map(i => i.get({ plain: true }))

    // CHILDREN RELATIONS
    if (this.hasMany?.length) {
      for (let relation of this.hasMany) {
        const children = []

        for (let data of options.data) {
          let lChildren: any[] = (data as any)[relation.as]
          if (lChildren?.length) {
            lChildren.forEach(c => c[relation.foreignKey] = (data as any)[relation.masterKey])
            children.push(...lChildren)
          }
        }

        relation.dataSourceBuilder().bulkCreate({
          ...options,
          data: children
        })
      }
    }

    // CHILD RELATIONS
    if (this.hasOne?.length) {
      for (let relation of this.hasOne) {
        const children = []

        for (let data of options.data) {
          let child = (data as any)[relation.as]
          if (child) {
            child[relation.foreignKey] = (data as any)[relation.masterKey]
            children.push(child)
          }
        }

        relation.dataSourceBuilder().bulkCreate({
          ...options,
          data: children
        })
      }
    }

    if (this.onAfterBulkCreate)
      this.onAfterBulkCreate({ data: options.data }, createdList)

    return createdList
  }

  async create(options: ISequelizeCreateOptions<T>): Promise<T | undefined> {
    if (this.onBeforeCreate)
      options = this.onBeforeCreate(options)

    // MASTER RELATIONS
    if (this.belongsTo?.length)
      for (let relation of this.belongsTo.filter(b => b.createCascade)) {
        let master = (options.data as any)[relation.as]
        if (master) {
          (options.data as any)[relation.foreignKey] = master[relation.masterKey]
          relation.dataSourceBuilder().create({
            ...options,
            data: master
          })
        }
      }

    // if (this.keyName.toLowerCase() == 'uuid' && !(options.data as any)[this.keyName])
    if (this.keyName.toString().toLowerCase() == 'uuid' && StringUtils.isEmpty((options.data as any)[this.keyName]))
      (options.data as any)[this.keyName] = uuidv7()

    // TODO-specific sequelize
    const transaction = options.transaction || this.transaction
    const created: T = (await this.collectionModel!.create(options.data as unknown as MakeNullishOptional<T>, { transaction: transaction?.transactionObj })).dataValues

    // CHILDREN RELATIONS
    if (this.hasMany?.length)
      for (let relation of this.hasMany) {
        let children: any[] = (options.data as any)[relation.as]
        if (children?.length) {
          children.forEach(c => c[relation.foreignKey] = (options.data as any)[relation.masterKey])
          relation.dataSourceBuilder().bulkCreate({
            ...options,
            data: children
          })
        }
      }

    // CHILD RELATIONS
    if (this.hasOne?.length)
      for (let relation of this.hasOne) {
        let child = (options.data as any)[relation.as]
        if (child) {
          child[relation.foreignKey] = (options.data as any)[relation.masterKey]
          relation.dataSourceBuilder().create({
            ...options,
            data: child
          })
        }
      }

    if (this.onAfterCreate)
      this.onAfterCreate(options, created)

    return created
  }

  async read(options?: ISequelizeGetOptions<T> | undefined): Promise<IDbGetResult<T[]> | undefined> {
    if (this.onBeforeRead)
      options = this.onBeforeRead(options)

    let include: Includeable[] | undefined = this.getInclude({
      nested: options?.nested,
      dsCollection: this.collectionModel!.tableName,
      belongsTo: this.belongsTo,
      hasMany: this.hasMany,
      hasOne: this.hasOne
    })

    let attributes: FindAttributeOptions | undefined = SequelizeUtils.getAttributes({
      selectedFields: options?.select,
      excludedFields: options?.exclude,
    })

    const skip = (options?.skip || (((options?.limit || 0) * (options?.page || 1)) - (options?.limit || 0)))
    const page = (options?.page || ((skip / (options?.limit || 1)) + 1))

    const transaction = options?.transaction || this.transaction

    const readed = (await this.collectionModel!.findAll({
      where: options?.where,
      include,
      attributes,
      transaction: transaction?.transactionObj,
      offset: skip,
      limit: options?.limit
    })).map(i => i.get({ plain: true }))

    const readedCount = skip || options?.limit ? await this.collectionModel!.count({
      where: options?.where,
      transaction: transaction?.transactionObj,
    }) : readed.length

    const result: IDbGetResult<T[]> = {
      payload: readed,
      pagination: {
        skip: skip,
        limit: options?.limit || readed?.length,
        count: readedCount,
        pageCount: readedCount ? Math.ceil(readedCount / (options?.limit || readedCount)) : 1,
        currentPage: page,
      }
    }

    if (this.onAfterRead)
      this.onAfterRead(options, result)
    return result
  }

  async update(options: ISequelizeUpdateOptions<T>): Promise<T | undefined> {
    if (this.onBeforeUpdate)
      options = this.onBeforeUpdate(options)

    // MASTER RELATIONS
    if (this.belongsTo?.length)
      for (let relation of this.belongsTo.filter(b => b.updateCascade)) {
        let master = (options.data as any)[relation.as]
        if (master) {
          (options.data as any)[relation.foreignKey] = master[relation.masterKey]
          relation.dataSourceBuilder().update({
            ...options,
            data: master
          })
        }
      }

    const transaction = options?.transaction || this.transaction
    const update = await this.collectionModel!.update(options.data, {
      where: {
        [this.keyName]: (options.data as any)[this.keyName]
      } as any,
      transaction: transaction?.transactionObj
    })

    if (update[0]) {
      const readed = await this.read({
        where: {
          [this.keyName]: (options.data as any)[this.keyName]
        } as any,
      })

      if (readed?.payload?.length) {
        if (this.onAfterUpdate)
          this.onAfterUpdate(options, readed.payload[0] as any)

        return readed.payload[0]
      }
    }

    return undefined
  }

  async delete(options: ISequelizeDeleteOptions<T> | ISequelizeDeleteByKeyOptions<any>): Promise<number> {
    if (!(options as ISequelizeDeleteByKeyOptions<any>).key && !(options as ISequelizeDeleteOptions<T>).where)
      throw Error('Delete without parameters is not allowed')

    if (this.onBeforeDelete)
      options = this.onBeforeDelete(options)

    const childCascadeRelations = [
      ...(this.hasMany?.filter(r => r.deleteCascade) || []),
      ...(this.hasOne?.filter(r => r.deleteCascade) || [])
    ]
    if (childCascadeRelations.length) {
      const masterResponse = await this.read({
        where: (options as ISequelizeDeleteOptions<T>).where || {
          [this.keyName]: (options as ISequelizeDeleteByKeyOptions<any>).key
        }
      })

      for (let relation of childCascadeRelations) {
        const mastersIds = masterResponse?.payload?.map(m => (m as any)[relation.masterKey])

        relation.dataSourceBuilder().delete({
          where: {
            [relation.foreignKey]: mastersIds
          }
        })
      }
    }

    // TODO-specific sequelize
    const transaction = options?.transaction || this.transaction
    const result =
      await this.collectionModel!.destroy({
        where: (options as ISequelizeDeleteByKeyOptions<any>).key ? {
          [this.keyName]: (options as ISequelizeDeleteByKeyOptions<any>).key
        } as WhereOptions<T> : (options as ISequelizeDeleteOptions<T>).where,
        transaction: transaction?.transactionObj
      })

    if (this.onAfterDelete)
      this.onAfterDelete(options, result)
    return result
  }

  getInclude2(options: {
    nested?: string,
    dsCollection: string,
    relations: ISequelizeRelationBelongsTo<any, any>[] | ISequelizeRelationHasMany<any, any>[] | ISequelizeRelationHasOne<any, any>[],
    previousRelationAs?: string,
  }) {
    let result: Includeable[] | undefined

    for (const relation of options.relations) {
      if (relation.collection == options.dsCollection) continue

      const relationAs = (options.previousRelationAs ? options.previousRelationAs + '.' : '') + (relation.as as any)
      if (DataSourceUtils.nestedIn(relationAs, options?.nested)) {
        if (!result) result = []
        let includeRelation: Includeable = {
          model: relation.modelDefined,
          as: relation.as as any,
        }

        const relationDs = relation.dataSourceBuilder()

        if (relationDs.belongsTo?.length || relationDs.hasMany?.length || relationDs.hasOne?.length) {
          const includes = this.getInclude({
            nested: options.nested,
            dsCollection: (relationDs as any).collectionModel.tableName,
            belongsTo: relationDs.belongsTo,
            hasMany: relationDs.hasMany,
            hasOne: relationDs.hasOne,
            previousRelationAs: relationAs
          })
          if (includes?.length)
            for (let include of includes) {
              if (!includeRelation.include) includeRelation.include = []
              includeRelation.include.push(include)
            }
        }

        result.push(includeRelation)
      }
    }

    return result
  }

  getInclude(options: {
    nested?: string,
    dsCollection: string,
    belongsTo?: ISequelizeRelationBelongsTo<any, any>[] | undefined,
    hasMany?: ISequelizeRelationHasMany<any, any>[] | undefined,
    hasOne?: ISequelizeRelationHasOne<any, any>[] | undefined,
    previousRelationAs?: string
  }): (Includeable)[] | undefined {
    if (!options?.nested) return

    let result: Includeable[] | undefined

    if (options.belongsTo?.length) {
      const includes = this.getInclude2({
        nested: options.nested,
        dsCollection: options.dsCollection,
        relations: options.belongsTo,
        previousRelationAs: options.previousRelationAs
      })
      if (includes?.length) {
        if (!result) result = []
        result?.push(...includes)
      }
    }

    if (options.hasMany?.length) {
      const includes = this.getInclude2({
        nested: options.nested,
        dsCollection: options.dsCollection,
        relations: options.hasMany,
        previousRelationAs: options.previousRelationAs
      })
      if (includes?.length) {
        if (!result) result = []
        result?.push(...includes)
      }
    }

    if (options.hasOne?.length) {
      const includes = this.getInclude2({
        nested: options.nested,
        dsCollection: options.dsCollection,
        relations: options.hasOne,
        previousRelationAs: options.previousRelationAs
      })
      if (includes?.length) {
        if (!result) result = []
        result?.push(...includes)
      }
    }

    return result
  }
}
import { StringUtils } from 'fwork-jsts-common'
import mongoose, { FilterQuery } from 'mongoose'
import { uuidv7 } from "uuidv7"
import { DataSourceUtils } from '..'
import {
  IDbBulkCreateOptions, IDbClientDataSource, IDbCreateOptions, IDbDeleteByKeyOptions, IDbDeleteOptions,
  IDbRelationBelongsTo, IDbRelationHasMany, IDbRelationHasOne, IDbUpdateOptions
} from '../dbClient'
import { IDbGetResult } from '../dbClient/results'
import { IMongooseDeleteOptions, IMongooseGetOptions } from './crudOptions'
import { MongooseUtils } from './utils'

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

  onBeforeBulkCreate?: ((options: IDbBulkCreateOptions<T>) => IDbBulkCreateOptions<T>) | undefined

  onAfterBulkCreate?: ((options: IDbBulkCreateOptions<T>, createdList?: T[] | undefined) => void) | undefined

  onBeforeCreate?: ((options: IDbCreateOptions<T>) => IDbCreateOptions<T>) | undefined

  onAfterCreate?: ((options: IDbCreateOptions<T>, created?: T | undefined) => void) | undefined

  onBeforeRead?: ((options?: IMongooseGetOptions<T> | undefined) => IMongooseGetOptions<T> | undefined) | undefined

  onAfterRead?: ((options?: IMongooseGetOptions<T> | undefined, result?: IDbGetResult<T[]> | undefined) => void) | undefined

  onBeforeUpdate?: ((options: IDbUpdateOptions<T>) => IDbUpdateOptions<T>) | undefined

  onAfterUpdate?: ((options: IDbUpdateOptions<T>, result?: { modifiedCount: number } | undefined) => void) | undefined

  onBeforeDelete?: ((options: IMongooseDeleteOptions<T> | IDbDeleteByKeyOptions<any>) => IMongooseDeleteOptions<T> | IDbDeleteByKeyOptions<any>) | undefined

  onAfterDelete?: ((options: IMongooseDeleteOptions<T> | IDbDeleteByKeyOptions<any>, result: number) => void) | undefined

  async bulkCreate(options: IDbBulkCreateOptions<T>): Promise<T[] | undefined> {
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

    // TODO-specific mongoose
    const createdList = await this.collectionModel.insertMany(options.data)

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

  async create(options: IDbCreateOptions<T>): Promise<T | undefined> {
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

    // TODO-specific mongoose
    const mongoDoc = new this.collectionModel!(options.data)
    const dbResponse = await mongoDoc.save()
    const created = dbResponse.toObject({ getters: true })

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

  async read(options?: IMongooseGetOptions<T> | undefined): Promise<IDbGetResult<T[]> | undefined> {
    options = this.getOptionsRightTypeValues(options)

    if (this.onBeforeRead)
      options = this.onBeforeRead(options)

    const $addFields: mongoose.PipelineStage.AddFields | undefined = options?.addFields ? { $addFields: options?.addFields } : undefined

    const $match = { ...options?.where }

    const $project = MongooseUtils.getProjectToAggregate(options)

    let $unset = ['__v']
    // if (this.keyName != '_id')
    //   $unset.push('_id')
    if (options?.exclude) $unset = $unset.concat((options.exclude as string).split(','))

    let sort: mongoose.PipelineStage.Sort | undefined = options?.sort ? { $sort: options.sort } : undefined

    const aggregate: mongoose.PipelineStage[] = this.getLookupPipeLines({
      nested: options?.nested,
      dsCollection: this.collectionModel.collection.collectionName!,
      belongsTo: this.belongsTo,
      hasMany: this.hasMany,
      hasOne: this.hasOne,
    }) || []
    if ($addFields) aggregate.push($addFields)
    if ($match) aggregate.push({ $match })
    if ($project) aggregate.push({ $project })
    if ($unset) aggregate.push({ $unset })
    if (sort) aggregate.push(sort)

    const skip = (options?.skip || (((options?.limit || 0) * (options?.page || 1)) - (options?.limit || 0)))
    const page = (options?.page || ((skip / (options?.limit || 1)) + 1))

    if (skip) aggregate.push({ $skip: skip })
    if (options?.limit) aggregate.push({ $limit: options.limit })

    const readed = await this.collectionModel.aggregate(aggregate)
      .collation({ locale: 'pt', strength: 2 }) //strength 2 for case-insensitive

    const readedCount = skip || options?.limit ?
      await (await this.collectionModel.count($match)) : readed?.length

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

  async update(options: IDbUpdateOptions<T>): Promise<T | undefined> {
    if (this.onBeforeUpdate)
      options = this.onBeforeUpdate(options)

    if (this.keyName != '_id' && (options.data as any)._id)
      delete (options.data as any)._id

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

    const result = await this.collectionModel.updateOne({
      [this.keyName]: (options.data as any)[this.keyName]
    } as FilterQuery<T>, options.data as mongoose.UpdateQuery<T>, { new: true })

    if (result?.modifiedCount) {
      if (this.onAfterUpdate)
        this.onAfterUpdate(options, result)
      return options.data
    }

    return undefined
  }

  async delete(options: IMongooseDeleteOptions<T> | IDbDeleteByKeyOptions<any>): Promise<number> {
    if (!(options as IDbDeleteByKeyOptions<any>).key && !(options as IDbDeleteOptions).where)
      throw Error('Delete without parameters is not allowed')

    if (this.onBeforeDelete)
      options = this.onBeforeDelete(options)

    const childCascadeRelations = [
      ...(this.hasMany?.filter(r => r.deleteCascade) || []),
      ...(this.hasOne?.filter(r => r.deleteCascade) || [])
    ]
    if (childCascadeRelations.length) {
      const masterResponse = await this.read({
        where: (options as IDbDeleteOptions).where || {
          [this.keyName]: (options as IDbDeleteByKeyOptions<any>).key
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

    // TODO-specific mongoose
    const deleteResult = (options as any).key ?
      await this.collectionModel.deleteOne((options as IDbDeleteByKeyOptions<any>).key) :
      await this.collectionModel.deleteMany((options as IMongooseDeleteOptions<T>).where)
    const result = deleteResult?.deletedCount || 0

    if (this.onAfterDelete)
      this.onAfterDelete(options, result)
    return result
  }

  getLookupPipeLines(options: {
    nested?: string,
    dsCollection: string,
    belongsTo?: IDbRelationBelongsTo<any, any>[] | undefined,
    hasMany?: IDbRelationHasMany<any, any>[] | undefined,
    hasOne?: IDbRelationHasOne<any, any>[] | undefined,
    previousRelationAs?: string
  }): (mongoose.PipelineStage | mongoose.PipelineStage.Lookup | mongoose.PipelineStage.Unwind)[] | undefined {
    if (!options?.nested) return

    let result: mongoose.PipelineStage[] | undefined

    if (options.belongsTo?.length) {
      for (const relation of options.belongsTo) {
        if (relation.collection == options.dsCollection) continue

        const relationAs = (options.previousRelationAs ? options.previousRelationAs + '.' : '') + (relation.as as any)
        if (DataSourceUtils.nestedIn(relationAs, options?.nested)) {
          if (!result) result = []
          const { lookupMaster, unwindMaster } = MongooseUtils.getLookupMaster({
            masterKey: relation.masterKey as any,
            foreignKey: relation.foreignKey as any,
            fromMasterCollection: relation.collection,
            as: relation.as as any
          })

          const relationDs = relation.dataSourceBuilder()

          if (relationDs.belongsTo?.length || relationDs.hasMany?.length || relationDs.hasOne?.length) {
            const pipeLines = this.getLookupPipeLines({
              nested: options.nested,
              dsCollection: (relationDs as any).collectionModel.collection.collectionName,
              belongsTo: relationDs.belongsTo,
              hasMany: relationDs.hasMany,
              hasOne: relationDs.hasOne,
              previousRelationAs: relationAs
            })
            if (pipeLines?.length)
              for (let pipeLine of pipeLines) {
                const lookup = (pipeLine as any).$lookup
                if (lookup)
                  lookupMaster.$lookup.pipeline?.push(pipeLine as any)
                const unwind = (pipeLine as any).$unwind
                if (unwind)
                  lookupMaster.$lookup.pipeline?.push(pipeLine as any)
              }
          }

          result.push(lookupMaster, unwindMaster)
        }
      }
    }

    if (options.hasMany?.length) {
      for (const relation of options.hasMany) {
        // if (relation.collection == this.collectionModel.collection.collectionName) continue
        if (relation.collection == options.dsCollection) continue

        const relationAs = (options.previousRelationAs ? options.previousRelationAs + '.' : '') + (relation.as as any)
        if (DataSourceUtils.nestedIn(relationAs, options?.nested)) {
          if (!result) result = []
          const { lookupChildren } = MongooseUtils.getLookupChildren({
            masterKey: relation.masterKey as any,
            foreignKey: relation.foreignKey as any,
            fromChildrenCollection: relation.collection,
            as: relation.as as any
          })

          const relationDs = relation.dataSourceBuilder()

          if (relationDs.belongsTo?.length || relationDs.hasMany?.length || relationDs.hasOne?.length) {
            const pipeLines = this.getLookupPipeLines({
              nested: options.nested,
              dsCollection: (relationDs as any).collectionModel.collection.collectionName,
              belongsTo: relationDs.belongsTo,
              hasMany: relationDs.hasMany,
              hasOne: relationDs.hasOne,
              previousRelationAs: relationAs
            })
            if (pipeLines?.length)
              for (let pipeLine of pipeLines) {
                const lookup = (pipeLine as any).$lookup
                if (lookup)
                  lookupChildren.$lookup.pipeline?.push(pipeLine as any)
                const unwind = (pipeLine as any).$unwind
                if (unwind)
                  lookupChildren.$lookup.pipeline?.push(pipeLine as any)
              }
          }

          result.push(lookupChildren)
        }
      }
    }

    if (options.hasOne?.length) {
      for (const relation of options.hasOne) {
        if (relation.collection == options.dsCollection) continue

        const relationAs = (options.previousRelationAs ? options.previousRelationAs + '.' : '') + (relation.as as any)
        if (DataSourceUtils.nestedIn(relationAs, options?.nested)) {
          if (!result) result = []
          const { lookupChild, unwindChild } = MongooseUtils.getLookupChild({
            masterKey: relation.masterKey as any,
            foreignKey: relation.foreignKey as any,
            fromChildrenCollection: relation.collection,
            as: relation.as as any
          })

          const relationDs = relation.dataSourceBuilder()

          if (relationDs.belongsTo?.length || relationDs.hasMany?.length || relationDs.hasOne?.length) {
            const pipeLines = this.getLookupPipeLines({
              nested: options.nested,
              dsCollection: (relationDs as any).collectionModel.collection.collectionName,
              belongsTo: relationDs.belongsTo,
              hasMany: relationDs.hasMany,
              hasOne: relationDs.hasOne,
              previousRelationAs: relationAs
            })
            if (pipeLines?.length)
              for (let pipeLine of pipeLines) {
                const lookup = (pipeLine as any).$lookup
                if (lookup)
                  lookupChild.$lookup.pipeline?.push(pipeLine as any)
                const unwind = (pipeLine as any).$unwind
                if (unwind)
                  lookupChild.$lookup.pipeline?.push(pipeLine as any)
              }
          }

          result.push(lookupChild, unwindChild)
        }
      }
    }

    return result
  }

  isDate(value: any) {
    return new Date(value).getFullYear() ? true : false
  }

  getOptionsRightTypeValues(options: any, treeProp?: string) {
    if (options) {
      for (const propName in options) {
        if (typeof options[propName] === 'string') {
          if (propName.indexOf('_id') != -1 || (treeProp || '').indexOf('_id') != -1) {
            options[propName] = new mongoose.Types.ObjectId(options[propName])
          }
        }
        else if (Array.isArray(options[propName])) {
          for (const options_propArray_idx in options[propName]) {
            if (propName.indexOf('_id') != -1 || (treeProp || '').indexOf('_id') != -1) {
              if (typeof options[propName][options_propArray_idx] === 'string') {
                options[propName][options_propArray_idx] = new mongoose.Types.ObjectId(options[propName][options_propArray_idx])
              }
            }
            else if (options[propName][options_propArray_idx]?.type?.toLowerCase() == 'date') {
              options[propName][options_propArray_idx] = new Date(options[propName][options_propArray_idx].value)
            }
            else if (options[propName][options_propArray_idx]?.type?.toLowerCase() == 'objectid') {
              options[propName][options_propArray_idx] = new mongoose.Types.ObjectId(options[propName][options_propArray_idx].value)
            }
            else
              options[propName][options_propArray_idx] = this.getOptionsRightTypeValues(options[propName][options_propArray_idx], treeProp ? treeProp + propName : propName)
          }
        }
        else if (typeof options[propName] === 'object') {
          if (options[propName]?.type?.toLowerCase() == 'date') {
            options[propName] = new Date(options[propName].value)
          }
          else if (options[propName]?.type?.toLowerCase() == 'objectid') {
            options[propName] = new mongoose.Types.ObjectId(options[propName].value)
          }
          else
            options[propName] = this.getOptionsRightTypeValues(options[propName], treeProp ? treeProp + propName : propName)
        }

      }
    }
    return options
  }
}
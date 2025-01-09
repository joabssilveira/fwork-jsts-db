import mongoose from 'mongoose'
import { DataSourceUtils } from '..'
import { IDbRelationBelongsTo, IDbRelationHasMany, IDbRelationHasOne } from '../dbClient'
import { IMongooseGetOptions } from './crudOptions'

export class MongooseUtils {
  static getProjectToAggregate = <T>(options?: IMongooseGetOptions<T>) => {
    let $project: any = null
    if (options?.select) {
      const select = (options.select as String).split(',')
      $project = {}
      select?.forEach(s => {
        $project[s] = `$${s}`
      })
    }

    return $project
  }

  // static getObjectId(objectId: any): mongoose.Types.ObjectId | undefined {
  //   if (typeof objectId === 'string' && mongoose.isValidObjectId(objectId))
  //     return new mongoose.Types.ObjectId(objectId)
  //   else if (mongoose.isValidObjectId(objectId))
  //     return objectId
  //   else
  //     return new mongoose.Types.ObjectId()
  // }

  static getLookupMaster = (options: {
    masterKey: string,
    foreignKey: string,
    fromMasterCollection: string,
    as: string
  }) => {
    const lookupMaster: mongoose.PipelineStage.Lookup = {
      $lookup: {
        let: { 'masterUuid': `$${options.foreignKey}` },
        from: options.fromMasterCollection,
        as: options.as,
        pipeline: [
          { $match: { $expr: { $eq: [`$${options.masterKey}`, '$$masterUuid'] } } }
        ]
      }
    };

    const unwindMaster: mongoose.PipelineStage.Unwind = {
      $unwind: {
        path: `$${options.as}`,
        preserveNullAndEmptyArrays: true
      }
    };

    return {
      lookupMaster,
      unwindMaster
    }
  }

  static getLookupChildren = (options: {
    masterKey: string,
    foreignKey: string,
    fromChildrenCollection: string,
    as: string
  }) => {
    const lookupChildren: mongoose.PipelineStage.Lookup = {
      $lookup: {
        // MASTER ID
        let: { "masterUuid": `$${options.masterKey}` },
        // CHILD COLLECTION
        from: options.fromChildrenCollection,
        // CHILD PROPERTY NAME IN MASTER
        as: options.as,
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [
                  /*FOREIGN KEY IN CHILD COLLECTION*/
                  `$${options.foreignKey}`,
                  "$$masterUuid",
                ]
              }
            }
          },
        ]
      }
    }

    return {
      lookupChildren
    }
  }

  static getLookupChild = (options: {
    masterKey: string,
    foreignKey: string,
    fromChildrenCollection: string,
    as: string
  }) => {
    const lookupChild: mongoose.PipelineStage.Lookup = MongooseUtils.getLookupChildren(options).lookupChildren;

    const unwindChild: mongoose.PipelineStage.Unwind = {
      $unwind: {
        path: `$${options.as}`,
        preserveNullAndEmptyArrays: true
      }
    }

    return {
      lookupChild,
      unwindChild
    }
  }

  static getLookupPipeLines(options: {
    nested?: string,
    dsCollection: string,
    belongsTo?: IDbRelationBelongsTo<any, any>[] | undefined,
    hasMany?: IDbRelationHasMany<any, any>[] | undefined,
    hasOne?: IDbRelationHasOne<any, any>[] | undefined,
    previousRelationAs?: string
  }): (mongoose.PipelineStage | mongoose.PipelineStage.Lookup | mongoose.PipelineStage.Unwind)[] | undefined {
    if (!options?.nested) return undefined

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
            const pipeLines = MongooseUtils.getLookupPipeLines({
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
            const pipeLines = MongooseUtils.getLookupPipeLines({
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
            const pipeLines = MongooseUtils.getLookupPipeLines({
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

  static getOptionsRightTypeValues(options: any, treeProp?: string) {
    if (options) {
      for (const propName in options) {
        if (typeof options[propName] === 'string') {
          if (propName.indexOf('_id') != -1 || (treeProp || '').indexOf('_id') != -1) {
            options[propName] = new mongoose.Types.ObjectId(options[propName]);
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
              options[propName][options_propArray_idx] = MongooseUtils.getOptionsRightTypeValues(options[propName][options_propArray_idx], treeProp ? treeProp + propName : propName)
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
            options[propName] = MongooseUtils.getOptionsRightTypeValues(options[propName], treeProp ? treeProp + propName : propName)
        }

      }
    }
    return options
  }
}
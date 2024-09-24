import mongoose from 'mongoose'
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

  static getObjectId(objectId: any): mongoose.Types.ObjectId | undefined {
    if (typeof objectId === 'string' && mongoose.isValidObjectId(objectId))
      return new mongoose.Types.ObjectId(objectId)
    else if (mongoose.isValidObjectId(objectId))
      return objectId
    else
      return new mongoose.Types.ObjectId()
  }

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
    }

    const unwindMaster: mongoose.PipelineStage.Unwind = {
      $unwind: {
        path: `$${options.as}`,
        preserveNullAndEmptyArrays: true
      }
    }

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
    const lookupChild: mongoose.PipelineStage.Lookup = this.getLookupChildren(options).lookupChildren

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
}
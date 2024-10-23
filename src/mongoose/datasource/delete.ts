import mongoose from 'mongoose'
import {
  IDbDeleteByKeyOptions, IDbDeleteOptions,
  IDbGetResult,
  IDbRelationBelongsTo, IDbRelationHasMany, IDbRelationHasOne
} from '../../dbClient'
import { IMongooseDeleteOptions, IMongooseGetOptions } from '../crudOptions'
import { execRead } from './read'

export const execDelete = async <T>(options: IMongooseDeleteOptions<T> | IDbDeleteByKeyOptions<any>, optionsExt: {
  collectionModel: mongoose.Model<T, {}, {}, {}, any>,
  keyName: keyof T,
  belongsTo?: IDbRelationBelongsTo<any, any>[] | undefined,
  hasMany?: IDbRelationHasMany<any, any>[] | undefined,
  hasOne?: IDbRelationHasOne<any, any>[] | undefined,
  onBeforeDelete?: ((options: IMongooseDeleteOptions<T> | IDbDeleteByKeyOptions<any>) => IMongooseDeleteOptions<T> | IDbDeleteByKeyOptions<any> | Promise<IMongooseDeleteOptions<T> | IDbDeleteByKeyOptions<any>>) | undefined,
  onAfterDelete?: ((options: IMongooseDeleteOptions<T> | IDbDeleteByKeyOptions<any>, result: number) => void | Promise<void>) | undefined,
  onBeforeRead?: ((options?: IMongooseGetOptions<T> | undefined) => IMongooseGetOptions<T> | undefined | Promise<IMongooseGetOptions<T> | undefined>) | undefined,
  onAfterRead?: ((options?: IMongooseGetOptions<T> | undefined, result?: IDbGetResult<T[]> | undefined) => void | Promise<void>) | undefined
}): Promise<number> => {
  if (!(options as IDbDeleteByKeyOptions<any>).key && !(options as IDbDeleteOptions).where)
    throw Error('Delete without parameters is not allowed')

  if (optionsExt.onBeforeDelete)
    options = await optionsExt.onBeforeDelete(options)

  const childCascadeRelations = [
    ...(optionsExt.hasMany?.filter(r => r.deleteCascade) || []),
    ...(optionsExt.hasOne?.filter(r => r.deleteCascade) || [])
  ]
  if (childCascadeRelations.length) {
    const masterResponse = await execRead({
      options: {
        where: (options as IDbDeleteOptions).where || {
          [optionsExt.keyName]: (options as IDbDeleteByKeyOptions<any>).key
        }
      },
      optionsExt: {
        collectionModel: optionsExt.collectionModel,
        belongsTo: optionsExt.belongsTo,
        hasMany: optionsExt.hasMany,
        hasOne: optionsExt.hasOne,
        onBeforeRead: optionsExt.onBeforeRead,
        onAfterRead: optionsExt.onAfterRead,
      }
    })

    for (let relation of childCascadeRelations) {
      const mastersIds = masterResponse?.payload?.map(m => (m as any)[relation.masterKey])

      await relation.dataSourceBuilder().delete({
        where: {
          [relation.foreignKey]: mastersIds
        }
      })
    }
  }

  // TODO-specific mongoose
  const deleteResult = (options as any).key ?
    await optionsExt.collectionModel.deleteOne((options as IDbDeleteByKeyOptions<any>).key) :
    await optionsExt.collectionModel.deleteMany((options as IMongooseDeleteOptions<T>).where)
  const result = deleteResult?.deletedCount || 0

  if (optionsExt.onAfterDelete)
    await optionsExt.onAfterDelete(options, result)
  return result
}
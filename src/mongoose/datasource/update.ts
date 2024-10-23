import mongoose, { FilterQuery } from 'mongoose'
import {
  IDbRelationBelongsTo, IDbRelationHasMany, IDbRelationHasOne, IDbUpdateOptions
} from '../../dbClient'

export const execUpdate = async <T>(options: IDbUpdateOptions<T>, optionsExt: {
  collectionModel: mongoose.Model<T, {}, {}, {}, any>,
  keyName: keyof T,
  belongsTo?: IDbRelationBelongsTo<any, any>[] | undefined,
  hasMany?: IDbRelationHasMany<any, any>[] | undefined,
  hasOne?: IDbRelationHasOne<any, any>[] | undefined,
  onBeforeUpdate?: ((options: IDbUpdateOptions<T>) => IDbUpdateOptions<T> | Promise<IDbUpdateOptions<T>>) | undefined
  onAfterUpdate?: ((options: IDbUpdateOptions<T>, result?: { modifiedCount: number } | undefined) => void | Promise<void>) | undefined
}): Promise<T | undefined> => {
  if (optionsExt.onBeforeUpdate)
    options = await optionsExt.onBeforeUpdate(options)

  let data = {
    ...options.data
  }

  if (optionsExt.keyName != '_id' && (options.data as any)._id)
    delete (data as any)._id

  // MASTER RELATIONS
  if (optionsExt.belongsTo?.length)
    for (let relation of optionsExt.belongsTo.filter(b => b.updateCascade)) {
      let master = (options.data as any)[relation.as]
      if (master) {
        (options.data as any)[relation.foreignKey] = master[relation.masterKey]
        await relation.dataSourceBuilder().update({
          ...options,
          data: master
        })
      }
    }

  const result = await optionsExt.collectionModel.updateOne({
    [optionsExt.keyName]: (options.data as any)[optionsExt.keyName]
  } as FilterQuery<T>, data as mongoose.UpdateQuery<T>, { new: true })

  if (result?.modifiedCount) {
    if (optionsExt.onAfterUpdate)
      await optionsExt.onAfterUpdate(options, result)
    return options.data
  }

  return undefined
}
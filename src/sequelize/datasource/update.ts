import { ModelDefined } from 'sequelize/types'
import { ISequelizeGetOptions, ISequelizeUpdateOptions } from '../crudOptions'
import { ISequelizeRelationBelongsTo, ISequelizeRelationHasMany, ISequelizeRelationHasOne } from '../relations'
import { SequelizeTransaction } from '../transaction'
import { sequelizeExecRead } from './read'
import { IDbGetResult } from '../../dbClient'

export const sequelizeExecUpdate = async <T extends {}>(options: ISequelizeUpdateOptions<T>, optionsExt: {
  collectionModel: ModelDefined<T, T>,
  keyName: keyof T,
  transaction?: SequelizeTransaction | undefined,
  belongsTo?: ISequelizeRelationBelongsTo<any, any>[] | undefined
  hasMany?: ISequelizeRelationHasMany<any, any>[] | undefined
  hasOne?: ISequelizeRelationHasOne<any, any>[] | undefined
  onBeforeUpdate?: ((options: ISequelizeUpdateOptions<T>) => ISequelizeUpdateOptions<T> | Promise<ISequelizeUpdateOptions<T>>) | undefined
  onAfterUpdate?: ((options: ISequelizeUpdateOptions<T>, result?: { modifiedCount: number } | undefined) => void | Promise<void>) | undefined
  onBeforeRead?: ((options?: ISequelizeGetOptions<T> | undefined) => ISequelizeGetOptions<T> | undefined | Promise<ISequelizeGetOptions<T> | undefined>) | undefined
  onAfterRead?: ((options?: ISequelizeGetOptions<T> | undefined, result?: IDbGetResult<T[]> | undefined) => void | Promise<void>) | undefined
}): Promise<T | undefined> => {
  if (optionsExt.onBeforeUpdate)
    options = await optionsExt.onBeforeUpdate(options)

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

  const transaction = options?.transaction ?? optionsExt.transaction
  const update = await optionsExt.collectionModel!.update(options.data, {
    where: {
      [optionsExt.keyName]: (options.data as any)[optionsExt.keyName]
    } as any,
    transaction: transaction?.transactionObj
  })

  if (update[0]) {
    const readed = await sequelizeExecRead({
      options: {
        where: {
          [optionsExt.keyName]: (options.data as any)[optionsExt.keyName]
        } as any,
      },
      optionsExt: {
        collectionModel: optionsExt.collectionModel,
        transaction,
        belongsTo: optionsExt.belongsTo,
        hasMany: optionsExt.hasMany,
        hasOne: optionsExt.hasOne,
        onBeforeRead: optionsExt.onBeforeRead,
        onAfterRead: optionsExt.onAfterRead,
      }
    })

    if (readed?.payload?.length) {
      if (optionsExt.onAfterUpdate)
        await optionsExt.onAfterUpdate(options, readed.payload[0] as any)

      return readed.payload[0]
    }
  }

  return undefined
}
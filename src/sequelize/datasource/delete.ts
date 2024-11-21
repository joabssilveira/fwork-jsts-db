import { ModelDefined, WhereOptions } from 'sequelize/types'
import { ISequelizeDeleteByKeyOptions, ISequelizeDeleteOptions, ISequelizeGetOptions } from '../crudOptions'
import { ISequelizeRelationBelongsTo, ISequelizeRelationHasMany, ISequelizeRelationHasOne } from '../relations'
import { SequelizeTransaction } from '../transaction'
import { sequelizeExecRead } from './read'
import { IDbGetResult } from '../../dbClient'

export const sequelizeExecDelete = async <T extends {}>(options: ISequelizeDeleteOptions<T> | ISequelizeDeleteByKeyOptions<any>, optionsExt: {
  collectionModel: ModelDefined<T, T>,
  keyName: keyof T,
  transaction?: SequelizeTransaction | undefined,
  belongsTo?: ISequelizeRelationBelongsTo<any, any>[] | undefined
  hasMany?: ISequelizeRelationHasMany<any, any>[] | undefined
  hasOne?: ISequelizeRelationHasOne<any, any>[] | undefined
  onBeforeDelete?: ((options: ISequelizeDeleteOptions<T> | ISequelizeDeleteByKeyOptions<any>) => ISequelizeDeleteOptions<T> | ISequelizeDeleteByKeyOptions<any> | Promise<ISequelizeDeleteOptions<T> | ISequelizeDeleteByKeyOptions<any>>) | undefined
  onAfterDelete?: ((options: ISequelizeDeleteOptions<T> | ISequelizeDeleteByKeyOptions<any>, result: number) => void | Promise<void>) | undefined
  onBeforeRead?: ((options?: ISequelizeGetOptions<T> | undefined) => ISequelizeGetOptions<T> | undefined | Promise<ISequelizeGetOptions<T> | undefined>) | undefined
  onAfterRead?: ((options?: ISequelizeGetOptions<T> | undefined, result?: IDbGetResult<T[]> | undefined) => void | Promise<void>) | undefined
}): Promise<number> => {
  if (!(options as ISequelizeDeleteByKeyOptions<any>).key && !(options as ISequelizeDeleteOptions<T>).where)
    throw Error('Delete without parameters is not allowed')

  if (optionsExt.onBeforeDelete)
    options = await optionsExt.onBeforeDelete(options)

  const childCascadeRelations = [
    ...(optionsExt.hasMany?.filter(r => r.deleteCascade) || []),
    ...(optionsExt.hasOne?.filter(r => r.deleteCascade) || [])
  ]
  if (childCascadeRelations.length) {
    const masterResponse = await sequelizeExecRead({
      options: {
        where: (options as ISequelizeDeleteOptions<T>).where || {
          [optionsExt.keyName]: (options as ISequelizeDeleteByKeyOptions<any>).key
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

  // TODO-specific sequelize
  const transaction = options?.transaction || optionsExt.transaction
  const result =
    await optionsExt.collectionModel!.destroy({
      where: (options as ISequelizeDeleteByKeyOptions<any>).key ? {
        [optionsExt.keyName]: (options as ISequelizeDeleteByKeyOptions<any>).key
      } as WhereOptions<T> : (options as ISequelizeDeleteOptions<T>).where,
      transaction: transaction?.transactionObj
    })

  if (optionsExt.onAfterDelete)
    await optionsExt.onAfterDelete(options, result)
  return result
}
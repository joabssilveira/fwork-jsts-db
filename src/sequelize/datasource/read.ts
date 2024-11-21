import { FindAttributeOptions, Includeable, ModelDefined } from 'sequelize/types'
import { IDbGetResult } from '../../dbClient/results'
import { ISequelizeGetOptions } from '../crudOptions'
import { ISequelizeRelationBelongsTo, ISequelizeRelationHasMany, ISequelizeRelationHasOne } from '../relations'
import { SequelizeTransaction } from '../transaction'
import { SequelizeIncludeResult, SequelizeUtils } from '../utils'

export const sequelizeExecRead = async <T extends {}>(args: {
  options?: ISequelizeGetOptions<T> | undefined,
  optionsExt: {
    collectionModel: ModelDefined<T, T>,
    transaction?: SequelizeTransaction | undefined,
    belongsTo?: ISequelizeRelationBelongsTo<any, any>[] | undefined
    hasMany?: ISequelizeRelationHasMany<any, any>[] | undefined
    hasOne?: ISequelizeRelationHasOne<any, any>[] | undefined
    onBeforeRead?: ((options?: ISequelizeGetOptions<T> | undefined) => ISequelizeGetOptions<T> | undefined | Promise<ISequelizeGetOptions<T> | undefined>) | undefined
    onAfterRead?: ((options?: ISequelizeGetOptions<T> | undefined, result?: IDbGetResult<T[]> | undefined) => void | Promise<void>) | undefined
  }
}): Promise<IDbGetResult<T[]> | undefined> => {
  let { options, optionsExt } = args
  
  if (optionsExt.onBeforeRead)
    options = await optionsExt.onBeforeRead(options)

  let getIncludeResult: SequelizeIncludeResult | undefined = SequelizeUtils.getInclude({
    nested: options?.nested,
    dsCollection: optionsExt.collectionModel!.tableName,
    belongsTo: optionsExt.belongsTo,
    hasMany: optionsExt.hasMany,
    hasOne: optionsExt.hasOne,
    where: options?.where
  })

  if (options?.where) {
    options.where = getIncludeResult?.updatedWhere
    options.where = SequelizeUtils.addDollarToNestedFields(options.where!)
  }

  let attributes: FindAttributeOptions | undefined = SequelizeUtils.getAttributes({
    selectedFields: options?.select,
    excludedFields: options?.exclude,
  })

  const skip = (options?.skip || (((options?.limit || 0) * (options?.page || 1)) - (options?.limit || 0)))
  const page = (options?.page || ((skip / (options?.limit || 1)) + 1))

  const transaction = options?.transaction || optionsExt.transaction

  if (options?.where)
    options.where = SequelizeUtils.addDollarToNestedFields(options?.where)
  const readed = (await optionsExt.collectionModel!.findAll({
    where: options?.where,
    include: getIncludeResult?.includes,
    attributes,
    transaction: transaction?.transactionObj,
    offset: skip,
    limit: options?.limit
  })).map(i => i.get({ plain: true }))

  const readedCount = skip || options?.limit ? await optionsExt.collectionModel!.count({
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

  if (optionsExt.onAfterRead)
    await optionsExt.onAfterRead(options, result)
  return result
}
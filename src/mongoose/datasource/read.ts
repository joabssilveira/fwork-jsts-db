import mongoose from 'mongoose'
import { IDbRelationBelongsTo, IDbRelationHasMany, IDbRelationHasOne } from '../../dbClient'
import { IDbGetResult } from '../../dbClient/results'
import { IMongooseGetOptions } from '../crudOptions'
import { MongooseTransaction } from '../transaction'
import { MongooseUtils } from '../utils'

export const mongooseExecRead = async <T>(args: {
  options?: IMongooseGetOptions<T> | undefined,
  optionsExt: {
    collectionModel: mongoose.Model<T, {}, {}, {}, any>,
    transaction?: MongooseTransaction | undefined,
    belongsTo?: IDbRelationBelongsTo<any, any>[] | undefined,
    hasMany?: IDbRelationHasMany<any, any>[] | undefined,
    hasOne?: IDbRelationHasOne<any, any>[] | undefined,
    onBeforeRead?: ((options?: IMongooseGetOptions<T> | undefined) => IMongooseGetOptions<T> | undefined | Promise<IMongooseGetOptions<T> | undefined>) | undefined,
    onAfterRead?: ((options?: IMongooseGetOptions<T> | undefined, result?: IDbGetResult<T[]> | undefined) => void | Promise<void>) | undefined
  }
}): Promise<IDbGetResult<T[]> | undefined> => {
  let { options, optionsExt } = args

  options = MongooseUtils.getOptionsRightTypeValues(options)

  if (optionsExt.onBeforeRead)
    options = await optionsExt.onBeforeRead(options)

  const $addFields: mongoose.PipelineStage.AddFields | undefined = options?.addFields ? { $addFields: options?.addFields } : undefined

  const $match = { ...options?.where }

  const $project = MongooseUtils.getProjectToAggregate(options)

  let $unset = ['__v']
  if (options?.exclude) $unset = $unset.concat((options.exclude as string).split(','))

  let sort: mongoose.PipelineStage.Sort | undefined = options?.sort ? { $sort: options.sort } : undefined

  const aggregate: mongoose.PipelineStage[] = MongooseUtils.getLookupPipeLines({
    nested: options?.nested,
    dsCollection: optionsExt.collectionModel.collection.collectionName!,
    belongsTo: optionsExt.belongsTo,
    hasMany: optionsExt.hasMany,
    hasOne: optionsExt.hasOne,
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

  const session = args.options?.transaction?.session ?? args.optionsExt.transaction?.session
  // const readed = await optionsExt.collectionModel.aggregate(aggregate, { session, allowDiskUse: true }) // o allowDiskUse pode melhorar a performance no aggregate mas nos testes nao foi significante
  const readed = await optionsExt.collectionModel.aggregate(aggregate, { session })
    // .collation({ locale: 'pt', strength: 2 }) //strength 2 for case-insensitive (low performance on complex aggregate) nos testes o case-insensitive funcionou sem isso

  const readedCount = skip || options?.limit ?
    await (await optionsExt.collectionModel.count($match)) : readed?.length

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
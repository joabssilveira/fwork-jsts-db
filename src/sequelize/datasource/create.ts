import { StringUtils } from 'fwork-jsts-common'
import { ModelDefined } from 'sequelize/types'
import { MakeNullishOptional } from 'sequelize/types/utils'
import { uuidv7 } from 'uuidv7'
import { ISequelizeCreateOptions } from '../crudOptions'
import { ISequelizeRelationBelongsTo, ISequelizeRelationHasMany, ISequelizeRelationHasOne } from '../relations'
import { SequelizeTransaction } from '../transaction'

export const sequelizeExecCreate = async <T extends {}>(options: ISequelizeCreateOptions<T>, optionsExt: {
  collectionModel: ModelDefined<T, T>,
  keyName: keyof T,
  transaction?: SequelizeTransaction | undefined,
  belongsTo?: ISequelizeRelationBelongsTo<any, any>[] | undefined,
  hasMany?: ISequelizeRelationHasMany<any, any>[] | undefined,
  hasOne?: ISequelizeRelationHasOne<any, any>[] | undefined,
  onBeforeCreate?: ((options: ISequelizeCreateOptions<T>) => ISequelizeCreateOptions<T> | Promise<ISequelizeCreateOptions<T>>) | undefined,
  onAfterCreate?: ((options: ISequelizeCreateOptions<T>, created?: T | undefined) => void | Promise<void>) | undefined,
}): Promise<T | undefined> => {
  if (optionsExt.onBeforeCreate)
    options = await optionsExt.onBeforeCreate(options)

  // MASTER RELATIONS
  if (optionsExt.belongsTo?.length)
    for (let relation of optionsExt.belongsTo.filter(b => b.createCascade)) {
      let master = (options.data as any)[relation.as]
      if (master) {
        (options.data as any)[relation.foreignKey] = master[relation.masterKey]
        await relation.dataSourceBuilder().create({
          ...options,
          data: master
        })
      }
    }

  // if (optionsExt.keyName.toLowerCase() == 'uuid' && !(options.data as any)[optionsExt.keyName])
  if (optionsExt.keyName.toString().toLowerCase() == 'uuid' && StringUtils.isEmpty((options.data as any)[optionsExt.keyName]))
    (options.data as any)[optionsExt.keyName] = uuidv7()

  // TODO-specific sequelize
  const transaction = options.transaction ?? optionsExt.transaction
  const created: T = (await optionsExt.collectionModel!.create(options.data as unknown as MakeNullishOptional<T>, { transaction: transaction?.transactionObj })).dataValues

  // CHILDREN RELATIONS
  if (optionsExt.hasMany?.length)
    for (let relation of optionsExt.hasMany) {
      let children: any[] = (options.data as any)[relation.as]
      if (children?.length) {
        children.forEach(c => c[relation.foreignKey] = (options.data as any)[relation.masterKey])
        await relation.dataSourceBuilder().bulkCreate({
          ...options,
          data: children
        })
      }
    }

  // CHILD RELATIONS
  if (optionsExt.hasOne?.length)
    for (let relation of optionsExt.hasOne) {
      let child = (options.data as any)[relation.as]
      if (child) {
        child[relation.foreignKey] = (options.data as any)[relation.masterKey]
        await relation.dataSourceBuilder().create({
          ...options,
          data: child
        })
      }
    }

  if (optionsExt.onAfterCreate)
    await optionsExt.onAfterCreate(options, created)

  return created
}
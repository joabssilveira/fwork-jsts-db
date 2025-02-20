import { StringUtils } from 'fwork-jsts-common'
import { ModelDefined } from 'sequelize/types'
import { MakeNullishOptional } from 'sequelize/types/utils'
import { uuidv7 } from 'uuidv7'
import { ISequelizeBulkCreateOptions } from '../crudOptions'
import { ISequelizeRelationBelongsTo, ISequelizeRelationHasMany, ISequelizeRelationHasOne } from '../relations'
import { SequelizeTransaction } from '../transaction'

export const sequelizeExecBulkCreate = async <T extends {}>(options: ISequelizeBulkCreateOptions<T>, optionsExt: {
  collectionModel: ModelDefined<T, T>,
  keyName: keyof T,
  transaction?: SequelizeTransaction | undefined,
  belongsTo?: ISequelizeRelationBelongsTo<any, any>[] | undefined,
  hasMany?: ISequelizeRelationHasMany<any, any>[] | undefined,
  hasOne?: ISequelizeRelationHasOne<any, any>[] | undefined,
  onBeforeBulkCreate?: ((options: ISequelizeBulkCreateOptions<T>) => ISequelizeBulkCreateOptions<T> | Promise<ISequelizeBulkCreateOptions<T>>) | undefined,
  onAfterBulkCreate?: ((options: ISequelizeBulkCreateOptions<T>, createdList?: T[] | undefined) => void | Promise<void>) | undefined,

  overrideMasterOptions?: (options: ISequelizeBulkCreateOptions<any>) => ISequelizeBulkCreateOptions<any>,
  overrideChildrenOptions?: (options: ISequelizeBulkCreateOptions<any>) => ISequelizeBulkCreateOptions<any>,
  overrideChildOptions?: (options: ISequelizeBulkCreateOptions<any>) => ISequelizeBulkCreateOptions<any>,
}): Promise<T[] | undefined> => {
  if (!options.data.length) return

  if (optionsExt.onBeforeBulkCreate)
    options = await optionsExt.onBeforeBulkCreate(options)

  for (let d of options.data)
    if (optionsExt.keyName.toString().toLowerCase() == 'uuid' && StringUtils.isEmpty((d as any)[optionsExt.keyName]))
      (d as any)[optionsExt.keyName] = uuidv7()

  // MASTER RELATIONS
  if (optionsExt.belongsTo?.length) {
    for (let relation of optionsExt.belongsTo.filter(b => b.createCascade)) {
      const masters = []

      for (let data of options.data) {
        let master = (data as any)[relation.as]
        if (master) {
          (data as any)[relation.foreignKey] = master[relation.masterKey]
          masters.push(master)
        }
      }

      await relation.dataSourceBuilder().bulkCreate({
        ...(optionsExt.overrideMasterOptions ? optionsExt.overrideMasterOptions(options) : options),
        data: masters
      })
    }
  }

  // TODO-specific sequelize
  const transaction = options.transaction ?? optionsExt.transaction
  const createdResponse = await optionsExt.collectionModel!.bulkCreate(options.data as unknown as MakeNullishOptional<T>[], { transaction: transaction?.transactionObj })
  const createdList = createdResponse.map(i => i.get({ plain: true }))

  // CHILDREN RELATIONS
  if (optionsExt.hasMany?.length) {
    for (let relation of optionsExt.hasMany) {
      const children = []

      for (let data of options.data) {
        let lChildren: any[] = (data as any)[relation.as]
        if (lChildren?.length) {
          lChildren.forEach(c => c[relation.foreignKey] = (data as any)[relation.masterKey])
          children.push(...lChildren)
        }
      }

      await relation.dataSourceBuilder().bulkCreate({
        ...(optionsExt.overrideChildrenOptions ? optionsExt.overrideChildrenOptions(options) : options),
        data: children
      })
    }
  }

  // CHILD RELATIONS
  if (optionsExt.hasOne?.length) {
    for (let relation of optionsExt.hasOne) {
      const children = []

      for (let data of options.data) {
        let child = (data as any)[relation.as]
        if (child) {
          child[relation.foreignKey] = (data as any)[relation.masterKey]
          children.push(child)
        }
      }

      await relation.dataSourceBuilder().bulkCreate({
        ...(optionsExt.overrideChildOptions ? optionsExt.overrideChildOptions(options) : options),
        data: children
      })
    }
  }

  if (optionsExt.onAfterBulkCreate)
    await optionsExt.onAfterBulkCreate({ data: options.data }, createdList)

  return createdList
}
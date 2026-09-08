import { StringUtils } from 'fwork-jsts-common'
import { ModelDefined } from 'sequelize'
import { MakeNullishOptional } from 'sequelize/types/utils'
import { uuidv7 } from 'uuidv7'
import { ISequelizeCreateOptions } from '../crudOptions'
import { ISequelizeRelationBelongsTo, ISequelizeRelationHasMany, ISequelizeRelationHasOne } from '../relations'
import { SequelizeTransaction } from '../transaction'
import { WithoutSequelizeTimestamps } from '../types'

export const sequelizeExecCreate = async <T extends {}>(options: ISequelizeCreateOptions<T>, optionsExt: {
  collectionModel: ModelDefined<T, T | WithoutSequelizeTimestamps<T>>,
  keyName: keyof T,
  transaction?: SequelizeTransaction | undefined,
  belongsTo?: ISequelizeRelationBelongsTo<any, any>[] | undefined,
  hasMany?: ISequelizeRelationHasMany<any, any>[] | undefined,
  hasOne?: ISequelizeRelationHasOne<any, any>[] | undefined,
  onBeforeCreate?: ((options: ISequelizeCreateOptions<T>) => ISequelizeCreateOptions<T> | Promise<ISequelizeCreateOptions<T>>) | undefined,
  onAfterCreate?: ((options: ISequelizeCreateOptions<T>, created?: T | undefined) => void | Promise<void>) | undefined,

  overrideMasterOptions?: (options: ISequelizeCreateOptions<any>) => ISequelizeCreateOptions<any>,
  overrideChildrenOptions?: (options: ISequelizeCreateOptions<any>) => ISequelizeCreateOptions<any>,
  overrideChildOptions?: (options: ISequelizeCreateOptions<any>) => ISequelizeCreateOptions<any>,
}): Promise<T | undefined> => {
  if (optionsExt.onBeforeCreate)
    options = await optionsExt.onBeforeCreate(options)

  // MASTER RELATIONS
  if (optionsExt.belongsTo?.length)
    for (let relation of optionsExt.belongsTo.filter(b => b.createCascade)) {
      let master = (options.data as any)[relation.as]
      if (master) {
        (options.data as any)[relation.foreignKey] = master[relation.masterKey]
        const masterDbRes = await relation.dataSourceBuilder().create({
          ...(optionsExt.overrideMasterOptions ? optionsExt.overrideMasterOptions(options) : options),
          data: master
        })
        if (!(options.data as any)[relation.foreignKey])
          (options.data as any)[relation.foreignKey] = masterDbRes[relation.masterKey]
      }
    }

  // if (optionsExt.keyName.toLowerCase() == 'uuid' && !(options.data as any)[optionsExt.keyName])
  if (optionsExt.keyName.toString().toLowerCase() == 'uuid' && StringUtils.isEmpty((options.data as any)[optionsExt.keyName]))
    (options.data as any)[optionsExt.keyName] = uuidv7()

  // TODO-specific sequelize
  const transaction = options.transaction ?? optionsExt.transaction
  const dbRes = await optionsExt.collectionModel!.create(options.data as unknown as MakeNullishOptional<T>, { transaction: transaction?.transactionObj })
  const datavalues = dbRes.dataValues

  // https://chatgpt.com/share/6a8a83b8-c838-83e9-8f0b-2977b720a0cf
  // CHILDREN RELATIONS
  // if (optionsExt.hasMany?.length)
  //   for (let relation of optionsExt.hasMany) {
  //     let children: any[] = (options.data as any)[relation.as]
  //     if (children?.length) {
  //       children.forEach(c => c[relation.foreignKey] = (options.data as any)[relation.masterKey])
  //       await relation.dataSourceBuilder().bulkCreate({
  //         ...(optionsExt.overrideChildrenOptions ? optionsExt.overrideChildrenOptions(options) : options),
  //         data: children,
  //       })
  //     }
  //   }
  if (optionsExt.hasMany?.length) {
    for (let i = 0; i < optionsExt.hasMany.length; i++) {
      const relation = optionsExt.hasMany[i]

      const children: any[] = (options.data as any)[relation.as]

      if (children?.length) {
        children.forEach(
          c => c[relation.foreignKey] = (options.data as any)[relation.masterKey]
        )

        await relation.dataSourceBuilder().bulkCreate({
          ...(optionsExt.overrideChildrenOptions
            ? optionsExt.overrideChildrenOptions(options)
            : options),
          data: children,
        })
      }
    }
  }

  // https://chatgpt.com/share/6a8a83b8-c838-83e9-8f0b-2977b720a0cf
  // CHILD RELATIONS
  // if (optionsExt.hasOne?.length)
  //   for (let relation of optionsExt.hasOne) {
  //     let child = (options.data as any)[relation.as]
  //     if (child) {
  //       child[relation.foreignKey] = (options.data as any)[relation.masterKey]
  //       await relation.dataSourceBuilder().create({
  //         ...(optionsExt.overrideChildOptions ? optionsExt.overrideChildOptions(options) : options),
  //         data: child
  //       })
  //     }
  //   }
  if (optionsExt.hasOne?.length)
    for (let i = 0; i < optionsExt.hasOne.length; i++) {
      const relation = optionsExt.hasOne[i]

      let child = (options.data as any)[relation.as]

      if (child) {
        child[relation.foreignKey] = (options.data as any)[relation.masterKey]

        await relation.dataSourceBuilder().create({
          ...(optionsExt.overrideChildOptions
            ? optionsExt.overrideChildOptions(options)
            : options),
          data: child
        })
      }
    }

  if (optionsExt.onAfterCreate)
    await optionsExt.onAfterCreate(options, datavalues as T)

  return datavalues
}
import { StringUtils } from "fwork-jsts-common/src"
import mongoose from "mongoose"
import { uuidv7 } from "uuidv7"
import { IDbBulkCreateOptions, IDbRelationBelongsTo, IDbRelationHasMany, IDbRelationHasOne } from "../../dbClient"

export const execBulkCreate = async <T>(options: IDbBulkCreateOptions<T>, optionsExt: {
  collectionModel: mongoose.Model<T, {}, {}, {}, any>,
  keyName: keyof T,
  belongsTo?: IDbRelationBelongsTo<any, any>[] | undefined,
  hasMany?: IDbRelationHasMany<any, any>[] | undefined,
  hasOne?: IDbRelationHasOne<any, any>[] | undefined,
  onBeforeBulkCreate?: ((options: IDbBulkCreateOptions<T>) => IDbBulkCreateOptions<T> | Promise<IDbBulkCreateOptions<T>>) | undefined,
  onAfterBulkCreate?: ((options: IDbBulkCreateOptions<T>, createdList?: T[] | undefined) => void | Promise<void>) | undefined
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
        ...options,
        data: masters
      })
    }
  }

  // TODO-specific mongoose
  const createdList = await optionsExt.collectionModel.insertMany(options.data)

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
        ...options,
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
        ...options,
        data: children
      })
    }
  }

  if (optionsExt.onAfterBulkCreate)
    await optionsExt.onAfterBulkCreate({ data: options.data }, createdList)

  return createdList
}
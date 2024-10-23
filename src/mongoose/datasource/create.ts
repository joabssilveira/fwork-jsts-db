import { StringUtils } from 'fwork-jsts-common/src'
import mongoose from 'mongoose'
import { uuidv7 } from "uuidv7"
import {
  IDbCreateOptions,
  IDbRelationBelongsTo, IDbRelationHasMany, IDbRelationHasOne
} from '../../dbClient'

export const execCreate = async <T>(options: IDbCreateOptions<T>, optionsExt: {
  collectionModel: mongoose.Model<T, {}, {}, {}, any>,
  keyName: keyof T,
  belongsTo?: IDbRelationBelongsTo<any, any>[] | undefined,
  hasMany?: IDbRelationHasMany<any, any>[] | undefined,
  hasOne?: IDbRelationHasOne<any, any>[] | undefined,
  onBeforeCreate?: ((options: IDbCreateOptions<T>) => IDbCreateOptions<T> | Promise<IDbCreateOptions<T>>) | undefined
  onAfterCreate?: (options: IDbCreateOptions<T>, created?: T | undefined) => void | Promise<void>
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

  // TODO-specific mongoose
  const mongoDoc = new optionsExt.collectionModel!(options.data)
  const dbResponse = await mongoDoc.save()
  const created = dbResponse.toObject({ getters: true })

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
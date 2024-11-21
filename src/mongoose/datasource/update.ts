import mongoose, { FilterQuery } from 'mongoose'
import {
  IDbRelationBelongsTo, IDbRelationHasMany, IDbRelationHasOne,
} from '../../dbClient'
import { MongooseTransaction } from '../transaction'
import { IMongooseUpdateOptions } from '../crudOptions'

export const mongooseExecUpdate = async <T>(options: IMongooseUpdateOptions<T>, optionsExt: {
  collectionModel: mongoose.Model<T, {}, {}, {}, any>,
  keyName: keyof T,
  transaction?: MongooseTransaction | undefined,
  belongsTo?: IDbRelationBelongsTo<any, any>[] | undefined,
  hasMany?: IDbRelationHasMany<any, any>[] | undefined,
  hasOne?: IDbRelationHasOne<any, any>[] | undefined,
  onBeforeUpdate?: ((options: IMongooseUpdateOptions<T>) => IMongooseUpdateOptions<T> | Promise<IMongooseUpdateOptions<T>>) | undefined
  onAfterUpdate?: ((options: IMongooseUpdateOptions<T>, result?: { modifiedCount: number } | undefined) => void | Promise<void>) | undefined
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

  // specific mongoose
  const session = options.transaction?.session ?? optionsExt.transaction?.session
  const result = await optionsExt.collectionModel.updateOne({
    [optionsExt.keyName]: (options.data as any)[optionsExt.keyName]
  } as FilterQuery<T>, data as mongoose.UpdateQuery<T>, { new: true, session })

  // CHILDREN RELATIONS
  if (optionsExt.hasMany?.length)
    for (let relation of optionsExt.hasMany.filter(b => b.updateCascadeOptions?.active)) {
      let children: any[] | undefined | null = (options.data as any)[relation.as]
      if (children && relation.updateCascadeOptions?.childKeyName) {
        // remover os que estao no banco e nao vieram nas opcoes
        await relation.dataSourceBuilder().delete({
          where: {
            $and: [
              {
                [relation.foreignKey]: (options.data as any)[relation.masterKey],
              },
              {
                [relation.updateCascadeOptions.childKeyName]: {
                  $nin: children.map(c => c[relation.updateCascadeOptions!.childKeyName])
                }
              }
            ],
          }
        })

        // criar os que nao estao no banco e vieram nas opcoes
        const dbRes = await relation.dataSourceBuilder().read({
          where: {
            [relation.foreignKey]: (options.data as any)[relation.masterKey],
          }
        })

        const childrenKeysInDb = dbRes?.payload?.map(c => c[relation.updateCascadeOptions!.childKeyName])
        const childrenToCreate = children.filter(c => !childrenKeysInDb?.includes(c[relation.updateCascadeOptions!.childKeyName]))
        if (childrenToCreate.length) {
          childrenToCreate.forEach(c => c[relation.foreignKey] = (options.data as any)[relation.masterKey])
          await relation.dataSourceBuilder().bulkCreate({
            ...options,
            data: childrenToCreate
          })
        }

        // atualizar os que estao no banco e vieram nas opcoes
        const childrenCreatedKeys = childrenToCreate.map(c => c[relation.updateCascadeOptions!.childKeyName])
        const childrenToUpdate = children.filter(c => !childrenCreatedKeys.includes(c[relation.updateCascadeOptions!.childKeyName]))
        if (childrenToUpdate.length) {
          for (const childToUpdate of childrenToUpdate) {
            await relation.dataSourceBuilder().update({
              ...options,
              data: childToUpdate
            })
          }
        }
      }
    }

  // CHILD RELATIONS
  if (optionsExt.hasOne?.length)
    for (let relation of optionsExt.hasOne.filter(b => b.updateCascadeOptions?.active)) {
      let child = (options.data as any)[relation.as]
      if (child && relation.updateCascadeOptions?.childKeyName) {
        // consulta pra checar se existe no banco
        const dbRes = await relation.dataSourceBuilder().read({
          where: {
            [relation.foreignKey]: (options.data as any)[relation.masterKey],
          }
        })

        if (dbRes?.payload?.length) {
          await relation.dataSourceBuilder().update({
            ...options,
            data: child
          })
        } else {
          child[relation.foreignKey] = (options.data as any)[relation.masterKey]
          await relation.dataSourceBuilder().create({
            ...options,
            data: child
          })
        }
      }
    }

  if (result?.modifiedCount) {
    if (optionsExt.onAfterUpdate)
      await optionsExt.onAfterUpdate(options, result)
    return options.data
  }

  return undefined
}
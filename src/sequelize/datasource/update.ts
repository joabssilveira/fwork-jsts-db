import { ISequelizeGetOptions, ISequelizeUpdateOptions } from '../crudOptions'
import { ISequelizeRelationBelongsTo, ISequelizeRelationHasMany, ISequelizeRelationHasOne } from '../relations'
import { SequelizeTransaction } from '../transaction'
import { sequelizeExecRead } from './read'
import { IDbGetResult } from '../../dbClient'
import { ModelDefined, Op } from 'sequelize'

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

  // CHILDREN RELATIONS
  if (optionsExt.hasMany?.length)
    for (let relation of optionsExt.hasMany.filter(b => b.updateCascadeOptions?.active)) {
      let children: any[] | undefined | null = (options.data as any)[relation.as]
      if (children && relation.updateCascadeOptions?.childKeyName) {
        // remover os que estao no banco e nao vieram nas opcoes
        await relation.dataSourceBuilder().delete({
          where: {
            [Op.and]: [
              {
                [relation.foreignKey]: (options.data as any)[relation.masterKey],
              },
              {
                [relation.updateCascadeOptions.childKeyName]: {
                  [Op.notIn]: children.map(c => c[relation.updateCascadeOptions!.childKeyName])
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
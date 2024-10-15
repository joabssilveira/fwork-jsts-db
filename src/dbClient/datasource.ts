import { IDbBulkCreateOptions, IDbCreateOptions, IDbDeleteByKeyOptions, IDbDeleteOptions, IDbGetOptions, IDbUpdateOptions } from "./crudOptions"
import { IDbRelationBelongsTo, IDbRelationHasMany, IDbRelationHasOne } from "./relation"
import { IDbGetResult } from "./results"

export interface IDbClientDataSource<T, keyType,
  bulkCreateOptionsType extends IDbBulkCreateOptions<T>,
  createOptionsType extends IDbCreateOptions<T>,
  getOptionsType extends IDbGetOptions,
  updateOptionsType extends IDbUpdateOptions<T>,
  deleteOptionsType extends IDbDeleteOptions,
  deleteByKeyOptionsType extends IDbDeleteByKeyOptions<keyType>
> {
  keyName: keyof T
  belongsTo?: IDbRelationBelongsTo<any, any>[] | undefined
  hasMany?: IDbRelationHasMany<any, any>[] | undefined
  hasOne?: IDbRelationHasOne<any, any>[] | undefined

  onBeforeBulkCreate?: ((options: bulkCreateOptionsType) => bulkCreateOptionsType | Promise<bulkCreateOptionsType>) | undefined
  onAfterBulkCreate?: ((options: bulkCreateOptionsType, createdList?: T[]) => void | Promise<void>) | undefined
  onBeforeCreate?: ((options: createOptionsType) => createOptionsType | Promise<createOptionsType>) | undefined
  onAfterCreate?: ((options: createOptionsType, created?: T) => void | Promise<void>) | undefined
  onBeforeRead?: ((options?: getOptionsType) => getOptionsType | undefined | Promise<getOptionsType | undefined>) | undefined
  onAfterRead?: ((options?: getOptionsType, result?: IDbGetResult<T[]> | undefined) => void | Promise<void>) | undefined
  onBeforeUpdate?: ((options: updateOptionsType) => updateOptionsType | Promise<updateOptionsType>) | undefined
  onAfterUpdate?: ((options: updateOptionsType, result?: { modifiedCount: number } | undefined) => void | Promise<void>) | undefined
  onBeforeDelete?: ((options: deleteOptionsType | deleteByKeyOptionsType) => deleteOptionsType | deleteByKeyOptionsType | Promise<deleteOptionsType | deleteByKeyOptionsType>) | undefined
  onAfterDelete?: ((options: deleteOptionsType | deleteByKeyOptionsType, result: number) => void | Promise<void>) | undefined

  bulkCreate(options?: bulkCreateOptionsType): Promise<T[] | undefined> | T[] | undefined
  create(options: createOptionsType): Promise<T | undefined> | T | undefined
  read(options?: getOptionsType): Promise<IDbGetResult<T[]> | undefined> | IDbGetResult<T[]> | undefined
  update(options: updateOptionsType): Promise<T | undefined> | T | undefined
  delete(options: deleteOptionsType | deleteByKeyOptionsType): Promise<number> | number
}
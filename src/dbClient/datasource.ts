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

  onBeforeBulkCreate?: ((options: bulkCreateOptionsType) => bulkCreateOptionsType) | undefined
  onAfterBulkCreate?: ((options: bulkCreateOptionsType, createdList?: T[]) => void) | undefined
  onBeforeCreate?: ((options: createOptionsType) => createOptionsType) | undefined
  onAfterCreate?: ((options: createOptionsType, created?: T) => void) | undefined
  onBeforeRead?: ((options?: getOptionsType) => getOptionsType | undefined) | undefined
  onAfterRead?: ((options?: getOptionsType, result?: IDbGetResult<T[]> | undefined) => void) | undefined
  onBeforeUpdate?: ((options: updateOptionsType) => updateOptionsType) | undefined
  onAfterUpdate?: ((options: updateOptionsType, result?: { modifiedCount: number } | undefined) => void) | undefined
  onBeforeDelete?: ((options: deleteOptionsType | deleteByKeyOptionsType) => deleteOptionsType | deleteByKeyOptionsType) | undefined
  onAfterDelete?: ((options: deleteOptionsType | deleteByKeyOptionsType, result: number) => void) | undefined

  bulkCreate(options?: bulkCreateOptionsType): Promise<T[] | undefined> | T[] | undefined
  create(options: createOptionsType): Promise<T | undefined> | T | undefined
  read(options?: getOptionsType): Promise<IDbGetResult<T[]> | undefined> | IDbGetResult<T[]> | undefined
  update(options: updateOptionsType): Promise<T | undefined> | T | undefined
  delete(options: deleteOptionsType | deleteByKeyOptionsType): Promise<number> | number
}
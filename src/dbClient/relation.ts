import { IDbBulkCreateOptions, IDbCreateOptions, IDbDeleteByKeyOptions, IDbDeleteOptions, IDbGetOptions, IDbUpdateOptions } from "./crudOptions"
import { IDbClientDataSource } from "./datasource"

export enum DbRelationType {
  hasMany,
  hasOne,
  belongsTo,
}

export interface IDbRelation<Master, Child, RelationType extends DbRelationType> {
  masterKey: keyof Master,
  foreignKey: keyof Child,
  as: RelationType extends DbRelationType.hasMany ? keyof Master : RelationType extends DbRelationType.hasOne ? keyof Master : keyof Child,
  collection: string,
  dataSourceBuilder: () => IDbClientDataSource<
    RelationType extends DbRelationType.hasMany ? Child : RelationType extends DbRelationType.hasOne ? Child : Master,
    any,
    IDbBulkCreateOptions<any>,
    IDbCreateOptions<any>,
    IDbGetOptions,
    IDbUpdateOptions<any>,
    IDbDeleteOptions,
    IDbDeleteByKeyOptions<any>>
}

export type DbRelationTypeHasMany = DbRelationType.hasMany

export interface IDbRelationHasMany<Master, Child> extends IDbRelation<Master, Child, DbRelationType.hasMany> {
  deleteCascade?: boolean,
  updateCascadeOptions?: {
    active: boolean,
    childKeyName: keyof Child
  },
}

export type DbRelationTypeHasOne = DbRelationType.hasOne

export interface IDbRelationHasOne<Master, Child> extends IDbRelation<Master, Child, DbRelationType.hasOne> {
  deleteCascade?: boolean,
  updateCascadeOptions?: {
    active: boolean,
    childKeyName: keyof Child
  },
}

export type DbRelationTypeBelongsTo = DbRelationType.belongsTo

export interface IDbRelationBelongsTo<Master, Child> extends IDbRelation<Master, Child, DbRelationType.belongsTo> {
  createCascade?: boolean,
  updateCascade?: boolean,
}
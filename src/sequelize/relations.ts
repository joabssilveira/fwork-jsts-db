import { ModelDefined } from 'sequelize/types'
import { IDbRelationBelongsTo, IDbRelationHasMany, IDbRelationHasOne } from '../dbClient/relation'
import { ISequelizeDataSource } from './datasource'

export interface ISequelizeRelationHasMany<Master, Child extends {}> extends IDbRelationHasMany<Master, Child> {
  modelDefined: ModelDefined<Child, Child>
  dataSourceBuilder: () => ISequelizeDataSource<Child>
}

export interface ISequelizeRelationHasOne<Master, Child extends {}> extends IDbRelationHasOne<Master, Child> {
  modelDefined: ModelDefined<Child, Child>
  dataSourceBuilder: () => ISequelizeDataSource<Child>
}

export interface ISequelizeRelationBelongsTo<Master extends {}, Child> extends IDbRelationBelongsTo<Master, Child> {
  modelDefined: ModelDefined<Master, Master>
  dataSourceBuilder: () => ISequelizeDataSource<Master>
}
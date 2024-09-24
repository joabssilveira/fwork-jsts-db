import { FilterQuery } from 'mongoose'
import { IDbDeleteOptions, IDbGetOptions } from '../dbClient/crudOptions'

export interface IMongooseGetOptions<T> extends IDbGetOptions {
  where?: FilterQuery<T>,
  addFields?: Record<string, any>,
}

export interface IMongooseDeleteOptions<T> extends IDbDeleteOptions {
  where: FilterQuery<T>
}
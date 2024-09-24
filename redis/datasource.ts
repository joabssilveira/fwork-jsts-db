import { IDbBulkCreateOptions, IDbCreateOptions, IDbUpdateOptions } from '../dbClient/crudOptions';
import { IDbClientDataSource } from '../dbClient/datasource';
import { IDbRelationBelongsTo, IDbRelationHasMany, IDbRelationHasOne } from '../dbClient/relation';
import { IDbGetResult } from '../dbClient/results';
import { RedisConnection } from './connection';
import { IRedisDeleteOptions, IRedisGetOptions } from './crudOptions';
import { RedisSearchResult, RedisUtils, RedisWhere } from './utils';

export interface IRedisDataSource<T, TWhereOptions> extends IDbClientDataSource<
  T,
  any,
  IDbBulkCreateOptions<T>,
  IDbCreateOptions<T>,
  IRedisGetOptions<TWhereOptions>,
  IDbUpdateOptions<T>,
  IRedisDeleteOptions,
  any
> {
  bulkCreate(options: IDbBulkCreateOptions<T>): Promise<T[] | undefined>
  create(options: IDbCreateOptions<T>): Promise<T | undefined>
  read(options?: IRedisGetOptions<TWhereOptions>): Promise<IDbGetResult<T[]> | undefined>
  update(options: IDbUpdateOptions<T>): Promise<T | undefined>
  delete(options: IRedisDeleteOptions | any): Promise<number>
}

export class RedisDataSource<T, TWhereOptions> implements IRedisDataSource<T, TWhereOptions> {
  conn: RedisConnection
  collectionPrefix: string
  keyName: keyof T

  constructor(conn: RedisConnection, collectionPrefix: string, keyName: keyof T) {
    this.conn = conn
    this.collectionPrefix = collectionPrefix
    this.keyName = keyName
  }

  belongsTo?: IDbRelationBelongsTo<any, any>[] | undefined;
  hasMany?: IDbRelationHasMany<any, any>[] | undefined;
  hasOne?: IDbRelationHasOne<any, any>[] | undefined;
  onBeforeBulkCreate?: ((options: IDbBulkCreateOptions<T>) => IDbBulkCreateOptions<T>) | undefined;
  onAfterBulkCreate?: ((options: IDbBulkCreateOptions<T>, createdList?: T[] | undefined) => void) | undefined;
  onBeforeCreate?: ((options: IDbCreateOptions<T>) => IDbCreateOptions<T>) | undefined;
  onAfterCreate?: ((options: IDbCreateOptions<T>, created?: T | undefined) => void) | undefined;
  onBeforeRead?: ((options?: IRedisGetOptions<TWhereOptions> | undefined) => IRedisGetOptions<TWhereOptions> | undefined) | undefined;
  onAfterRead?: ((options?: IRedisGetOptions<TWhereOptions> | undefined, result?: IDbGetResult<T[]> | undefined) => void) | undefined;
  onBeforeUpdate?: ((options: IDbUpdateOptions<T>) => IDbUpdateOptions<T>) | undefined;
  onAfterUpdate?: ((options: IDbUpdateOptions<T>, result?: { modifiedCount: number; } | undefined) => void) | undefined;
  onBeforeDelete?: ((options: IRedisDeleteOptions | any) => IRedisDeleteOptions | any) | undefined;
  onAfterDelete?: ((options: IRedisDeleteOptions | any, result: number) => void) | undefined;

  private pingText = 'PONG'

  private checkConn = async () => {
    // console.log('RedisDataSource.checkConn()')
    var ping = await this.conn.client?.ping()
    // console.log(`await this.conn.client?.ping(): ${ping}`)
    if (ping != this.pingText) {
      await this.conn.client?.connect()
    }
  }

  private doRead = async (options?: IRedisGetOptions<TWhereOptions>) => {
    let readed: T[] | undefined

    if (options?.where) {
      const where = new RedisWhere<TWhereOptions>().getWhere(options.where)

      this.checkConn()
      readed = (
        (
          await this.conn.client?.ft.search(
            `idx:${this.collectionPrefix}`,
            where,
          ) as any
        ) as RedisSearchResult<T>)
        .documents.map(d => d.value)
    }
    else {
      this.checkConn()
      const keys: any = await this.conn.client?.KEYS(`${this.collectionPrefix}:*`)

      const tmpReaded = []
      for await (const key of keys) {
        this.checkConn()
        const data = await this.conn.client?.json.get(key)
        tmpReaded.push(data)
      }

      readed = tmpReaded as any
    }
    return readed
  }

  bulkCreate(options: IDbBulkCreateOptions<T>): Promise<T[] | undefined> {
    throw new Error('Method not implemented (RedisDataSource.bulkCreate).');
  }

  async create(options: IDbCreateOptions<T>): Promise<T | undefined> {
    if (this.onBeforeCreate)
      options = this.onBeforeCreate(options)

    options.data = RedisUtils.convertBooleansToIntegers(options.data)

    this.checkConn()
    await this.conn.client?.json.set(`${this.collectionPrefix}:${(options.data as any)[this.keyName]}`, '$', options.data as any)

    if (this.onAfterCreate)
      this.onAfterCreate(options)
    return options.data
  }

  async read(options?: IRedisGetOptions<TWhereOptions> | undefined): Promise<IDbGetResult<T[]> | undefined> {
    if (this.onBeforeRead)
      options = this.onBeforeRead(options)

    if (options?.where)
      options.where = RedisUtils.convertBooleansToIntegers(options.where)

    const skip = (options?.skip || (((options?.limit || 0) * (options?.page || 1)) - (options?.limit || 0)))
    const page = (options?.page || ((skip / (options?.limit || 1)) + 1))

    let readed = await this.doRead(options)

    const readedCount = readed?.length

    const readedResult = readed?.slice(skip, skip + (options?.limit || readed.length))

    const result: IDbGetResult<T[]> = {
      payload: readedResult,
      pagination: {
        skip: skip,
        limit: options?.limit || readed?.length,
        count: readedCount,
        pageCount: readedCount ? Math.ceil(readedCount / (options?.limit || readedCount)) : 1,
        currentPage: page,
      }
    }

    if (this.onAfterRead)
      this.onAfterRead(options)

    return result
  }

  async update(options: IDbUpdateOptions<T>): Promise<T | undefined> {
    if (this.onBeforeUpdate)
      options = this.onBeforeUpdate(options)

    options.data = RedisUtils.convertBooleansToIntegers(options.data)

    this.checkConn()
    await this.conn.client?.json.set(`${this.collectionPrefix}:${(options.data as any)[this.keyName]}`, '$', options.data as any)

    if (this.onAfterUpdate)
      this.onAfterUpdate(options)

    return options.data
  }

  // TODO-IDbDeleteByKeyOptions on redis
  async delete(options: IRedisDeleteOptions): Promise<number> {
    if (this.onBeforeDelete)
      options = this.onBeforeDelete(options)

    this.checkConn()
    await this.conn.client?.json.del(`${this.collectionPrefix}:${options?.where}`)

    if (this.onAfterDelete)
      this.onAfterDelete(options, 1)

    return 1
  }
}
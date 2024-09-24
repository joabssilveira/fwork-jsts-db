export interface IDbCrudOptions {
  // transaction?: IDbTransaction
}

export interface IDbBulkCreateOptions<T> extends IDbCrudOptions {
  data: T[]
}

export interface IDbCreateOptions<T> extends IDbCrudOptions {
  data: T
}

export interface IDbGetOptions extends IDbCrudOptions {
  where?: any,
  sort?: any,
  select?: any,
  nested?: any,
  exclude?: any,
  limit?: number
  skip?: number,
  page?: number,
}

export interface IDbUpdateOptions<T> extends IDbCrudOptions {
  data: T,
}

export interface IDbDeleteByKeyOptions<keyType> extends IDbCrudOptions {
  key: keyType
}

export interface IDbDeleteOptions extends IDbCrudOptions {
  where: any,
}
export interface IDbBulkCreateOptions<T> {
  data: T[]
}

export interface IDbCreateOptions<T> {
  data: T
}

export interface IDbGetOptions {
  where?: any,
  sort?: any,
  select?: any,
  nested?: any,
  exclude?: any,
  limit?: number
  skip?: number,
  page?: number,
}

export interface IDbUpdateOptions<T> {
  data: T,
}

export interface IDbDeleteByKeyOptions<keyType> {
  key: keyType
}

export interface IDbDeleteOptions {
  where: any,
}

// 

export interface IDbResult<T> {
  data: T,
  success?: boolean,
  msg?: string, 
}
export interface IDbGetResult<T> {
  payload?: T,
  pagination?: {
    skip?: number,
    limit?: number,
    count?: number,
    pageCount?: number,
    currentPage?: number,
  }
}
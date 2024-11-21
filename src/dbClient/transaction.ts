export interface IDbTransaction {
  start(): any
  commit(): any
  rollback(): any
}
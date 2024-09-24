export interface IDbTransaction {
  commit(): any
  rollback(): any
}
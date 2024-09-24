import { Transaction } from "sequelize";
import { IDbTransaction } from "../dbClient/transaction";

export interface ISequelizeTransaction extends IDbTransaction {
  transactionObj: Transaction
}

export class SequelizeTransaction implements ISequelizeTransaction {
  transactionObj: Transaction

  constructor(options: {
    transactionObj: Transaction
  }) {
    this.transactionObj = options.transactionObj
  }

  commit() {
    this.transactionObj.commit()
  }
  rollback() {
    this.transactionObj.rollback()
  }
}
import { Transaction } from "sequelize";
import { IDbTransaction } from "../dbClient/transaction";

export class SequelizeTransaction implements IDbTransaction {
  transactionObj: Transaction

  constructor(options: {
    transactionObj: Transaction
  }) {
    this.transactionObj = options.transactionObj
  }

  start() {
    
  }
  async commit() {
    await this.transactionObj.commit()
  }
  async rollback() {
    await this.transactionObj.rollback()
  }
}
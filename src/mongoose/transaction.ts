import { ClientSession, Connection } from "mongoose";
import { IDbTransaction } from "../dbClient";

export class MongooseTransaction implements IDbTransaction {
  connection: Connection
  session!: ClientSession

  constructor(options: {
    connection: Connection
  }) {
    this.connection = options.connection

    const getSession = async () => {
      this.session = await this.connection.startSession()
    } 
    getSession()
  }

  async start() {
    this.session.startTransaction()
  }

  commit() {
    this.session.commitTransaction()
  }
  
  rollback() {
    this.session.abortTransaction()
  }
}
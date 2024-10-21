import mongoose, { Schema } from "mongoose";
import { uuidv7 } from "uuidv7";
import { IDbCreateOptions, IDbTransaction, IDbUpdateOptions } from "../dbClient";
import { MongooseDataSource } from "./datasource";

export const MongooseTransactionStatus = {
  pending: 0,
  commited: 1,
  rolledback: 2,
} as const
export type MongooseTransactionStatus = typeof MongooseTransactionStatus[keyof typeof MongooseTransactionStatus]

export interface ITransactionUpdatedInfo<T> {
  collectionName: string,
  keyName: keyof T,
  keyValue: any,
  oldValue: T,
}

export interface ITransactionCreatedInfo<T> {
  collectionName: string,
  keyName: keyof T,
  keyValue: any,
}

export interface IMongooseTransactionData<T> {
  uuid: string,
  status: MongooseTransactionStatus,
  created?: ITransactionCreatedInfo<T>[]
}

export const mongooseTrasactionDataSchema = new Schema<IMongooseTransactionData<any>>({
  uuid: {
    type: String,
    required: true,
    unique: true,
    default: uuidv7()
  },
  status: {
    type: Number,
    required: true,
    default: MongooseTransactionStatus.pending,
  }
})

export class MongooseTransactionsDataSource extends MongooseDataSource<IMongooseTransactionData<any>>{
  
}

export class MongooseTransaction implements IDbTransaction {
  model: mongoose.Model<IMongooseTransactionData<any>, {}, {}, {}, any>
  transaction: IMongooseTransactionData<any>
  transactionDs: MongooseTransactionsDataSource

  constructor(args: {
    connection: mongoose.Connection
  }) {
    this.model = args.connection?.model<IMongooseTransactionData<any>>('trasactionSchema', mongooseTrasactionDataSchema, '_transactions')
    this.transaction = {
      uuid: uuidv7(),
      status: MongooseTransactionStatus.pending,
    }
    this.transactionDs = new MongooseTransactionsDataSource({
      collectionModel: this.model,
      keyName: 'uuid',
    })

    this.transactionDs.create({
      data: this.transaction
    })
  }

  bulkCreate() {

  }
  create<T>(args: {
    options: IDbCreateOptions<T>,
    datasource: MongooseDataSource<T>,
  }) {
    
  }
  update<T>(args: {
    options: IDbUpdateOptions<T>,
    datasource: MongooseDataSource<T>,
  }) {
    let oldData = args.datasource.read({
      where: {
        [args.datasource.keyName as any]: args.options.data[args.datasource.keyName]
      }
    })
    this.transaction.created = [
      ...this.transaction.created ?? [],
      {
        collectionName: args.datasource.collectionModel.collection.name,
        keyName: args.datasource.keyName,
        keyValue: args.options.data[args.datasource.keyName]
      }
    ]
    this.transactionDs.update({
      data: this.transaction
    })
  }
  remove() {

  }

  commit() {
    this.transactionDs.update({
      data: {
        ...this.transaction,
        status: MongooseTransactionStatus.commited
      }
    })
  }
  rollback() {
    this.transactionDs.update({
      data: {
        ...this.transaction,
        status: MongooseTransactionStatus.rolledback
      }
    })
  }
}
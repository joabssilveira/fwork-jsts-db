// import mongoose, { FilterQuery, Schema } from "mongoose";
// import { uuidv7 } from "uuidv7";
// import { IDbCreateOptions, IDbDeleteByKeyOptions, IDbDeleteOptions, IDbTransaction, IDbUpdateOptions } from "../../dbClient";
// import { MongooseDataSource } from "../datasource";
// import { IMongooseDeleteOptions } from "../crudOptions";

// export const MongooseTransactionStatus = {
//   pending: 0,
//   commited: 1,
//   rolledback: 2,
// } as const
// export type MongooseTransactionStatus = typeof MongooseTransactionStatus[keyof typeof MongooseTransactionStatus]

// export interface IMongooseTransactionCreatedInfo<T> {
//   collectionName: string,
//   keyName: keyof T,
//   keyValue: any,
//   data: T,
//   // 
//   ds: MongooseDataSource<T>,
// }

// export interface IMongooseTransactionUpdatedInfo<T> {
//   collectionName: string,
//   keyName: keyof T,
//   keyValue: any,
//   oldValue: T,
//   newValue: T,
//   // 
//   ds: MongooseDataSource<T>
// }

// export interface IMongooseTransactionDeletedInfo<T> {
//   collectionName: string,
//   keyName: keyof T,
//   keyValue: any,
//   oldValue: T,
//   // 
//   ds: MongooseDataSource<T>
// }

// export interface IMongooseTransactionData<T> {
//   uuid: string,
//   status: MongooseTransactionStatus,
//   created?: IMongooseTransactionCreatedInfo<T>[],
//   updated?: IMongooseTransactionUpdatedInfo<T>[],
//   deleted?: IMongooseTransactionDeletedInfo<T>[],
// }

// export const mongooseTransactionCreatedInfroSchema = new Schema<IMongooseTransactionCreatedInfo<any>>({
//   collectionName: {
//     type: String,
//     required: true,
//   },
//   keyName: {
//     type: String,
//     required: true,
//   },
//   keyValue: {
//     type: Schema.Types.Mixed,
//     required: true,
//   },
//   data: {
//     type: Schema.Types.Mixed,
//     required: true,
//   }
// })

// export const mongooseTransactionUpdatedInfoSchema = new Schema<IMongooseTransactionUpdatedInfo<any>>({
//   collectionName: {
//     type: String,
//     required: true,
//   },
//   keyName: {
//     type: String,
//     required: true,
//   },
//   keyValue: {
//     type: Schema.Types.Mixed,
//     required: true,
//   },
//   oldValue: {
//     type: Schema.Types.Mixed,
//     required: true,
//   },
//   newValue: {
//     type: Schema.Types.Mixed,
//     required: true,
//   }
// })

// export const mongooseTransactionDeletedInfoSchema = new Schema<IMongooseTransactionDeletedInfo<any>>({
//   collectionName: {
//     type: String,
//     required: true,
//   },
//   keyName: {
//     type: String,
//     required: true,
//   },
//   keyValue: {
//     type: Schema.Types.Mixed,
//     required: true,
//   },
//   oldValue: {
//     type: Schema.Types.Mixed,
//     required: true,
//   },
// })

// export const mongooseTrasactionDataSchema = new Schema<IMongooseTransactionData<any>>({
//   uuid: {
//     type: String,
//     required: true,
//     unique: true,
//     default: uuidv7()
//   },
//   status: {
//     type: Number,
//     required: true,
//     default: MongooseTransactionStatus.pending,
//   },
//   created: []
// })

// export class MongooseTransactionsDataSource extends MongooseDataSource<IMongooseTransactionData<any>> {

// }

// export class MongooseTransaction implements IDbTransaction {
//   model: mongoose.Model<IMongooseTransactionData<any>, {}, {}, {}, any>
//   transaction: IMongooseTransactionData<any>
//   transactionDs: MongooseTransactionsDataSource
//   connection: mongoose.Connection
//   emptySchema = new mongoose.Schema({}, { strict: false });

//   constructor(args: {
//     connection: mongoose.Connection
//   }) {
//     this.connection = args.connection
//     this.model = args.connection?.model<IMongooseTransactionData<any>>('trasactionSchema', mongooseTrasactionDataSchema, 'sys.transactions')
//     this.transaction = {
//       uuid: uuidv7(),
//       status: MongooseTransactionStatus.pending,
//     }
//     this.transactionDs = new MongooseTransactionsDataSource({
//       collectionModel: this.model,
//       keyName: 'uuid',
//       transaction: undefined,
//     })

//     this.transactionDs.create({
//       data: this.transaction
//     })
//   }

//   bulkCreate() {

//   }

//   async create<T>(args: {
//     options: IDbCreateOptions<T>,
//     datasource: MongooseDataSource<T>,
//   }) {
//     if (!this.transaction.created) this.transaction.created = []
//     this.transaction.created.push({
//       collectionName: args.datasource.collectionModel.collection.name,
//       keyName: args.datasource.keyName,
//       keyValue: args.options.data[args.datasource.keyName],
//       data: args.options.data,
//       ds: args.datasource,
//     })
//     await this.transactionDs.update({
//       data: this.transaction
//     })
//   }

//   async update<T>(args: {
//     options: IDbUpdateOptions<T>,
//     datasource: MongooseDataSource<T>,
//   }) {
//     let oldData = await args.datasource.read({
//       where: {
//         [args.datasource.keyName as any]: args.options.data[args.datasource.keyName]
//       }
//     })
//     if (oldData?.payload?.length) {
//       if (!this.transaction.updated) this.transaction.updated = []
//       this.transaction.updated.push({
//         collectionName: args.datasource.collectionModel.collection.name,
//         keyName: args.datasource.keyName,
//         keyValue: args.options.data[args.datasource.keyName],
//         oldValue: oldData?.payload[0],
//         newValue: args.options.data,
//         ds: args.datasource,
//       })

//       await this.transactionDs.update({
//         data: this.transaction
//       })
//     }
//   }

//   async remove<T>(args: {
//     options: IMongooseDeleteOptions<T> | IDbDeleteByKeyOptions<any>,
//     datasource: MongooseDataSource<T>,
//   }) {
//     let oldData = await args.datasource.read({
//       where: (args.options as IDbDeleteOptions).where || {
//         [args.datasource.keyName]: (args.options as IDbDeleteByKeyOptions<any>).key
//       }
//     })

//     if (oldData?.payload?.length) {
//       if (!this.transaction.deleted) this.transaction.deleted = []
//       for (const item of oldData.payload) {
//         this.transaction.deleted.push({
//           collectionName: args.datasource.collectionModel.collection.name,
//           keyName: args.datasource.keyName,
//           keyValue: item[args.datasource.keyName],
//           oldValue: oldData,
//           ds: args.datasource,
//         })
//       }

//       await this.transactionDs.update({
//         data: this.transaction
//       })
//     }
//   }

//   start() {

//   }

//   async commit() {
//     try {
//       if (this.transaction.created?.length)
//         for (let item of this.transaction.created) {
//           await item.ds.create({
//             data: item.data
//           })
//         }

//       if (this.transaction.updated?.length)
//         for (let item of this.transaction.updated) {
//           item.ds.update({
//             data: item.newValue
//           })
//         }

//       if (this.transaction.deleted?.length) {
//         for (let item of this.transaction.deleted) {
//           item.ds.delete({
//             key: item.keyValue
//           })
//         }
//       }

//       this.transactionDs.update({
//         data: {
//           ...this.transaction,
//           status: MongooseTransactionStatus.commited
//         }
//       })
//     } catch (error) {
//       this.rollback()
//     }
//   }

//   async rollback() {
//     if (this.transaction.created?.length) {
//       for (let item of this.transaction.created) {
//         const model = this.connection.model(item.collectionName, this.emptySchema, item.collectionName)
//         await model.deleteOne({
//           [item.keyName]: [item.keyValue]
//         })
//       }
//     }

//     if (this.transaction.updated?.length) {
//       for (let item of this.transaction.updated) {
//         const model = this.connection.model(item.collectionName, this.emptySchema, item.collectionName)
//         await model.updateOne({
//           [item.keyName]: item.keyValue
//         } as FilterQuery<any>, item.oldValue as mongoose.UpdateQuery<any>, { new: true })
//       }
//     }

//     if (this.transaction.deleted?.length) {
//       for (let item of this.transaction.deleted) {
//         const model =  this.connection.model(item.collectionName, this.emptySchema, item.collectionName)
//         const doc = new model(item.oldValue)
//         await doc.save()
//       }
//     }

//     this.transactionDs.update({
//       data: {
//         ...this.transaction,
//         status: MongooseTransactionStatus.rolledback
//       }
//     })
//   }
// }
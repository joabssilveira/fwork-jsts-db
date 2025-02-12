import { CommonUtils } from "fwork-jsts-common"
import {
  DbRelationType, DbRelationTypeBelongsTo, DbRelationTypeHasMany, DbRelationTypeHasOne, IDbBulkCreateOptions, IDbClientDataSource, IDbConnection, IDbCreateOptions,
  IDbDeleteByKeyOptions, IDbDeleteOptions, IDbGetOptions, IDbGetResult, IDbRelation, IDbRelationBelongsTo, IDbRelationHasMany, IDbRelationHasOne,
  IDbTransaction, IDbUpdateOptions
} from './dbClient'
import { DbConnectionMongoose, IMongooseDeleteOptions, IMongooseGetOptions, MongooseDataSource, MongooseUtils } from './mongoose'
import { IRedisDataSource, IRedisDeleteOptions, IRedisGetOptions, RedisConnection, RedisDataSource, RedisSearchDocumentResult, RedisSearchResult, RedisWhere } from './redis'
import {
  CascadeOptions, ISequelizeSettings, SequelizeEnv, SequelizeGetIncludeWhereResult, SequelizeIncludeResult, SequelizeIndexOptionField, 
  DbConnectionSequelize, ISequelizeBulkCreateOptions, ISequelizeCreateOptions, ISequelizeCrudOptions, ISequelizeDeleteByKeyOptions, ISequelizeDeleteOptions,
  ISequelizeGetOptions, ISequelizeRelationBelongsTo, ISequelizeRelationHasMany, ISequelizeRelationHasOne, ISequelizeUpdateOptions, SequelizeDataSource, SequelizeTransaction, SequelizeUtils,
} from './sequelize'

export enum DataSourceTypes {
  sequelize = 0,
  mongoose = 1,
  redis = 3,
}

export class DataSourceUtils {
  // options.str: string = `
  //   legalPersons {
  //     systemOrganization {
  //       usersGroups {
  //         users
  //       }
  //     },
  //     users
  //   }
  // `
  // returns: string[] = [
  //    "legalPersons",
  //    "legalPersons.systemOrganization",
  //    "legalPersons.systemOrganization.usersGroups",
  //    "legalPersons.systemOrganization.usersGroups.users",
  //    "legalPersons.users"
  // ]
  static parseGraphQLPropertiesToTree = (options: {
    str: string
  }): string[] => {
    const result: string[] = []

    // let tmpStr = options.str.replace(/(\r\n|\n|\r)/gm, "")
    // \r = Carriage Return (CR, \r, on older Macs)
    // \n = Line Feed (LF, \n, on Unices incl. Linux)
    // \r\n = CR followed by LF (\r\n, on WinDOS)
    // \u000d = unicode Carriage Return (CR, \r, on older Macs)
    // \u000a = unicode Line Feed (LF, \n, on Unices incl. Linux)
    // \u000d\u000a = unicode CR followed by LF (\r\n, on WinDOS)
    // \s = white space

    let tmpStr = options.str
      .replace(/\r?\n|\r/g, '')
      .replace(/\u000d?\u000a|\u000d/g, '')
      .replace(/\u2028|\u2029/g, '')
      .replace(/\s/g, '')

    let lastComma
    let startBraceCount = 0
    let firstStartBraceIdx
    let endBraceCount = 0
    let lastItem: string | undefined
    for (let i = 0; i < tmpStr.length; i++) {
      const letter = tmpStr[i]

      if (letter == ',') {
        if (startBraceCount == 0) {
          let item = tmpStr.substring(lastComma ? lastComma + 1 : 0, i)

          if (item[0] == '{') {
            item = item.substring(1)
            item = item.substring(0, item.length - 1)
            const a = DataSourceUtils.parseGraphQLPropertiesToTree({
              str: item,
            }).map(i => (lastItem ? lastItem + '.' : '') + i)

            result.push(...a)
          }
          else {
            if (!CommonUtils.isNullOrEmpty(item)) {
              result.push(item)
              lastItem = item
            }
          }
        }

        lastComma = i
      }
      else if (letter == '{') {
        if (startBraceCount == 0) {
          firstStartBraceIdx = i
          const item = tmpStr.substring(lastComma ? lastComma + 1 : 0, firstStartBraceIdx)

          if (!CommonUtils.isNullOrEmpty(item)) {
            result.push(item)
            lastItem = item
          }
        }
        startBraceCount++
      }
      else if (letter == '}') {
        endBraceCount++
        if (endBraceCount == startBraceCount) {
          lastComma = (firstStartBraceIdx || 0) - 1
          firstStartBraceIdx = null
          startBraceCount = 0
          endBraceCount = 0
        }
      }

      if (i == tmpStr.length - 1) {
        let item = tmpStr.substring(lastComma ? lastComma + 1 : 0, i + 1)
        lastComma = i

        if (item[0] == '{') {
          item = item.substring(1)
          item = item.substring(0, item.length - 1)
          const a = DataSourceUtils.parseGraphQLPropertiesToTree({
            str: item,
          }).map(i => (lastItem ? lastItem + '.' : '') + i)

          result.push(...a)
        }
        else {
          if (!CommonUtils.isNullOrEmpty(item)) {
            result.push(item)
            lastItem = item
          }
        }
      }
    }

    return result
  }

  static nestedIn = (
    nestedName: string,
    nestedList: string | string[] | undefined,
  ): boolean => {
    if (!nestedList) return false

    if (typeof nestedList == 'string') {
      nestedList = DataSourceUtils.parseGraphQLPropertiesToTree({
        str: nestedList
      })
    }

    return nestedList.indexOf(nestedName) != -1
  }

  static nestedListIn = (
    nestedNames: string[],
    nestedList: string | string[] | undefined,
  ): boolean => {
    for (var nestedName of nestedNames) {
      return DataSourceUtils.nestedIn(nestedName, nestedList)
    }

    return false
  }
}

export {
  CommonUtils,

  // DBCLIENT
  DbRelationType, DbRelationTypeBelongsTo, DbRelationTypeHasMany, DbRelationTypeHasOne, IDbBulkCreateOptions, IDbClientDataSource, IDbConnection, IDbCreateOptions,
  IDbDeleteByKeyOptions, IDbDeleteOptions, IDbGetOptions, IDbGetResult, IDbRelation, IDbRelationBelongsTo, IDbRelationHasMany, IDbRelationHasOne,
  IDbTransaction, IDbUpdateOptions,

  // MONGOOSE
  DbConnectionMongoose, IMongooseDeleteOptions, IMongooseGetOptions, MongooseDataSource, MongooseUtils,

  // REDIS
  IRedisDataSource, IRedisDeleteOptions, IRedisGetOptions, RedisConnection, RedisDataSource, RedisSearchDocumentResult, RedisSearchResult, RedisWhere,

  // SEQUELIZE
  CascadeOptions, ISequelizeSettings, SequelizeEnv, SequelizeGetIncludeWhereResult, SequelizeIncludeResult, SequelizeIndexOptionField, 
  DbConnectionSequelize, ISequelizeBulkCreateOptions, ISequelizeCreateOptions, ISequelizeCrudOptions, ISequelizeDeleteByKeyOptions, ISequelizeDeleteOptions,
  ISequelizeGetOptions, ISequelizeRelationBelongsTo, ISequelizeRelationHasMany, ISequelizeRelationHasOne, ISequelizeUpdateOptions, SequelizeDataSource, SequelizeTransaction, SequelizeUtils,
}

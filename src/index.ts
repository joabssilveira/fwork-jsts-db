import { CommonUtils } from "fwork-jsts-common"

export enum DataSourceTypes {
  sequelize = 0,
  mongoose = 1,
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
    let lastEndBranceIdx
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
            // console.log(`item from array: ${a}`)
          }
          else {
            if (!CommonUtils.isNullOrEmpty(item)) {
              result.push(item)
              lastItem = item
            } 
            
            // console.log(`item from last comma: ${lastItem}`)
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
          
          // console.log(`item from open brace: ${lastItem}`)
        }
        startBraceCount++
      }
      else if (letter == '}') {
        endBraceCount++
        if (endBraceCount == startBraceCount) {
          lastEndBranceIdx = i
          const item = tmpStr.substring((firstStartBraceIdx || 0), lastEndBranceIdx + 1)

          lastComma = (firstStartBraceIdx || 0) - 1
          firstStartBraceIdx = null
          startBraceCount = 0
          lastEndBranceIdx = null
          endBraceCount = 0

          // console.log(`item from close brace (not in array): ${item}`)
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
          // console.log(`item from array: ${a}`)
        }
        else {
          if (!CommonUtils.isNullOrEmpty(item)) {
            result.push(item)
            lastItem = item
          } 
          
          // console.log(`last item: ${item}`)
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
      return this.nestedIn(nestedName, nestedList)
    }

    return false
  }
}

// SEARCH OPTIONS

export const whereLogicalOperators = ['$and', '$nand', '$or', '$xor', '$not']
export const whereComparisonOperators = ['$gt', '$ge', '$lt', '$le', '$eq', '$ne', '$in', '$nin']

export class WhereComparison {
  prop: string
  value: any

  constructor(prop: string, value: any) {
    this.prop = prop
    this.value = value
  }

  static isSearchComparisonOptions(obj: any): boolean {
    return obj['prop'] && obj['value']
  }
}

export interface IWhereOptions<T> {
  $gt?: WhereComparison | Partial<T> | undefined,
  $ge?: WhereComparison | Partial<T> | undefined,
  $lt?: WhereComparison | Partial<T> | undefined,
  $le?: WhereComparison | Partial<T> | undefined,
  $eq?: WhereComparison | Partial<T> | undefined, // REDIS
  $ne?: WhereComparison | Partial<T> | undefined, // REDIS
  $in?: WhereComparison | Partial<T> | undefined,
  $nin?: WhereComparison | Partial<T> | undefined,

  $and?: (IWhereOptions<T> | Partial<T> | WhereComparison)[] | undefined // REDIS
  $nand?: (IWhereOptions<T> | Partial<T> | WhereComparison)[] | undefined
  $or?: (IWhereOptions<T> | Partial<T> | WhereComparison)[] | undefined // REDIS
  $xor?: (IWhereOptions<T> | Partial<T> | WhereComparison)[] | undefined
  $not?: (IWhereOptions<T> | Partial<T> | WhereComparison)[] | undefined
}

export abstract class Where<T> {
  getWhere(options: IWhereOptions<T> | T) { }
}

export class MongoDbWhere<T> extends Where<T> {

}
export class SqlWhere<T> extends Where<T> {

}
export class NWhere<T> extends Where<T> {

}
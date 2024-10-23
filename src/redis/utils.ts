// import { IWhereOptions, Where, WhereComparison } from "..";

export class RedisWhereComparison {
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

export interface IRedisWhereOptions<T> {
  $gt?: RedisWhereComparison | Partial<T> | undefined,
  $ge?: RedisWhereComparison | Partial<T> | undefined,
  $lt?: RedisWhereComparison | Partial<T> | undefined,
  $le?: RedisWhereComparison | Partial<T> | undefined,
  $eq?: RedisWhereComparison | Partial<T> | undefined, // REDIS
  $ne?: RedisWhereComparison | Partial<T> | undefined, // REDIS
  $in?: RedisWhereComparison | Partial<T> | undefined,
  $nin?: RedisWhereComparison | Partial<T> | undefined,

  $and?: (IRedisWhereOptions<T> | Partial<T> | RedisWhereComparison)[] | undefined // REDIS
  $nand?: (IRedisWhereOptions<T> | Partial<T> | RedisWhereComparison)[] | undefined
  $or?: (IRedisWhereOptions<T> | Partial<T> | RedisWhereComparison)[] | undefined // REDIS
  $xor?: (IRedisWhereOptions<T> | Partial<T> | RedisWhereComparison)[] | undefined
  $not?: (IRedisWhereOptions<T> | Partial<T> | RedisWhereComparison)[] | undefined
}

type RedisComparisonOps = '$eq' | '$ne' | '$in' | '$nin' | '$bt' | '$ge' | '$gt' | '$le' | '$lt'
type RedisLogicalOps = '$and' | '$nand' | '$or' | '$xor' | '$not'
const redisComparisonOps = ['$eq', '$ne', '$in', '$nin', '$bt', '$ge', '$gt', '$le', '$lt']
const redisLogicalOps = ['$and', '$nand', '$or', '$xor', '$not']

export interface RedisSearchDocumentResult<T> {
  id: string,
  value: T
}

export interface RedisSearchResult<T> {
  total: number,
  documents: RedisSearchDocumentResult<T>[]
}

// export class RedisWhere<T> extends Where<T> {
export class RedisWhere<T> {
  redisReplace(value: string) {
    const replacements: any = {
      ',': '\\,',
      '.': '\\.',
      '<': '\\<',
      '>': '\\>',
      '{': '\\{',
      '}': '\\}',
      '[': '\\[',
      ']': '\\]',
      '"': '\\"',
      "'": "\\'",
      ':': '\\:',
      ';': '\\;',
      '!': '\\!',
      '@': '\\@',
      '#': '\\#',
      '$': '\\$',
      '%': '\\%',
      '^': '\\^',
      '&': '\\&',
      '': '\\',
      '(': '\\(',
      ')': '\\)',
      '-': '\\-',
      '+': '\\+',
      '=': '\\=',
    }

    const newValue = value.replace(/,|\.|<|>|\{|\}|\[|\]|"|'|:|;|!|@|#|\$|%|\^|&|\*|\(|\)|-|\+|=|~/g, function (x) {
      return replacements[x]
    })
    return newValue
  }

  searchLogicalOpOverride = [
    { key: '$and', op: '&&', },
    { key: '$nand', op: '$nand', },
    { key: '$or', op: '|', },
    { key: '$xor', op: '$xor', },
    { key: '$not', op: '$not', },
  ]

  // searchComparisonOpOverride = [
  //   { key: '$gt', op: ' $gt ', },
  //   { key: '$ge', op: ' $ge ', },
  //   { key: '$lt', op: ' $lt ', },
  //   { key: '$le', op: ' $le ', },
  //   { key: '$eq', op: ':', },
  //   { key: '$ne', op: ' $ne ', },
  //   { key: '$in', op: ' $in ', },
  //   { key: '$nin', op: ' $nin ', },
  // ]

  getPropValue(args: {
    comparisonOp: RedisComparisonOps,
    value: any,
  }) {
    if (args.comparisonOp == '$eq') {
      if (typeof args.value === 'number')
        args.value = `[${args.value} ${args.value}]`
      else if (typeof args.value == 'string')
        args.value = `{${this.redisReplace(args.value)}}`
    }
    else if (args.comparisonOp == '$ne') {
      if (typeof args.value === 'number')
        args.value = `[${args.value} ${args.value}]`
    }
    else if (args.comparisonOp == '$in') {
      // TODO-joab separar por pipe
      if (Array.isArray(args.value))
        args.value = `(${args.value})`
      else
        throw Error(`Operador não permitido para o tipo de dado (op: ${args.comparisonOp}, value: ${args.value})`)
    }
    else if (args.comparisonOp == '$nin') {
      // TODO-joab separar por pipe
      if (Array.isArray(args.value))
        args.value = `(${args.value})`
      else
        throw Error(`Operador não permitido para o tipo de dado (op: ${args.comparisonOp}, value: ${args.value})`)
    }
    else if (args.comparisonOp == '$bt') {
      // TODO-joab separar espaço
      if (Array.isArray(args.value)) {
        args.value = `[${args.value}]`
      }
      else
        throw Error(`Operador não permitido para o tipo de dado (op: ${args.comparisonOp}, value: ${args.value})`)
    }
    else if (args.comparisonOp == '$ge') {
      if (typeof args.value == 'number')
        args.value = `[${args.value} +inf]`
      else
        throw Error(`Operador não permitido para o tipo de dado (op: ${args.comparisonOp}, value: ${args.value})`)
    }
    else if (args.comparisonOp == '$gt') {
      if (typeof args.value == 'number')
        args.value = `[(${args.value} +inf]`
      else
        throw Error(`Operador não permitido para o tipo de dado (op: ${args.comparisonOp}, value: ${args.value})`)
    }
    else if (args.comparisonOp == '$le') {
      if (typeof args.value === 'number')
        args.value = `[-inf ${args.value}]`
      else
        throw Error(`Operador não permitido para o tipo de dado (op: ${args.comparisonOp}, value: ${args.value})`)
    }
    else if (args.comparisonOp == '$lt') {
      if (typeof args.value == 'number')
        args.value = `[-inf (${args.value}]`
      else
        throw Error(`Operador não permitido para o tipo de dado (op: ${args.comparisonOp}, value: ${args.value})`)
    }

    return args.value
  }

  getExpression(args: {
    propName: string,
    comparisonOp: RedisComparisonOps,
    value: any,
  }) {
    var result: string = ''

    if (args.comparisonOp == '$eq') {
      result = `@${args.propName}:${this.getPropValue({ comparisonOp: args.comparisonOp, value: args.value })}`
    }
    else if (args.comparisonOp == '$ne') {
      result = `-@${args.propName}:${this.getPropValue({ comparisonOp: args.comparisonOp, value: args.value })}`
    }
    else if (args.comparisonOp == '$in') {
      result = `@${args.propName}:${this.getPropValue({ comparisonOp: args.comparisonOp, value: args.value })}`
    }
    else if (args.comparisonOp == '$nin') {
      result = `-@${args.propName}:${this.getPropValue({ comparisonOp: args.comparisonOp, value: args.value })}`
    }
    else if (args.comparisonOp == '$bt') {
      result = `@${args.propName}:${this.getPropValue({ comparisonOp: args.comparisonOp, value: args.value })}`
    }
    else if (args.comparisonOp == '$ge') {
      result = `@${args.propName}:${this.getPropValue({ comparisonOp: args.comparisonOp, value: args.value })}`
    }
    else if (args.comparisonOp == '$gt') {
      result = `@${args.propName}:${this.getPropValue({ comparisonOp: args.comparisonOp, value: args.value })}`
    }
    else if (args.comparisonOp == '$le') {
      result = `@${args.propName}:${this.getPropValue({ comparisonOp: args.comparisonOp, value: args.value })}`
    }
    else if (args.comparisonOp == '$lt') {
      result = `@${args.propName}:${this.getPropValue({ comparisonOp: args.comparisonOp, value: args.value })}`
    }

    return result
  }

  internalGetWhere(options: any, prevResult?: string, logicalOp?: RedisLogicalOps, comparisonOp?: RedisComparisonOps) {
    let result: string = prevResult || ''
    const propsNames = Object.getOwnPropertyNames(options)

    // LOOP PROPS NAMES
    for (var pnIdx = 0; pnIdx < propsNames.length; pnIdx++) {
      if (pnIdx > 0) {
        result = result + ' ' + (logicalOp || '&&') + ' '
      }

      const propName = propsNames[pnIdx]
      const propValue = options[propName]

      // LOGICAL OP
      if (redisLogicalOps.indexOf(propName) != -1) {
        const prevLogicalOp = logicalOp
        logicalOp = ((this.searchLogicalOpOverride.filter(i => i.key === propName)[0].op) as RedisLogicalOps)

        // LOOP PROP VALUE ITEMS
        for (var pvaiIdx = 0; pvaiIdx < (propValue as Array<any>).length; pvaiIdx++) {
          if (pvaiIdx > 0) {
            result = result + ' ' + (logicalOp || '&&') + ' '
          }

          const propValueArrayItem = (propValue as Array<any>)[pvaiIdx]
          result = result + `(${this.internalGetWhere(propValueArrayItem, undefined, undefined, comparisonOp)})`
        }
        logicalOp = prevLogicalOp
      }
      // COMPARISON OP
      else if (redisComparisonOps.indexOf(propName) != -1) {
        let tmp = propValue
        if (RedisWhereComparison.isSearchComparisonOptions(propValue)) {
          tmp = {
            [propValue['prop']]: [propValue['value']]
          }
        }
        result = this.internalGetWhere(tmp, result, logicalOp, (propName as RedisComparisonOps))
      }
      // OBJECT VALUE
      else {
        result += this.getExpression({
          propName,
          comparisonOp: comparisonOp || '$eq',
          value: propValue
        })
      }
    }
    return result
  }

  getWhere(options: IRedisWhereOptions<T> | Partial<T>) {
    return this.internalGetWhere(options)
  }
}

export class RedisUtils {
  static convertBooleansToIntegers(obj: any): any {
    return obj

    if (typeof obj === 'object') {
      if (Array.isArray(obj)) {
        return obj.map(RedisUtils.convertBooleansToIntegers)
      } else {
        const newObj: any = {};
        for (const key in obj) {
          if (obj.hasOwnProperty)
            if (obj.hasOwnProperty(key)) {
              newObj[key] = RedisUtils.convertBooleansToIntegers(obj[key]);
            }
        }
        return newObj;
      }
    } else if (typeof obj === 'boolean') {
      return obj ? 1 : 0;
    } else {
      return obj;
    }
  }
}
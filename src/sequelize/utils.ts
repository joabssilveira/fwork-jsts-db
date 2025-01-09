import { FindAttributeOptions, Includeable, ModelDefined, Op, WhereOptions } from "sequelize";
import { Fn, Literal } from "sequelize/types/utils";
import { DataSourceUtils } from "..";
import { ISequelizeRelationBelongsTo, ISequelizeRelationHasMany, ISequelizeRelationHasOne } from "./relations";

const mongooseToSequelizeOperators: Record<string, symbol> = {
  $eq: Op.eq,
  $gt: Op.gt,
  $gte: Op.gte,
  $in: Op.in,
  $lt: Op.lt,
  $lte: Op.lte,
  $ne: Op.ne,
  $nin: Op.notIn,
  $not: Op.not,
  $exists: Op.not,
  $regex: Op.regexp,

  $and: Op.and,
  $or: Op.or,
};

export type SequelizeIndexOptionField<T> = (keyof T | Fn | Literal | {
  name: keyof T;
  length?: number;
  order?: "ASC" | "DESC";
  collate?: string;
  operator?: string;
})

export type SequelizeGetIncludeWhereResult = {
  includeWhere: WhereOptions | undefined
  updatedWhere: WhereOptions | undefined,
}

export type SequelizeIncludeResult = {
  includes: Includeable[] | undefined,
  updatedWhere: WhereOptions | undefined
}

export type CascadeOptions = 'CASCADE' | 'RESTRICT' | 'SET NULL' | 'NO ACTION'

export class SequelizeUtils {
  static getAttributes = (args: {
    selectedFields?: string | string[],
    excludedFields?: string | string[],
  }) => {
    let _selectedFields: string[] | undefined = typeof args.selectedFields === 'string' ? (args.selectedFields.indexOf(',') != -1 ?
      args.selectedFields.split(',') : [args.selectedFields]) : args.selectedFields as string[]
    let _excludedFields: string[] | undefined = typeof args.excludedFields === 'string' ? (args.excludedFields.indexOf(',') != -1 ?
      args.excludedFields.split(',') : [args.excludedFields]) : args.excludedFields as string[]

    let attributes: FindAttributeOptions | undefined
    if (_selectedFields)
      attributes = _selectedFields.filter(s => _excludedFields?.length ? _excludedFields.indexOf(s) < 0 : true)
    else if (_excludedFields)
      attributes = {
        exclude: _excludedFields
      }

    return attributes
  }

  // associations

  static createBelongsToAssociation<
    SourceType extends object,
    TargetType extends object
  >(
    sourceModel: ModelDefined<SourceType, any>,
    targetModel: ModelDefined<TargetType, any>,
    options: {
      as: keyof SourceType;
      foreignKey: keyof SourceType;
      targetKey: keyof TargetType;
      onDelete: CascadeOptions;
      onUpdate: CascadeOptions;
    }
  ) {
    sourceModel.belongsTo(targetModel, {
      ...options as any,
    });
  }

  static createHasManyAssociation<
    SourceType extends object,
    TargetType extends object
  >(
    sourceModel: ModelDefined<SourceType, any>,
    targetModel: ModelDefined<TargetType, any>,
    options: {
      as: keyof SourceType;
      foreignKey: keyof TargetType;
      sourceKey: keyof SourceType;
      onDelete: CascadeOptions;
      onUpdate: CascadeOptions;
    }
  ) {
    sourceModel.hasMany(targetModel, {
      ...options as any,
    });
  }

  static createHasOneAssociation<
    SourceType extends object,
    TargetType extends object
  >(
    sourceModel: ModelDefined<SourceType, any>,
    targetModel: ModelDefined<TargetType, any>,
    options: {
      as: keyof SourceType;
      foreignKey: keyof TargetType;
      sourceKey: keyof SourceType;
      onDelete: CascadeOptions;
      onUpdate: CascadeOptions;
    }
  ) {
    sourceModel.hasOne(targetModel, {
      ...options as any,
    });
  }

  static createBelongsToManyAssociation<
    SourceType extends object,
    TargetType extends object
  >(
    sourceModel: ModelDefined<SourceType, any>,
    targetModel: ModelDefined<TargetType, any>,
    options: {
      as: keyof SourceType;
      foreignKey: keyof SourceType;
      otherKey: keyof TargetType;
      through: string | ModelDefined<any, any>;
      onDelete: CascadeOptions;
      onUpdate: CascadeOptions;
    }
  ) {
    sourceModel.belongsToMany(targetModel, {
      ...options as any,
    });
  }

  // indexes

  static getIndexOptionField<T>(options: SequelizeIndexOptionField<T>): SequelizeIndexOptionField<T> {
    return options
  }

  // 

  static whereToWhereOptions<T>(where: Record<string, any>, regexAsLike: boolean): WhereOptions<T> {
    const whereOptions: any = {};

    for (const key in where) {
      const value = where[key];

      // Verifica se é um operador lógico ($and, $or, etc.)
      if (mongooseToSequelizeOperators[key]) {
        (whereOptions as any)[mongooseToSequelizeOperators[key]] = value.map((v: any) =>
          SequelizeUtils.whereToWhereOptions<T>(v, regexAsLike)
        );
      }
      // Se for uma consulta direta com operadores ($gt, $lt, $regex, etc.)
      else if (typeof value === 'object' && !Array.isArray(value)) {
        whereOptions[key] = {};
        for (const operator in value) {
          if (mongooseToSequelizeOperators[operator]) {
            if (operator === '$regex') {
              // Tratamento especial para $regex
              const regexValue = value[operator];
              if (typeof regexValue === 'string') {
                // Aqui usamos Op.iRegexp para correspondência case-insensitive, caso necessário
                (whereOptions[key] as any)[regexAsLike ? Op.like : Op.regexp] = regexAsLike ? `%${regexValue}%` : regexValue;
              } else if (regexValue instanceof RegExp) {
                // Se for uma instância de RegExp, também podemos usá-la diretamente
                (whereOptions[key] as any)[regexAsLike ? Op.like : Op.regexp] = regexAsLike ? `%${regexValue.source}%` : regexValue.source;
              }
            } else {
              // Tratamento normal dos outros operadores
              (whereOptions[key] as any)[mongooseToSequelizeOperators[operator]] = value[operator];
            }
          }
        }
      }
      // Igualdade simples
      else {
        whereOptions[key] = value;
      }
    }

    return whereOptions;
  }

  static getIncludeFromRelationType<T>(options: {
    nested?: string,
    dsCollection: string,
    previousRelationAs?: string,
    where?: WhereOptions<T>,
    // 
    relations: ISequelizeRelationBelongsTo<any, any>[] | ISequelizeRelationHasMany<any, any>[] | ISequelizeRelationHasOne<any, any>[],
  }): SequelizeIncludeResult {
    let result: SequelizeIncludeResult = {
      includes: undefined,
      updatedWhere: SequelizeUtils.deepCloneWithSymbols(options.where),
    }

    for (const relation of options.relations) {
      if (relation.collection == options.dsCollection) continue

      const relationAs = (options.previousRelationAs ? options.previousRelationAs + '.' : '') + (relation.as as any)
      if (DataSourceUtils.nestedIn(relationAs, options?.nested)) {
        if (!result.includes) result.includes = []

        let getIncludeWhereResult: SequelizeGetIncludeWhereResult | undefined
        if (result.updatedWhere)
          getIncludeWhereResult = SequelizeUtils.getIncludeWhere(relationAs, result.updatedWhere)

        result.updatedWhere = getIncludeWhereResult?.updatedWhere

        let includeRelation: Includeable = {
          model: relation.modelDefined,
          as: relation.as as any,
          where: getIncludeWhereResult?.includeWhere
        }

        const relationDs = relation.dataSourceBuilder()

        if (relationDs.belongsTo?.length || relationDs.hasMany?.length || relationDs.hasOne?.length) {
          const getIncludeResult = SequelizeUtils.getInclude({
            nested: options.nested,
            dsCollection: (relationDs as any).collectionModel.tableName,
            belongsTo: relationDs.belongsTo,
            hasMany: relationDs.hasMany,
            hasOne: relationDs.hasOne,
            previousRelationAs: relationAs,
            where: result.updatedWhere
          })

          if (getIncludeResult?.includes?.length)
            for (let include of getIncludeResult.includes) {
              if (!includeRelation.include) includeRelation.include = []
              includeRelation.include.push(include)
            }
          result.updatedWhere = getIncludeResult?.updatedWhere
        }

        result.includes.push(includeRelation)
      }
    }

    return result
  }

  static getInclude<T>(options: {
    nested?: string,
    dsCollection: string,
    previousRelationAs?: string,
    where?: WhereOptions<T>,
    // 
    belongsTo?: ISequelizeRelationBelongsTo<any, any>[] | undefined,
    hasMany?: ISequelizeRelationHasMany<any, any>[] | undefined,
    hasOne?: ISequelizeRelationHasOne<any, any>[] | undefined,
  }): SequelizeIncludeResult | undefined {
    let result: SequelizeIncludeResult = {
      includes: undefined,
      updatedWhere: SequelizeUtils.deepCloneWithSymbols(options.where),
    }

    if (!options?.nested) return result

    if (options.belongsTo?.length) {
      const getInclude2Result = SequelizeUtils.getIncludeFromRelationType({
        nested: options.nested,
        dsCollection: options.dsCollection,
        relations: options.belongsTo,
        previousRelationAs: options.previousRelationAs,
        where: result.updatedWhere
      })
      if (getInclude2Result?.includes?.length) {
        if (!result.includes) result.includes = []
        result?.includes.push(...getInclude2Result.includes)
      }
      result.updatedWhere = getInclude2Result.updatedWhere
    }

    if (options.hasMany?.length) {
      const getInclude2Result = SequelizeUtils.getIncludeFromRelationType({
        nested: options.nested,
        dsCollection: options.dsCollection,
        relations: options.hasMany,
        previousRelationAs: options.previousRelationAs,
        where: result.updatedWhere
      })
      if (getInclude2Result?.includes?.length) {
        if (!result.includes) result.includes = []
        result?.includes.push(...getInclude2Result.includes)
      }
      result.updatedWhere = getInclude2Result.updatedWhere
    }

    if (options.hasOne?.length) {
      const getInclude2Result = SequelizeUtils.getIncludeFromRelationType({
        nested: options.nested,
        dsCollection: options.dsCollection,
        relations: options.hasOne,
        previousRelationAs: options.previousRelationAs,
        where: result.updatedWhere
      })
      if (getInclude2Result?.includes?.length) {
        if (!result.includes) result.includes = []
        result?.includes.push(...getInclude2Result.includes)
      }
      result.updatedWhere = getInclude2Result.updatedWhere
    }

    return result
  }

  static addDollarToNestedFields_Bkp_FuncionandoSemOsSymbols(whereOptions: WhereOptions): WhereOptions {
    if (Array.isArray(whereOptions)) {
      // Se for um array (ex: [Op.or]), processa cada elemento recursivamente
      return whereOptions.map(SequelizeUtils.addDollarToNestedFields) as WhereOptions;
    } else if (typeof whereOptions === 'object' && whereOptions !== null) {
      let entries = Object.entries(whereOptions)
      for (const [key, value] of entries) {
        if (key.includes('.') && !key.startsWith('$') && !key.endsWith('$')) {
          (whereOptions as any)[`$${key}$`] = SequelizeUtils.addDollarToNestedFields(value as WhereOptions);
          delete (whereOptions as any)[key]
        } else {
          (whereOptions as any)[key] = SequelizeUtils.addDollarToNestedFields(value as WhereOptions);
        }
      }
    }

    // Se for um valor primitivo (número, string, booleano, etc.), retorna diretamente
    return whereOptions;
  }

  static addDollarToNestedFields(whereOptions: WhereOptions): WhereOptions {
    if (Array.isArray(whereOptions)) {
      // Se for um array (ex: [Op.or]), processa cada elemento recursivamente
      return whereOptions.map(SequelizeUtils.addDollarToNestedFields) as WhereOptions;
    } else if (typeof whereOptions === 'object' && whereOptions !== null) {
      let entries = Object.entries(whereOptions);
      for (const [key, value] of entries) {
        if (key.includes('.') && !key.startsWith('$') && !key.endsWith('$')) {
          // Adiciona $ no início e no fim da chave, se não tiver
          (whereOptions as any)[`$${key}$`] = SequelizeUtils.addDollarToNestedFields(value as WhereOptions);
          delete (whereOptions as any)[key];
        } else {
          (whereOptions as any)[key] = SequelizeUtils.addDollarToNestedFields(value as WhereOptions);
        }
      }

      // Processa também os símbolos de operadores (como Op.and, Op.or, etc.)
      const symbols = Object.getOwnPropertySymbols(whereOptions);
      for (const symbol of symbols) {
        const symbolValue = (whereOptions as any)[symbol];
        if (Array.isArray(symbolValue)) {
          // Se o valor do símbolo for um array, mapeia cada elemento recursivamente
          (whereOptions as any)[symbol] = symbolValue.map(SequelizeUtils.addDollarToNestedFields);
        } else if (typeof symbolValue === 'object' && symbolValue !== null) {
          // Se o valor do símbolo for um objeto, processa recursivamente
          (whereOptions as any)[symbol] = SequelizeUtils.addDollarToNestedFields(symbolValue as WhereOptions);
        }
      }
    }

    // Retorna whereOptions diretamente se for um valor primitivo
    return whereOptions;
  }

  // 

  static compareUntilPenultimate(stra: string, strb: string): boolean {
    const partsA = stra.split('.');
    const partsB = strb.split('.');

    // `stra` deve ter um comprimento exato de `strb - 1` para coincidir até a penúltima parte de `strb`
    if (partsA.length !== partsB.length - 1) {
      return false;
    }

    // Compara cada parte de `stra` com a correspondente em `strb`, até a penúltima posição de `strb`
    for (let i = 0; i < partsA.length; i++) {
      if (partsA[i] !== partsB[i]) {
        return false;
      }
    }

    return true;
  }

  static compareUntilThirdToLast(stra: string, strb: string): boolean {
    const partsA = stra.split('.');
    const partsB = strb.split('.');

    // `stra` deve ter um comprimento exato de `strb - 1` para coincidir até a penúltima parte de `strb`
    if (partsA.length !== partsB.length - 2) {
      return false;
    }

    // Compara cada parte de `stra` com a correspondente em `strb`, até a penúltima posição de `strb`
    for (let i = 0; i < partsA.length; i++) {
      if (partsA[i] !== partsB[i]) {
        return false;
      }
    }

    return true;
  }

  static deepCloneWithSymbols(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    let clone: any;

    if (Array.isArray(obj)) {
      clone = obj.map(item => SequelizeUtils.deepCloneWithSymbols(item));
    } else {
      clone = {};

      // Copia as propriedades de string
      for (const key of Object.keys(obj)) {
        clone[key] = SequelizeUtils.deepCloneWithSymbols(obj[key]);
      }

      // Copia as propriedades simbólicas (como Op.and, Op.or)
      for (const sym of Object.getOwnPropertySymbols(obj)) {
        clone[sym] = SequelizeUtils.deepCloneWithSymbols(obj[sym]);
      }
    }

    return clone;
  }

  static keysLen(obj: any) {
    if (!obj) return 0;
    const plen = Object.entries(obj).length ?? 0
    const slen = Object.getOwnPropertySymbols(obj).length ?? 0
    return plen + slen
  }

  static getIncludeWhere(relationAs: string, where: WhereOptions): SequelizeGetIncludeWhereResult {
    let result: SequelizeGetIncludeWhereResult = {
      includeWhere: undefined,
      updatedWhere: SequelizeUtils.deepCloneWithSymbols(where),
    }

    if (Array.isArray(where)) {
      const nwArray = []
      const iwArray = []
      for (const item of where) {
        const { updatedWhere: newWhere, includeWhere } = SequelizeUtils.getIncludeWhere(relationAs, item);
        if (newWhere) nwArray.push(newWhere)
        if (includeWhere) iwArray.push(includeWhere)
      }
      return {
        updatedWhere: nwArray as WhereOptions,
        includeWhere: iwArray as WhereOptions
      }
    } else if (typeof result.updatedWhere === 'object' && result.updatedWhere !== null) {
      // check entries
      if (result.updatedWhere)
        for (const [uwEntryKey, uwEntryValue] of Object.entries(result.updatedWhere)) {
          if (uwEntryKey.indexOf('$deep.') != -1 && SequelizeUtils.compareUntilPenultimate(relationAs, uwEntryKey.replaceAll('$deep.', ''))) {
            result.includeWhere = {
              [uwEntryKey.split('.')[uwEntryKey.split('.').length - 1]]: uwEntryValue
            }
            delete (result.updatedWhere as any)[uwEntryKey]
            if (!SequelizeUtils.keysLen(result.updatedWhere))
              result.updatedWhere = undefined
          } else if (uwEntryKey.indexOf('$json.') != -1) {
            const uwEntryKeyParts = uwEntryKey.split('$json.')
            if (uwEntryKeyParts[0].slice(-1) == '.')
              uwEntryKeyParts[0] = uwEntryKeyParts[0].slice(0, -1)

            if (uwEntryKeyParts.length) {
              if (relationAs == uwEntryKeyParts[0]) {
                result.includeWhere = {
                  [uwEntryKeyParts[1]]: uwEntryValue
                }
                delete (result.updatedWhere as any)[uwEntryKey]
                if (!SequelizeUtils.keysLen(result.updatedWhere))
                  result.updatedWhere = undefined
              }
            }
          }
        }

      // check symbols
      if (result.updatedWhere)
        for (const sym of Object.getOwnPropertySymbols(result.updatedWhere)) {
          const { updatedWhere: newWhere, includeWhere } = SequelizeUtils.getIncludeWhere(relationAs, (result.updatedWhere as any)[sym])
          if (newWhere)
            if (Object.keys(newWhere).length)
              result.updatedWhere = {
                ...result.updatedWhere,
                [sym]: newWhere
              }
          if (includeWhere)
            if (Object.keys(includeWhere).length)
              result.includeWhere = {
                ...result.includeWhere,
                [sym]: includeWhere,
              }
        }
    }

    return result
  }
}
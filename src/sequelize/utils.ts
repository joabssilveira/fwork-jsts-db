import { FindAttributeOptions, ModelDefined, Op, WhereOptions } from "sequelize";
import { Fn, Literal } from "sequelize/types/utils";

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
    }
  ) {
    sourceModel.belongsTo(targetModel, options as any);
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
    }
  ) {
    sourceModel.hasMany(targetModel, options as any);
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
    }
  ) {
    sourceModel.hasOne(targetModel, options as any);
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
    }
  ) {
    sourceModel.belongsToMany(targetModel, options as any);
  }

  // indexes

  static getIndexOptionField<T>(options: SequelizeIndexOptionField<T>): SequelizeIndexOptionField<T> {
    return options
  }

  // 

  static whereToWhereOptions<T>(where: Record<string, any>): WhereOptions<T> {
    const whereOptions: any = {};
  
    for (const key in where) {
      const value = where[key];
  
      // Verifica se é um operador lógico ($and, $or, etc.)
      if (mongooseToSequelizeOperators[key]) {
        (whereOptions as any)[mongooseToSequelizeOperators[key]] = value.map((v: any) =>
          SequelizeUtils.whereToWhereOptions<T>(v)
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
                (whereOptions[key] as any)[Op.regexp] = regexValue;
              } else if (regexValue instanceof RegExp) {
                // Se for uma instância de RegExp, também podemos usá-la diretamente
                (whereOptions[key] as any)[Op.regexp] = regexValue.source;
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
}
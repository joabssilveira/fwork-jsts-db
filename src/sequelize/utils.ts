import { FindAttributeOptions, ModelDefined } from "sequelize";
import { Fn, Literal } from "sequelize/types/utils";

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
}
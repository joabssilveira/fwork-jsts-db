import { FindAttributeOptions } from "sequelize"

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
}
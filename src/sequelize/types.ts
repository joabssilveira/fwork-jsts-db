
export type SequelizeTimestampAttributes =
  'created_at' | 'updated_at' | 'deleted_at'

export type WithoutSequelizeTimestamps<T> =
  Omit<T, SequelizeTimestampAttributes>
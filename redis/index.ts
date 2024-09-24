import { RedisConnection } from './connection';
import { IRedisDeleteOptions, IRedisGetOptions } from './crudOptions';
import { IRedisDataSource, RedisDataSource } from './datasource';
import { RedisSearchDocumentResult, RedisSearchResult, RedisWhere } from './utils';

////////////////////////////////////////////

export {
  // CONNECTION
  RedisConnection,
  // CRUD OPTIONS
  IRedisDeleteOptions, IRedisGetOptions,
  // DATASOURCE
  IRedisDataSource, RedisDataSource,
  // UTILS
  RedisSearchDocumentResult, RedisSearchResult, RedisWhere
};


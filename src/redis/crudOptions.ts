import { IDbDeleteOptions, IDbGetOptions } from "../dbClient/crudOptions";
import { IRedisWhereOptions } from "./utils";

export interface IRedisGetOptions<T> extends IDbGetOptions {
  where?: Partial<T> | IRedisWhereOptions<T>
}

export interface IRedisDeleteOptions extends IDbDeleteOptions {
  where: string
}
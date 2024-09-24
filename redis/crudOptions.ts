import { IWhereOptions } from "..";
import { IDbDeleteOptions, IDbGetOptions } from "../dbClient/crudOptions";

export interface IRedisGetOptions<T> extends IDbGetOptions {
  where?: Partial<T> | IWhereOptions<T>
}

export interface IRedisDeleteOptions extends IDbDeleteOptions {
  where: string
}
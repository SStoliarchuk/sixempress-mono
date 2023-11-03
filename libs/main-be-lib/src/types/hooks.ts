import { ObjectId } from "mongodb";
import { MongoDBFetch } from "../utils/dtd";
import { CrudInformation } from "../object-format-controller/db-item/crud-collection";

export {};

declare global {
  interface actions {
    sxmp_on_after_db: (dbInfo: CrudInformation[], additional: {args: any[]}) => void,
  }
  interface filters {
    sxmp_fetch_fallback_model: <T extends object>(models: T[], modelClass: string, params: {ids: ObjectId[], projection?: object, toFetch?: MongoDBFetch[]}) => T[];
  }
}

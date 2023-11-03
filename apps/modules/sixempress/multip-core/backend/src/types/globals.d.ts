import { FetchableField } from "@sixempress/main-be-lib";
import { ObjectId } from "mongodb";

declare global {

  interface filters {
  };

}

declare global {

	type DeepPartial<T> = 
		T extends ObjectId ? ObjectId  :
		T extends Array<infer U> ? Array<U> :
		T extends FetchableField<infer A, infer B> ? FetchableField<A, B> :
		{[P in keyof T]?: DeepPartial<T[P]>};
}

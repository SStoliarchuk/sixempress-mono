import { IDtdTypes, IVerifiableItemDtd } from "./dtd-declarer.dtd";
import { IBaseModel } from "./IBaseModel.dtd";
import { ObjectId } from "mongodb";
import { MongoUtils } from "../utils/mongo-utils";

export class FetchableField<T extends string, A extends IBaseModel = any> {

	public id: string;
	public fetched?: A;

	constructor(
		id: string | ObjectId,
		public modelClass: T,
		fetched?: A,
	) {
		this.id = id.toString();
		if (fetched) { this.fetched = fetched; }
	}


	static getObjDef(modelClass: string): IVerifiableItemDtd<FetchableField<any>> {
		return {
			id: {
				type: [String],
				required: true,
				regExp: MongoUtils.objectIdRegex,
			},
			modelClass: {
				type: [String],
				required: true,
				possibleValues: [modelClass]
			}
		};
	}

	static getFieldSettings(modelClass: string, required: boolean): IDtdTypes<FetchableField<any>> {

		return {
			type: [Object],
			required,
			objDef: [this.getObjDef(modelClass)]
		};

	}

}

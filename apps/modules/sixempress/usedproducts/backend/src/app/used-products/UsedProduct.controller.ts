import { AbstractDbApiItemController, IVerifiableItemDtd, FetchableField, DBSaveOptions, DBSaveOptionsMethods, DBSaveReturnValue } from '@sixempress/main-be-lib';
import { Attribute } from '../../enums/attributes.enum';
import { ModelClass } from '../../enums/model-class.enum';
import { BePaths } from '../../enums/bepaths.enum'
import { UsedProduct } from './UsedProduct';
import { Movement, MovementDirection, MovementMedium } from '@sixempress/be-multi-purpose';
import { MovementController } from '@sixempress/be-multi-purpose';
import moment from 'moment';
import { Request } from 'express';

export class UsedProductController extends AbstractDbApiItemController<UsedProduct> {

	modelClass = ModelClass.UsedProduct as ModelClass.UsedProduct;
	collName = ModelClass.UsedProduct;
	bePath = BePaths.usedproducts;

	Attributes = {
		view: Attribute.viewUsedProducts,
		add: Attribute.addUsedProducts,
		modify: Attribute.modifyUsedProducts,
		delete: Attribute.deleteUsedProducts,
	};

	dtd: IVerifiableItemDtd<UsedProduct> = {
		barcode: { type: [String], required: false, },
		name: { type: [String], required: true, },
		seller: FetchableField.getFieldSettings(ModelClass.Customer, true),
		buyer: FetchableField.getFieldSettings(ModelClass.Customer, false),
		additionalInfo: { type: [Object], required: false, objDef: [{
			imeiNumber: { type: [String], required: false, } 
		}] },
		buyPrice: { type: [Number], required: true, minMaxNumber: [{min: 0}], },
		sellPrice: { type: [Number], required: true, minMaxNumber: [{min: 0}], },
		description: { type: [String], required: false, }
	};

	/**
	 * create parents tree and other stuff
	 */
	protected async executeDbSave<A extends DBSaveOptionsMethods>(
		req: Request, 
		opts: DBSaveOptions<A, UsedProduct>, 
		toSave: A extends 'insert' ? UsedProduct[] : UsedProduct, 
		oldObjInfo:  A extends 'insert' ? undefined : UsedProduct
	): Promise<DBSaveReturnValue<UsedProduct>> {

		if (opts.method === 'insert') {
			for (const t of toSave as UsedProduct[])
				if (t.buyer)
					t._sellTime = moment().unix();
		}
		else if (opts.method === 'update') {
			const m = (toSave as UsedProduct);
			
			if (!m.buyer) {
				delete m._sellTime
			}
			else if (!m._sellTime)
				m._sellTime = oldObjInfo._sellTime || moment().unix();
		}

		const ret = await super.executeDbSave(req, opts, toSave, oldObjInfo);
		toSave = Array.isArray(toSave) ? ret.ops : ret.ops[0] as any;

		if (opts.method === 'insert') {
			await new MovementController().saveToDb(req, (toSave as UsedProduct[]).map(b => this.createMov(b, true)));
		}
		else if (opts.method === 'update') {
			if (!(toSave as UsedProduct).buyer && oldObjInfo.buyer)
				await new MovementController().deleteForUser(req, {direction: MovementDirection.input, '_generatedFrom.id': oldObjInfo._id.toString()}, {skipFilterControl: true});
			else if ((toSave as UsedProduct).buyer && !oldObjInfo.buyer)
				await new MovementController().saveToDb(req, [this.createMov(toSave as UsedProduct, false)]);
		}


		return ret;
	}

	private createMov = (body: UsedProduct, justBought: boolean): Movement => {
		return {
			priceAmount: justBought ? body.buyPrice : body.sellPrice,
			description: justBought ? 'Acquisto di Usato: ' + body.name : 'Vendita di Usato: ' + body.name,
			direction  : justBought ? MovementDirection.output : MovementDirection.input,
			
			date: moment().unix(),
			medium: MovementMedium.unspecified,
			
			_generatedFrom: new FetchableField(body._id, this.modelClass),
			physicalLocation: body.physicalLocation,
			documentLocation: body.documentLocation,
			documentLocationsFilter: body.documentLocationsFilter,
		}
	}


}

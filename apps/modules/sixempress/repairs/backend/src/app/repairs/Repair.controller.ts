import { Request } from 'express';
import { IVerifiableItemDtd, FetchableField, RequestHelperService, LibModelClass, DBSaveOptionsMethods, DBSaveOptions, DBSaveReturnValue, CustomExpressApp, RequestHandlerService, MongoUtils } from '@sixempress/main-be-lib';
import { Attribute } from '../../enums/attributes.enum';
import { ModelClass } from '../../enums/model-class.enum';
import { BePaths } from '../../enums/bepaths.enum'
import { DeviceType, RepairStatus, CustomerNotice, Repair } from './Repair';
import { CustomerController, PricedRowsSaleController } from '@sixempress/be-multi-purpose';
import { ObjectId } from 'mongodb';

export class RepairController extends PricedRowsSaleController<Repair> {

	private static deviceTypeEnum = Object.values(DeviceType).filter(v => typeof v === 'number');
	private static statusEnum = Object.values(RepairStatus).filter(v => typeof v === 'number');
	private static customerNoticeEnum = Object.values(CustomerNotice).filter(v => typeof v === 'number');

	modelClass = ModelClass.Repair;
	collName = ModelClass.Repair;
	bePath = BePaths.repairs;

	Attributes = {
		view: Attribute.viewRepairs,
		add: Attribute.addRepairs,
		modify: Attribute.modifyRepairs,
		delete: Attribute.deleteRepairs,
	};
	
	modelStatus = {
		all: RepairController.statusEnum as number[],
		// we add also exitFailure as draft as that is not a "completed" step, but we remove all the changes done to things so it's like a draft
		draft: [RepairStatus.draft, RepairStatus.exitFailure],
		fail: [RepairStatus.deliveredFailure],
		success: [RepairStatus.delivered],
		successPrePay: [RepairStatus.deliveredWillPay],
	}

	dtd: IVerifiableItemDtd<Repair> = {
		deviceType: { type: [Number], required: true, possibleValues: RepairController.deviceTypeEnum },
		model: { type: [String], required: true },
		color: { type: [String], required: true },
		defects: { type: [String], required: true },
		diagnostic: { type: [String], required: false },
		deviceCode: { type: [String], required: false },
		accessories: { type: [String], required: false },
		visibleDefects: { type: [String], required: false },

		customerNotice: { type: [Number], required: false, possibleValues: RepairController.customerNoticeEnum },
		estimatedRepairTime: { type: [Number], required: false },
		notes: { type: [String], required: false },
		
		assignedTo: FetchableField.getFieldSettings(LibModelClass.User, false),
		opReport: { type: [String], required: false, },
	};

	public generateBePaths(app: CustomExpressApp, rhs: RequestHandlerService<Repair>) {
		app.get("/" + this.bePath + 'extconn/', RequestHelperService.safeHandler(this.getRepair));
		super.generateBePaths(app, rhs);
	}

	/**
	 * build a public version of the repair object
	 */
	private getRepair = async (req: Request)  => {
		if (!req.qs.value || !MongoUtils.objectIdRegex.test(req.qs.value))
			return;

		const rep = await this.findOneForUser(req, {_id: new ObjectId(req.qs.value)}, {skipFilterControl: true});
		if (!rep) 
			return;

		const customer = await new CustomerController().findOneForUser(req, {_id: new ObjectId(rep.customer.id)}, {skipFilterControl: true});
		return {
			code: rep._progCode,
			customer: customer.name + ' ' + (customer.lastName || ''), // last name can be undefined
			enterDate: rep.date,
			exitDate: rep.endDate,
			delivered: [RepairStatus.deliveredWillPay, RepairStatus.deliveredFailure, RepairStatus.delivered].includes(rep.status),
			
			noticeStatus: rep.customerNotice,
			detailedStatus: rep.status,
			// this status is one of the old status that is retro-compatibile with the plugin
			status: 
				// success
				[RepairStatus.deliveredWillPay, RepairStatus.delivered].includes(rep.status) 
					? RepairStatus.exitSuccess :
				// failed
				[RepairStatus.deliveredFailure].includes(rep.status) 
					? RepairStatus.exitFailure :
				// re-entered
				[RepairStatus.reEntered].includes(rep.status) 
					? RepairStatus.entry :
				// default
				rep.status
			,

			deviceType: rep.deviceType,
			model: rep.model,
			color: rep.color,
			defects: rep.defects,
			visibleDefects: rep.visibleDefects,
			
			diagnostic: rep.diagnostic,
			report: rep.opReport,
			price: rep.totalPrice,
		}
	}

	/**
	 * create parents tree and other stuff
	 */
	protected async executeDbSave<A extends DBSaveOptionsMethods>(
		req: Request, 
		opts: DBSaveOptions<A, Repair>, 
		toSave: A extends 'insert' ? Repair[] : Repair, 
		oldObjInfo:  A extends 'insert' ? undefined : Repair
	): Promise<DBSaveReturnValue<Repair>> {

		if (opts.method === 'insert') {
			for (const m of toSave as Repair[])
				if (m.opReport)
					m._opReportLastAuthor = RequestHelperService.getCreatedDeletedObject(req);
		}
		else if (opts.method === 'update') {
			const m = toSave as Repair;
			// changed report
			if (m.opReport !== oldObjInfo.opReport)
				m._opReportLastAuthor = RequestHelperService.getCreatedDeletedObject(req);
			// same report
			else if (m.opReport === oldObjInfo.opReport)
				m._opReportLastAuthor = oldObjInfo._opReportLastAuthor;
			// removed report
			else if (!m.opReport)
				delete m._opReportLastAuthor;
		}

		return super.executeDbSave(req, opts, toSave, oldObjInfo);
	}


}

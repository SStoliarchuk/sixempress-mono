import { RequestHandler, Express } from 'express';
import { AbstractDbApiItemController, IVerifiableItemDtd, RequestHandlerService, AuthHelperService, DBSaveOptionsMethods, DBSaveOptions, DBSaveReturnValue, RequestHelperService } from '@sixempress/main-be-lib';
import { Attribute } from '../../utils/enums/attributes.enum';
import { ModelClass } from '../../utils/enums/model-class.enum';
import { BePaths } from '../../utils/enums/bepaths.enum'
import { MovementDirection, Movement, MovementMedium, SplitReport } from './Movement';
import { Filter } from 'mongodb';
import moment from 'moment';
import { Request } from 'express';
import { MovementGraph } from './Movement';


export class MovementController extends AbstractDbApiItemController<Movement> {

	private static movDir = Object.values(MovementDirection).filter(m => typeof m === 'number');
	private static movTyp = Object.values(MovementMedium).filter(m => typeof m === 'number');

	requirePhysicalLocation = true;
	
	modelClass = ModelClass.Movement;
	collName = ModelClass.Movement;
	bePath = BePaths.movements;

	addDateField = true;

	Attributes = {
		view: Attribute.viewMovements,
		modify: Attribute.modifyMovements,
		add: Attribute.addMovements,
		delete: Attribute.deleteMovements,
	};

	dtd: IVerifiableItemDtd<Movement> = {
		description: { type: [String], required: false, },
		priceAmount: { type: [Number], required: true },
		requireAttributeToSee: {type: [Boolean], required: false, possibleValues: [true]},
		direction: { type: [Number], required: true, possibleValues: MovementController.movDir, },
		medium: { type: [Number], required: true, possibleValues: MovementController.movTyp, },
	};

	public generateBePaths(app: Express, rhs: RequestHandlerService<Movement>) {
		app.get(
			'/' + this.bePath + 'graph', 
			AuthHelperService.requireAttributes(Attribute.viewMovementsReport), 
			RequestHelperService.safeHandler((req) => this.getMovementGraph(req, req.qsParsed.filter))
		);
		
		app.get(
			'/' + this.bePath + 'split', 
			AuthHelperService.requireAttributes(Attribute.viewMovementsReport), 
			RequestHelperService.safeHandler((req) => this.createSplitReport(req, +req.qs.from, +req.qs.to))
		);

		super.generateBePaths(app, rhs);
	}

	getHandler_getMulti(rhs: RequestHandlerService<Movement>) {
		return rhs.getMulti({
			customOptions: (req, filetrsToUse) => ({ filters: MovementController.buildFilters(req, filetrsToUse), }),
			customCount: async (req) => this.countForUser(req, MovementController.buildFilters(req)),
			customCountFiltered: async (req, userFilters) => this.countForUser(req, MovementController.buildFilters(req, userFilters)),
		});
	}

	/**
	 * Shows the range of movements allowed based on permissions
	 */
	private static buildFilters(req: Request, uFilters: any = {}) {
		const toUse: Filter<Movement> = {
			...uFilters,
			_deleted: {$exists: false},
		};

		if (!AuthHelperService.isAttributePresent(Attribute.viewHiddenMovements, req))
			toUse.requireAttributeToSee = {$exists: false};

		// TODO remove this static "add" 1
		// we have it to account for timezone offset
		// in the future we need to get the timezone from the request
		if (!AuthHelperService.isAttributePresent(Attribute.viewAllTimeMovements, req)) {
			// const dayStart = moment().startOf('d').add(1, 'h').unix();
			// const dayEnd = moment().endOf('d').add(1, 'h').unix();
			const dayStart = moment().startOf('d').unix();
			const dayEnd = moment().endOf('d').unix();
			toUse['date'] = {$lte: dayEnd, $gte: dayStart};
		}

		return toUse;
	}

	/**
	 * Ensure correct physical location and location filter
	 */
	protected async executeDbSave<A extends DBSaveOptionsMethods>(
		req: Request, 
		opts: DBSaveOptions<A, Movement>, 
		toSave: A extends "insert" ? Movement[] : Movement, 
		beObjInfo: A extends "insert" ? undefined : Movement
	): Promise<DBSaveReturnValue<Movement>> {
		
		const arr: Movement[] = Array.isArray(toSave) ? toSave as Movement[] : [toSave as Movement];
		for (const i of arr) {
			i.physicalLocation = i.documentLocation;
			i.documentLocationsFilter = [i.documentLocation];
		}

		return super.executeDbSave(req, opts, toSave, beObjInfo);
	}

	protected async getMovementGraph(req: Request, filter: object): Promise<MovementGraph> {
  
		const amounts = await this.aggregateForUser(req, [
			{$match: 
				filter
			},
			{$group: {
				_id: {direction: '$direction', medium: '$medium'},
				priceAmount: {$sum: '$priceAmount'}
			}},
			{$project: {
				direction: '$_id.direction',
				medium: '$_id.medium',
				priceAmount: '$priceAmount',
			}}
		]);
	
		let cashOut = 0;
		let cashIn = 0;
		let posIn = 0;
		let posOut = 0;
	
		let internalIn = 0;
		let internalOut = 0;
	
		for (const mov of amounts) {
			if (mov.direction === MovementDirection.internalInput) {
				internalIn += mov.priceAmount;
			}
			else if (mov.direction === MovementDirection.internalOutput) {
				internalOut += mov.priceAmount;
			}
			else if (mov.direction === MovementDirection.input) {
				if (mov.medium === MovementMedium.card)
					posIn += mov.priceAmount;
				else
					cashIn += mov.priceAmount;
			}
			else if (mov.direction === MovementDirection.output) {
				if (mov.medium === MovementMedium.card)
					posOut += mov.priceAmount;
				else
					cashOut += mov.priceAmount;
			}
		}
	
	
		return { cashOut, cashIn, posIn, posOut, internalIn, internalOut, };
	}


	public async createSplitReport(req: Request, from: number, to: number): Promise<SplitReport> {
		const movs = await new MovementController().aggregateForUser(req, [
			{$match: {
				date: {$gte: from, $lte: to}
			}},
			{$group: {
				_id: { 'modelClass': '$_generatedFrom.modelClass', 'direction': '$direction' },
				_generatedFrom: {$first: '$_generatedFrom'},
				priceAmount: {$sum: '$priceAmount'},
				direction: {$first: '$direction'},
			}}
		]);

		const d: SplitReport = {}

		for (const m of movs) {
			const idx = m.direction === MovementDirection.input ? 1 : m.direction === MovementDirection.output ? 0 : null;
			if (idx === null)
				continue;
			const key: keyof SplitReport = m._generatedFrom ? m._generatedFrom.modelClass : 'additional';
			if (!d[key])
				d[key] = [0, 0];
			d[key][idx] += m.priceAmount;
		}

		return d;
	}


}

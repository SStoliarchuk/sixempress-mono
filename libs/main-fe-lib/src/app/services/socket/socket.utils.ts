import { QueryFetch, AbstractDbItemController, IBaseModel, IMongoDBFetch, ObjectUtils } from '@sixempress/main-fe-lib';
import { SocketCodes, SocketDBObjectChangeMessage } from './socket.dtd';
import { SocketService } from './socket.service';

/**
 * A collections of utilities for the socket service
 */
export class SocketUtils {

	/**
	 * a map of callback for the on/off socket function
	 * we use the user given callback as the key, and the value is our function that filters the model classes
	 * 
	 * we need to store the identical function passed on on() function, to the off() function, otherwise it won't work
	 */
	private static onOffCbs = new Map();

	static onDbObjectChange(cbOrModel: string | ((db: SocketDBObjectChangeMessage) => void), cb?: ((db: SocketDBObjectChangeMessage) => void)) {
		if (typeof cbOrModel === 'string') {
			SocketUtils.onOffCbs.set(cb, (d: SocketDBObjectChangeMessage) => d.m === cbOrModel && cb(d));
			return SocketService.on(SocketCodes.dbObjectChange, SocketUtils.onOffCbs.get(cb));
		}

		return SocketService.on(SocketCodes.dbObjectChange, cbOrModel);
	}

	static offDbObjectChange(cbOrModel: string | ((db: SocketDBObjectChangeMessage) => void), cb?: ((db: SocketDBObjectChangeMessage) => void)) {
		if (typeof cbOrModel === 'string')
			return SocketService.off(SocketCodes.dbObjectChange, SocketUtils.onOffCbs.get(cb));

		return SocketService.off(SocketCodes.dbObjectChange, cbOrModel);
	}


	/**
	 * adds automatic updates based on socket emission to the array of models currently in state
	 * 
	 * the original componentDidMount() function will be overridden, and will be executed at the end of the new custom logic
	 * in case you createStartingArrayByFilter here then the funcion will be executed after the array creation
	 * 
	 * @param instance the instance of the react component (this)
	 * @param controller the controller relative to the items that the component will show
	 * @param statePathToArray the path to the array of the models being showed right now 
	 * @param opts.filter additional filters to pass for the updated items to pass, else they will be considered eliminetad
	 * @param opts.manualFn instead of automatically doing setState(), you can manually manage the state update
	 */
	static updateStateArrayByDbObjectChange<A extends React.Component, B extends keyof A['state']>(
		instance: A,
		controller: AbstractDbItemController<any>, 
		statePathToArray: B,
		opts: {filter?: object | (() => object), fetch?: IMongoDBFetch<any>[], manualFn?: (d: A['state'][B]) => void} = {}
	) {

		const callback = (d: SocketDBObjectChangeMessage) => {
			if (d.m === controller.modelClass)
				this.createUpdatedArray(controller, d.i, instance.state[statePathToArray as string] as any[], undefined, {filter: opts.filter})
					.then(u => opts.manualFn ? opts.manualFn(u as any) : instance.setState({[statePathToArray]: u}));
		};

		const cdm = instance.componentDidMount;
		instance.componentDidMount = () => {
			SocketService.on(SocketCodes.dbObjectChange, callback);

			// create initial array of data
			const filter = typeof opts.filter === 'function' ? opts.filter() : opts.filter;
			controller.getMulti({params: {filter: filter, fetch: opts.fetch}}).then(res => {
				opts.manualFn ? opts.manualFn(res.data as any) : instance.setState({[statePathToArray]: res.data});

				if (cdm) cdm.call(instance);
			});

		}

		const cwu = instance.componentWillUnmount;
		instance.componentWillUnmount = () => {
			SocketService.off(SocketCodes.dbObjectChange, callback);
			if (cwu) cwu.call(instance);
		}

	}


	/**
	 * Updates an array based on the socketdbobjectupdate info
	 * @param controller the controller of a model
	 * @param ids the ids returned from the socket update object
	 * @param instanceOrArray if given an array, it will create add/splice items from that array, and return a new one\
	 * if given a react instance object, it will use the param statePathToArray to do this.setState() automatically
	 * @param statePathToArray if the instanceOrArray paramtere is a react instance then this parameter is required to update the array in the state\
	 * WARNING we dont support deep path rn
	 */
	public static async createUpdatedArray<T extends IBaseModel, A extends Array<T> | React.Component>(
		controller: AbstractDbItemController<T>,
		ids: string | string[],
		instanceOrArray: A,
		statePathToArray: A extends React.Component<any, infer U> ? keyof U : undefined,
		opts: {filter?: object | (() => void), fetch?: IMongoDBFetch<any>[]} = {}
	): Promise<A extends Array<T> ? Array<T> : void> {

		// check path given in case its a react component
		if (!Array.isArray(instanceOrArray)) {
			if (!statePathToArray)
				throw new Error('statePathToArray has to be a string when given a react instance to function');

			if ((statePathToArray! as string).includes('.')) 
				throw new Error('statePathToArray cannot be a deep path (cannot contain a dot)');
		}
		
		const filter = typeof opts.filter === 'function' ? opts.filter() : opts.filter;
		// get updated items
		const idArr = typeof ids === 'string' ? [ids] : ids;
		const res = await controller.getMulti({
			// we disable loading as the update is "seamingless" ??
			disableLoading: true,
			params: {
				filter: filter ? {$and: [{_id: {$in: idArr}}, filter]} : {_id: {$in: idArr}},
				fetch: opts.fetch as QueryFetch<any>[],
			}
		});

		// if given array, then update that array and return the updated array
		if (Array.isArray(instanceOrArray))
			return SocketUtils.updateArray(idArr, res.data, instanceOrArray as Array<T>) as A extends Array<T> ? Array<T> : void;

		// else update automatically the state
		(instanceOrArray as React.Component).setState(s => ({[statePathToArray]: SocketUtils.updateArray(idArr, res.data, s[statePathToArray as string])}));
	}


	/**
	 * updates the array of old items by adding/removing new items
	 * @param updatedIds the ids that socket has notified us
	 * @param newItems the items fetched from the back edn
	 * @param oldItems the old items present in the state currently
	 */
	private static updateArray<T extends IBaseModel>(updatedIds: string[], newItems: T[], oldItems: T[]): T[] {

		const updatedHm: {[id: string]: T} = ObjectUtils.arrayToHashmap(newItems, '_id');
		const updatedItems = [...oldItems];

		for (const id of updatedIds) {

			const mov = updatedHm[id];
			const idx = updatedItems.findIndex(m => m._id === id);
			
			// is deleted
			if (!mov || mov._deleted) {
				// only if present remove
				if (idx !== -1) { 
					updatedItems.splice(idx, 1); 
				}
			}
			// if not present in array
			// then add it
			else if (idx === -1) {
				updatedItems.push(mov);
			}
			// else if present then update
			else {
				updatedItems.splice(idx, 1, mov);
			}

		}

		return updatedItems;
	}


}
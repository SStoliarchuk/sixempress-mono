import { AbstractBasicDt, IBaseModel, } from "@sixempress/main-fe-lib";
import { SocketService } from "../socket.service";
import { SocketCodes, SocketDBObjectChangeMessage } from "../socket.dtd";
import { isObservable } from "rxjs";
import { DBUpdateEmitterDt } from "./db-update-emitter-dt.interface";

/**
 * updates the tables when a row in the table is udpated and the socket is notified of the update
 */
export class SocketDbUpdateEmitter {

	
	public static setupDatatableSocketUpdates() {
		
		const super_componentDidMount = AbstractBasicDt.prototype.componentDidMount;
		const super_componentWillUnmount = AbstractBasicDt.prototype.componentWillUnmount;

		AbstractBasicDt.prototype.componentDidMount = function() {
			(AbstractBasicDt.prototype as any).__socketDbChange = (msg) => SocketDbUpdateEmitter.dtSocketUpdateFn.bind(this)(msg);
			
			SocketService.on(SocketCodes.dbObjectChange, (AbstractBasicDt.prototype as any).__socketDbChange);
			// we add the mounted flag as to ensure that when we received the queried updated rows
			// the table is still in place
			this['__isMounted'] = true;
			if (super_componentDidMount) { return super_componentDidMount.call(this); }
		};

		AbstractBasicDt.prototype.componentWillUnmount = function() {
			SocketService.off(SocketCodes.dbObjectChange, (AbstractBasicDt.prototype as any).__socketDbChange);
			this['__isMounted'] = false;
			if (super_componentWillUnmount) { return super_componentWillUnmount.call(this); }
		};
	}

	
	private static dtSocketUpdateFn = function(this: AbstractBasicDt<any>, msg: SocketDBObjectChangeMessage) {

		// we can requery only if the opts given is a function, otherwise we cant do anything
		if (this.controller && this.controller.modelClass === msg.m && this.dtTable.current && typeof this.dtTable.current.props.data === 'function') {

			// take the custom function if available
			// else fllback to the defualt
			//
			// not here in the function we manually access "this.dtTable.current.state.data.data" instead of storing it in variable
			// this is to always have the latest data array, if we store it we will lookup the old array so if the dt-page changes
			// this function will give false positives
			const findIndexFn = (this as DBUpdateEmitterDt<any>).findRowIndexBySocketUpdate
				? (id: string) => (this as DBUpdateEmitterDt<any>).findRowIndexBySocketUpdate((this.dtTable.current.state.data.data as IBaseModel[]), id)
				: (id: string) => (this.dtTable.current.state.data.data as IBaseModel[]).findIndex(f => f._id === id);
			

			// check if the current view has the items updated
			const idsToFetch: string[] = [];
			for (const i of msg.i) {
				const idx = findIndexFn(i);
				if (idx !== -1) { idsToFetch.push(i); }
			}

			// if some items are present in current dt view, then update them
			if (idsToFetch.length !== 0) {
				const update = (data: IBaseModel[]) => {
					// check if is still mounted
					if (!this['__isMounted']) { return; }

					const toGive: {idx: number, data: any}[] = [];

					// before updating we ensure once again that the table has the updated models
					// as in the time the observable is complete the user could change page or something else
					for (const d of data) {
						// we can support deleted rows by reloading the whole table but it will be bad UX
						// so instead we don't do anything, as updates/deletion on deleted models should not give errors
						const idx = findIndexFn(d._id);
						if (idx !== -1) { toGive.push({idx, data: d}); }
					}

					if (toGive.length !== 0) {
						this.dtTable.current.updateRowsData(toGive, true);
					}
				};


				const filter = (this as DBUpdateEmitterDt<any>).getFilterForSocketUpdate
					? (this as DBUpdateEmitterDt<any>).getFilterForSocketUpdate((this.dtTable.current.state.data.data as IBaseModel[]), idsToFetch)
					: {_id: idsToFetch};

				// we ensure to use the lowest level data function as possibile
				// to be sure to get the most correct function
				// bc there could be overrides during the way
				const dataFnRes = this.dtTable.current.props.data({byKey: filter});
				if (isObservable(dataFnRes)) {
					dataFnRes.subscribe(f => update(f.data));
				} 
				else if (dataFnRes instanceof Promise) {
					dataFnRes.then(f => update(f.data))
				}
				else {
					update(dataFnRes.data);
				}
			}
		}
	};

}

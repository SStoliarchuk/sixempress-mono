import { AbstractDbApiItemController } from '../object-format-controller/db-item/abstract-db-api-item.controller';
import { Express } from 'express';
import { RequestHandlerService } from './request-handler.service';
import { AbstractDbItemController } from '../object-format-controller/db-item/abstract-db-item.controller';

declare type A = typeof AbstractDbItemController

export interface Type<T> extends A {
	new (...args: any[]): T;
}

interface ControllersInfoObject {
	bePath: string;
	controller: typeof AbstractDbItemController;
	modelClass: string;
}

export class ControllersService {

	private static modelClassControllerInfoHM: {[ModelClass: string]: ControllersInfoObject} = {};
	

	public static registerController(co: typeof AbstractDbItemController ): AbstractDbItemController<any> {
		const c = new (co as any)();

		this.modelClassControllerInfoHM[c.modelClass] = {
			bePath: c.bePath,
			modelClass: c.modelClass,
			controller: co,
		};

		return c;
	}

	public static initialize(
		controllers: Type<AbstractDbItemController<any>>[],
		app: Express
	) {
		for (const co of controllers) {
			const c = this.registerController(co);

			if ((c as AbstractDbApiItemController<any>).generateBePaths) {
				(c as AbstractDbApiItemController<any>).generateBePaths(app, new RequestHandlerService(c));
			}
		}
	}

	public static getInfoByModelClass(m: string): ControllersInfoObject {
		return this.modelClassControllerInfoHM[m];
	}

}

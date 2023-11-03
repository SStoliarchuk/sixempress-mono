import { AbstractDbItemController } from "./abstract-db-item.controller";


export class ControllersService {

	private static modelClassControllerInfoHM: {
		[ModelClass: string]: typeof AbstractDbItemController
	} = {};

	public static registerController(co: typeof AbstractDbItemController ): AbstractDbItemController<any> {
		const inst = co as any;
		const c = new inst();

		ControllersService.modelClassControllerInfoHM[c.modelClass] = co;

		return c;
	}

	public static initialize(controllers: (typeof AbstractDbItemController)[]) {
		for (const co of controllers)
			ControllersService.registerController(co);
	}

	public static getByModelClass<T extends typeof AbstractDbItemController>(m: string): T {
		return ControllersService.modelClassControllerInfoHM[m] as T;
	}

	public static getInstanceByModelClass<T extends AbstractDbItemController<any>>(m: string): T {
		const info = ControllersService.modelClassControllerInfoHM[m];
		if (!info)
			return;

		const inst = info as any;
		return new inst() as T;
	}

}

import { AbstractDbItemController } from './abstract-db-item.controller';
import { IBaseModel } from '../IBaseModel.dtd';
import { CustomExpressApp } from "../../gateway-paths/transform-express-app";
import { AuthHelperService } from "../../services/auth-helper.service";
import { RequestHandlerService } from "../../services/request-handler.service";
import { RequestHandler, Express } from 'express';

export abstract class AbstractDbApiItemController<T extends IBaseModel> extends AbstractDbItemController<T> {

	public abstract Attributes: {
		view: string | number | boolean,
		modify: string | number | boolean,
		add: string | number | boolean,
		delete: string | number | boolean,
	};

	/**
	 * Creates basic api paths
	 */
	public generateBePaths(app: Express, rhs: RequestHandlerService<T>) {
		if (this.Attributes.view) {
			app.get('/' + this.bePath, AuthHelperService.requireAttributes(this.Attributes.view), this.getHandler_getMulti(rhs));
			app.get('/' + this.bePath + ':id', AuthHelperService.requireAttributes(this.Attributes.view), this.getHandler_getById(rhs));
		}
		
		if (this.Attributes.add) {
			app.post('/' + this.bePath, AuthHelperService.requireAttributes(this.Attributes.add), this.getHandler_post(rhs));
		}
		
		if (this.Attributes.modify) {
			app.patch('/' + this.bePath + ':id', AuthHelperService.requireAttributes(this.Attributes.modify), this.getHandler_patchById(rhs));
			app.put('/' + this.bePath + ':id', AuthHelperService.requireAttributes(this.Attributes.modify), this.getHandler_put(rhs));
		}

		if (this.Attributes.delete) {
			app.delete('/' + this.bePath + ':id', AuthHelperService.requireAttributes(this.Attributes.delete), this.getHandler_delete(rhs));
		}
	}

	protected getHandler_getMulti(rhs: RequestHandlerService<T>): RequestHandler {
		return rhs.getMulti();
	}
	
	protected getHandler_getById(rhs: RequestHandlerService<T>): RequestHandler {
		return rhs.getById();
	}

	protected getHandler_patchById(rhs: RequestHandlerService<T>): RequestHandler {
		return rhs.patchById();
	}
	
	protected getHandler_put(rhs: RequestHandlerService<T>): RequestHandler {
		return rhs.put();
	}

	protected getHandler_post(rhs: RequestHandlerService<T>): RequestHandler {
		return rhs.post();
	}

	protected getHandler_delete(rhs: RequestHandlerService<T>): RequestHandler {
		return rhs.markAsDeleted();
	}

}

import { Request } from 'express';
import { Error409, SysConfigurationObjectController, SysConfigurationType } from "@sixempress/main-be-lib";
import { ExternalConnection, ExternalConnectionConfig } from "./multip-config.dtd";

class _SyncConfigService {

	private coll = new SysConfigurationObjectController<ExternalConnectionConfig>(SysConfigurationType.external_connection_config);

	/**
	 * Returns the information about the specified business
	 * if info does not exists, then it creates an empty info object
	 */
	public async getConfigByReqOrSlug(req: Request): Promise<ExternalConnectionConfig> {
		const d = await this.coll.findOne(req, {});
		if (d)
			return d;

		// create empty if does not exists
		await this.coll.insertMany(req, [{__sysConfigObjectType: SysConfigurationType.external_connection_config, externalConnections: []}]);
		return this.coll.findOne(req, {});
	}

	/**
	 * Disables an external connection (used in case that connection is down or some other reason ?)
	 * @param slug the slug of the client
	 * @param extConnId the extneral connection id
	 */
	public async disableExternalConnection(req: Request, slug: string, extConnId: string) {
		// TODO implement this logic back once we have a better overall checking mechanism
		// like polling retry and we make sure that the stlse req is not expiring etc
		// for now it's only a blocking point 
		return; 
		// esnure the root config is present
		const setts = await this.coll.findOne(req, {});
		if (!setts) 
			throw new Error409('Root configuration of business is not set');

		const idx = setts.externalConnections.findIndex(c => c._id === extConnId);
		if (idx === -1)
			return;

		// update the content
		const k = ('externalConnections' as keyof ExternalConnectionConfig) + '.' + idx + '.' + ('isDisabled' as keyof ExternalConnection);
		await this.coll.updateOne(req, {}, {$set: {[k]: true}});
	}

	public async updatExtEndpoints(req: Request, conns: ExternalConnectionConfig['externalConnections']) {
		await this.coll.updateOne(req, {}, {$set: {['externalConnections' as keyof ExternalConnectionConfig]: conns}});
	}

}


export const SyncConfigService = new _SyncConfigService();
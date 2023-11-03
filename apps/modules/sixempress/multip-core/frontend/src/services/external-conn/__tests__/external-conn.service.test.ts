import { ExternalConnection, ExternalConnectionType } from "apps/modules/sixempress/multip-core/frontend/src/base-components/settings/multip-content/multip-content.dtd";
import { MultipService } from "apps/modules/sixempress/multip-core/frontend/src/services/multip/multip.service";
import { ExtRedirectType } from "../ext-redirect.enum";
import { ExternalConnService } from "../external-conn.service";

const utils = (() => {
		
	return {
		service: ExternalConnService,
	}

})();

describe('external conn service ', () => {

	describe('creates redirects urls', () => {

		const fn = (connType: ExternalConnectionType, type: ExtRedirectType, val: string | number, internalValue?: string | number): void | string => {
			MultipService.config.externalConnections = [
				{type: connType, useFor: {defaultClientSite: true}, originUrl: 'origin'} as Partial<ExternalConnection> as any, 
			]
			return utils.service.generateDefaultConnectionRedirectsUrl(type, val, internalValue)
		};

		it.todo('different url types based on connection type');

		it('encodes with optional internal value if present', () => {
			const types = Object.values(ExtRedirectType).filter(v => typeof v === 'number') as number[];
			for (const t of types) {
				let val = fn(ExternalConnectionType.wordpress, t, '10', '100') as string;
				expect(val.includes('&i=100')).toBe(true);
				expect(val.includes('&v=10')).toBe(true);
	
				val = fn(ExternalConnectionType.wordpress, t, '10') as string;
				expect(val.includes('&i=100')).toBe(false);
				expect(val.includes('&v=10')).toBe(true);
			}
		});

	});

	describe('decodes the value from redirects url', () => {
		const fn = utils.service.getScannerCodeValueFromRedirectUrl;

		it('uses internal value, if not present fallsback to remote value', () => {
			
			expect(fn('http://asd/?&v=123&i=111a1')).toEqual('111a1');

			expect(fn('http://asd/?&v=123')).toEqual('123');

		});

	});

});
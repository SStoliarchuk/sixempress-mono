import { UrlService } from '../url.service';

// fast access marks variables
const _hs = UrlService['MARKS']['hash']['start'];
const _hd = UrlService['MARKS']['hash']['divider'];
const _qs = UrlService['MARKS']['query']['start'];
const _qd = UrlService['MARKS']['query']['divider'];

type UrlByType = {
	[a in keyof typeof UrlService['MARKS']]?: [string, string][];
}

const utils = (() => {

	let windowUrl = '';
	UrlService['getFullUrl'] = () => windowUrl;
	UrlService['pushState'] = (v) => windowUrl = v;
	UrlService['pushState'] = (v) => windowUrl = v;
	
	const _internal = {
		urlByTypeToUrl: (u: UrlByType): string => {
			let url = 'hello';
			
			if (u['query']?.length) {
				url += _qs + u['query'][0][0] + '=' + u['query'][0][1];
				for (let i = 1; i < u['query'].length; i++) {
					url += _qd + u['query'][i][0] + '=' + u['query'][i][1];
				}
			}
			if (u['hash']?.length) {
				url += _hs + u['hash'][0][0] + '=' + u['hash'][0][1];
				for (let i = 1; i < u['hash'].length; i++) {
					url += _hd + u['hash'][i][0] + '=' + u['hash'][i][1];
				}
			}

			return url;
		}
	}

	return {
		service: UrlService,
		marks: UrlService['MARKS'],
		get: (type: 'hash' | 'query', u: string | UrlByType, key: string) => {
			const url = typeof u === 'string' ? u : _internal.urlByTypeToUrl(u);
			utils.service.pushState(url);
			return utils.service.getUrlX(type, key) || undefined;
		},
		set: (type: 'hash' | 'query', currUrl: string | UrlByType, key: string, value: string | null | undefined) => {
			const url = typeof currUrl === 'string' ? currUrl : _internal.urlByTypeToUrl(currUrl);
			utils.service.pushState(url);
			utils.service.setUrlX(type, key, value);
			return utils.service['getFullUrl']() || undefined;
		},
	}

})();

describe('url service', () => {

	describe('simple (only 1 type in url)', () => {
	
		describe('get', () => {
	
			const fn = utils.get;

			it('finds it at the start', () => {
				expect(fn('query', `hello${_qs}a=3`, 'a')).toBe('3');
				expect(fn('hash', `hello${_qs}a=3`, 'a')).toBe(undefined);
	
				expect(fn('query', `hello${_hs}a=3`, 'a')).toBe(undefined);
				expect(fn('hash', `hello${_hs}a=3`, 'a')).toBe('3');
			});
	
			it('finds it in the middle', () => {
				expect(fn('query', `hello${_qs}a=3${_qd}b=10`, 'b')).toBe('10');
				expect(fn('hash', `hello${_qs}a=3${_qd}b=10`, 'b')).toBe(undefined);
	
				expect(fn('query', `hello${_hs}a=3${_hd}b=10`, 'b')).toBe(undefined);
				expect(fn('hash', `hello${_hs}a=3${_hd}b=10`, 'b')).toBe('10');
			});
	
		});
	
		describe('set / remove', () => {
	
			const fn = utils.set;
	
			describe('start', () => {
	
				it('sets', () => {
					expect(fn('query', `hello`, 'a', '3')).toBe(`hello${_qs}a=3`);
					expect(fn('hash', `hello`, 'a', '3')).toBe(`hello${_hs}a=3`);
				});
	
				it('changes', () => {
					expect(fn('query', `hello${_qs}a=3`, 'a', '10')).toBe(`hello${_qs}a=10`);
					expect(fn('hash', `hello${_hs}a=3`, 'a', '10')).toBe(`hello${_hs}a=10`);
				});
	
				it('removes', () => {
					expect(fn('query', `hello${_qs}a=3`, 'a', undefined)).toBe(`hello`);
					expect(fn('hash', `hello${_hs}a=3`, 'a', undefined)).toBe(`hello`);
					expect(fn('query', `hello${_qs}a=3`, 'a', null)).toBe(`hello`);
					expect(fn('hash', `hello${_hs}a=3`, 'a', null)).toBe(`hello`);
					expect(fn('query', `hello${_qs}a=3`, 'a', '')).toBe(`hello`);
					expect(fn('hash', `hello${_hs}a=3`, 'a', '')).toBe(`hello`);
				});
	
			});
	
			describe('middle', () => {
	
				it('sets in the middle', () => {
					expect(fn('query', `hello${_qs}a=3${_qd}c=5`, 'b', '10')).toBe(`hello${_qs}a=3${_qd}c=5${_qd}b=10`);
					expect(fn('hash', `hello${_hs}a=3${_hd}c=5`, 'b', '10')).toBe(`hello${_hs}a=3${_hd}c=5${_hd}b=10`);
				});
		
				it('changes the value non at the end', () => {
					expect(fn('query', `hello${_qs}a=3${_qd}c=5${_qd}b=10`, 'c', '55')).toBe(`hello${_qs}a=3${_qd}c=55${_qd}b=10`);
					expect(fn('hash', `hello${_hs}a=3${_hd}c=5${_hd}b=10`, 'c', '55')).toBe(`hello${_hs}a=3${_hd}c=55${_hd}b=10`);
				});
	
				it('deletes the value in the middle', () => {
					expect(fn('query', `hello${_qs}a=3${_qd}b=10`, 'b', undefined)).toBe(`hello${_qs}a=3`);
					expect(fn('hash', `hello${_hs}a=3${_hd}b=10`, 'b', undefined)).toBe(`hello${_hs}a=3`);
					expect(fn('query', `hello${_qs}a=3${_qd}b=10`, 'b', null)).toBe(`hello${_qs}a=3`);
					expect(fn('hash', `hello${_hs}a=3${_hd}b=10`, 'b', null)).toBe(`hello${_hs}a=3`);
					expect(fn('query', `hello${_qs}a=3${_qd}b=10`, 'b', '')).toBe(`hello${_qs}a=3`);
					expect(fn('hash', `hello${_hs}a=3${_hd}b=10`, 'b', '')).toBe(`hello${_hs}a=3`);
				});
		
				it('deletes the value at the start and moves the middle to the start', () => {
					expect(fn('query', `hello${_qs}a=3${_qd}c=5${_qd}b=10`, 'a', '')).toBe(`hello${_qs}c=5${_qd}b=10`);
					expect(fn('hash', `hello${_hs}a=3${_hd}c=5${_hd}b=10`, 'a', '')).toBe(`hello${_hs}c=5${_hd}b=10`);
				});

			});
	
	
		});

	});

	describe('complex (multiple mark types in url)', () => {

		describe('get', () => {

			const fn = utils.get;

			it('finds it at the start', () => {
				// same key different position
				expect(fn('query', `hello${_qs}a=3${_hs}a=5`, 'a')).toBe('3');
				expect(fn('hash', `hello${_qs}a=3${_hs}a=5`, 'a')).toBe('5');
				
				// pass key of the other type
				expect(fn('hash', `hello${_qs}a=3${_hs}b=5`, 'a')).toBe(undefined);
				expect(fn('query', `hello${_qs}a=3${_hs}b=5`, 'b')).toBe(undefined);
	
				// none
				expect(fn('query', `hello${_qs}a=3${_hs}a=5`, 'b')).toBe(undefined);
				expect(fn('hash', `hello${_qs}b=3${_hs}a=5`, 'b')).toBe(undefined);
			});

			it('finds it in the middle', () => {
				expect(fn('query', `hello${_qs}a=3${_qd}b=5${_hs}a=30${_hs}b=50`, 'b')).toBe('5');
				expect(fn('hash', `hello${_qs}a=3${_qd}b=5${_hs}a=30${_hd}b=50`, 'b')).toBe('50');
			});

		});

		describe('set / remove', () => {

			const fn = utils.set;

			describe('start', () => {

				it('sets', () => {
					expect(fn('query', `hello${_hs}a=5`, 'a', '30')).toBe(`hello${_qs}a=30${_hs}a=5`);
					expect(fn('hash', `hello${_qs}a=3`, 'a', 'asd')).toBe(`hello${_qs}a=3${_hs}a=asd`);
				});

				it('changes', () => {
					expect(fn('query', `hello${_qs}a=3${_hs}a=5`, 'a', 'aaa')).toBe(`hello${_qs}a=aaa${_hs}a=5`);
					expect(fn('hash', `hello${_qs}a=3${_hs}a=5`, 'a', 'bbb')).toBe(`hello${_qs}a=3${_hs}a=bbb`);
				});
					
				it('removes', () => {
					expect(fn('query', `hello${_qs}a=3${_hs}a=5`, 'a', '')).toBe(`hello${_hs}a=5`);
					expect(fn('hash', `hello${_qs}a=3${_hs}a=5`, 'a', '')).toBe(`hello${_qs}a=3`);
				});

			});

			describe('middle', () => {

				it('sets in the middle', () => {
					expect(fn('query', `hello${_qs}b=3${_hs}b=5`, 'a', '30')).toBe(`hello${_qs}b=3${_qd}a=30${_hs}b=5`);
					expect(fn('hash', `hello${_qs}b=3${_hs}b=5`, 'a', 'asd')).toBe(`hello${_qs}b=3${_hs}b=5${_hd}a=asd`);
				});
		
				it('changes the value non at the end', () => {
					expect(fn('query', `hello${_qs}a=3${_qd}b=5${_qd}c=15${_hs}a=30${_hs}b=50${_hs}c=10`, 'b', 'aaa')).toBe(`hello${_qs}a=3${_qd}b=aaa${_qd}c=15${_hs}a=30${_hs}b=50${_hs}c=10`);
					expect(fn('hash', `hello${_qs}a=3${_qd}b=5${_qd}c=15${_hs}a=30${_hd}b=50${_hd}c=10`, 'b', 'bbb')).toBe(`hello${_qs}a=3${_qd}b=5${_qd}c=15${_hs}a=30${_hd}b=bbb${_hd}c=10`);
				});
	
				it('deletes the value in the middle', () => {
					expect(fn('query', `hello${_qs}a=3${_qd}b=5${_qd}c=15${_hs}a=30${_hs}b=50${_hs}c=10`, 'b', '')).toBe(`hello${_qs}a=3${_qd}c=15${_hs}a=30${_hs}b=50${_hs}c=10`);
					expect(fn('hash', `hello${_qs}a=3${_qd}b=5${_qd}c=15${_hs}a=30${_hd}b=50${_hd}c=10`, 'b', '')).toBe(`hello${_qs}a=3${_qd}b=5${_qd}c=15${_hs}a=30${_hd}c=10`);
				});
		
				it('deletes the value at the start and moves the middle to the start', () => {
					expect(fn('query', `hello${_qs}a=3${_qd}b=5${_qd}c=15${_hs}a=30${_hs}b=50${_hs}c=10`, 'a', '')).toBe(`hello${_qs}b=5${_qd}c=15${_hs}a=30${_hs}b=50${_hs}c=10`);
					expect(fn('hash', `hello${_qs}a=3${_qd}b=5${_qd}c=15${_hs}a=30${_hd}b=50${_hd}c=10`, 'a', '')).toBe(`hello${_qs}a=3${_qd}b=5${_qd}c=15${_hs}b=50${_hd}c=10`);
				});

			});

		});

	});

});

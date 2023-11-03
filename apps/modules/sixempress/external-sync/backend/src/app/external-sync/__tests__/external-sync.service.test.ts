describe('External sync service', () => {

	describe('cached external connection info', () =>{ 

		it.todo('caches only not disabled items');

		it.todo('removes the cached item on multip config update');

		it.todo('filters correctly the getExternalConnections by the given use');

	});

	describe('raw files upload', () => {

		describe('tries all the endpoints to uploade', () => {

			it.todo('throws on no endpoints');
			
			it.todo('throws if there are configured endpoints but not implemented');
			
			it.todo('accumulates all the error and only if all failed then throws the accumulated errors');

		});

	});

});
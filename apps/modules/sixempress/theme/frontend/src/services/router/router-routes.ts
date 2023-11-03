
// recursive proxy to build the path as the user is attraversing the tree
export function getRouterPathBuild(path: string = ''): any {
	return new Proxy({}, {
		get: (target: any, prop: any) => {
			if (prop === '$$typeof')
				return target[prop];

			if (prop === 'toString')
				return () => path;

			const emit = path + '/' + prop;
			return getRouterPathBuild(emit);
		},
	});
} 

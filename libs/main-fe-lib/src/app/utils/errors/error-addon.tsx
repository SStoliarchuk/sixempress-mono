import React from 'react';
import { AuthService } from '../../services/authentication/authentication';
// import { ContextService } from '../../services/context-service/context-service';
import { RequestService } from '../../services/request-service/request-service';

/**
 * A component that lets you error the system to test it
 */
export function ErrorAddon() {

	const [addCreErr, setAddCre] = React.useState(false);

	const refresh = (e?: any) => AuthService.refreshAuthz('client');
	const quick = (e?: any) => { const a: any = {}; console.log(a.a.a); }
	const unmount = (e?: any) => { setAddCre(true); }
	// const _401 = (e?: any) => { RequestService.request('get', ContextService.configuration.clientApi + ContextService.configuration.slug + "/401401401401401401"); }
	const _404 = (e?: any) => { RequestService.client('get', "asd"); }

	return (
		<>
			<button onClick={refresh}>refresh</button>
			<button onClick={quick}>quick err</button><br/>
			<button onClick={unmount}>unmount</button>
			{/* <button onClick={_401}>401</button> */}
			<button onClick={_404}>404</button>
			{addCreErr && <ErrorOnCreation/>}
		</>
	);
}


function ErrorOnCreation() {
	const a: any = {};
	console.log(a.a.a);
	return (null);
}

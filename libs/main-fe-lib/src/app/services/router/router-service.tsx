
export const RouterService = {

	reloadPage: () => {
		use_action.sxmp_router_reload_page();
	},

	goto: (path: string | {}, replace?: boolean, timeout?: boolean) => {
		use_action.sxmp_router_goto(path, replace, timeout);
	},

	back: () => {
		use_action.sxmp_router_back();
	},

	getCurrentPath: () => {
		return use_action.sxmp_router_get_current_path();
	},

	match: ((...args) => {
		return use_action.sxmp_router_match(...args)
	}) as typeof use_action.sxmp_router_match,
	
}

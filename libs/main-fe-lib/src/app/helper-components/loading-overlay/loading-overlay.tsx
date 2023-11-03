
export class LoadingOverlay { 

	public static get loading(): boolean {
		return use_action.sxmp_loading_get_status();
	}
	public static set loading(val: boolean) {
		use_action.sxmp_loading_set_status(val);
	}

	/**
	 * The text for the loading overlay (CURRENTLY NOT IMPLEMENTED)
	 */
	public static text: string = '';

	/**
	 * Changes the loading state and lets the ui reload
	 * 
	 * Useful for when doing complex sync tasks as normal "loading = true" won't work
	 */
	public static async loadingAsync(state: boolean) {
		use_action.sxmp_loading_set_status(state);
		await new Promise(r => setTimeout(r, 1));
	}

	/**
	 * Removes all the loading stack
	 */
	public static clearLoading() {
		use_action.sxmp_loading_clear_all();
	}
	
}


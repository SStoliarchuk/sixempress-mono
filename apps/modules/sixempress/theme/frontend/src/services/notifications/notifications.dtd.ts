export interface LibNotification {
	/**
	 * use id to track the notification and update or delete it
	 * if not given explicitely, one will be assigned
	 */
	id?: string,
	/**
	 * brief title
	 */
	title: string,
	/**
	 * content of the notifiaction
	 */
	content?: string,
	/**
	 * Wheter the user can dismiss the notification
	 */
	dismissable?: boolean,
	/**
	 * callback executed when the notification is closed manually or dismissed
	 */
	onRemoved?: () => void,
	/**
	 * Action triggered when users clicks directly on notification
	 */
	onClick?: (e: React.MouseEvent<any>) => void,
	/**
	 * Dismisses the notification when onClick is triggered
	 * @default true
	 */
	onClickDismiss?: boolean,
	/** 
	 * Action buttons at the end of the notification element
	 */
	actions?: Array<{
		/**
		 * Button name 
		 */
		title: string, 
		/** 
		 * click action
		 */
		onClick: (e: React.MouseEvent<any>) => void, 
		/**
		 * Dismiss when clicked button
		 * @default true
		 */
		dismiss?: boolean
	}>,
}
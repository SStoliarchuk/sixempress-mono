/**
 * Information about the start point of the touch event
 */
export type TouchStart = {
	x: number,

	y: number,
	
	/**
	 * The time the touch started in ms\
	 * new Date().getTime()
	 */
	ms: number;

	/**
	 * Finds the first x/y scrollable items
	 * 
	 * used to stop an action if the elements targeted have scroll\
	 * for example for the mw-drawer
	 */
	scrolledTargets: {
		top?:    Array<{scrollLeft: number, scrollTop: number, node: Element}>,
		right?:  Array<{scrollLeft: number, scrollTop: number, node: Element}>,
		bottom?: Array<{scrollLeft: number, scrollTop: number, node: Element}>,
		left?:   Array<{scrollLeft: number, scrollTop: number, node: Element}>,
	};
};

export type SwipeStatus = {
	complete: boolean, 
	distanceX: number, 
	distanceY: number,
}

export type ActionProps = {
	/**
	 * executed when the user touches the screen
	 */
	onStart?: (e: Touch, start: TouchStart) => void,
	// /**
	//  * Executed only once, after the endconditions have been met
	//  */
	// onComplete?: (e: Touch, start: TouchStart) => void, 
	/**
	 * executed during the swiping of the user, 
	 * it is triggered even after the endconditions have been met
	 *
	 * but it is not triggered if the touchstart is invalid\
	 * aka if there are scrollable elements or outside start area etc..
	 */
	onSwiping?: (e: Touch, start: TouchStart) => void,
	/**
	 * Triggered when the user releadses the touch
	 */
	onEnd?: (e: Touch, start: TouchStart, isComplete: boolean) => void,
}

export type SwipeConditions = {
	/**
	 * min-max\
	 * The time to reach the minimum conditions to trigger the action
	 */
	ms?: [number, number]
	/**
	 * +Axis -Axis\
	 * minimum distance swiped in the direction\
	 * 
	 * @note
	 * the negative axis is automatically set to negative
	 * so pass [100, 100] instead of [100, -100]
	 */
	minDistance?: [number, number],

	/**
	 * The window where the touch can start
	 */
	startActionArea?: [number, number] | ((e: Touch) => [number, number]),

	// /**
	//  * min-max\
	//  * the area allowed calculated from the window element
	//  */
	// activeAreaFromWindow?: [number, number],
}

/**
 * Information about when the action should be considered completed
 */
export type SwipeTrigger = {

	/**
	 * @param true ignore every item scrollable
	 * @param string[] ignores the query selectors in the array
	 * @param function ignores based on result
	 */
	ignoreScrollableTargets?: true | string[] | ((e: HTMLElement) => boolean);

	/**
	 * Ignores the touch start event if it comes from matching item
	 */
	ignoreEventFrom?: string[] | ((e: HTMLElement) => boolean);

	direction: () => 'top' | 'right' | 'bottom' | 'left';

	x?: SwipeConditions,

	y?: SwipeConditions,
};
import { enableScroll, disableScroll } from "../various/scroll-toggle";
import { SmallUtils } from "../various/small-utils";
import { SwipeConditions, ActionProps, SwipeTrigger, TouchStart } from "./touch-action.utils.dtd";

export class TouchActionUtils {

	/**
	 * Allows you to create a swipe trigger
	 * you can put these listeners to the window element instead of the "target" element
	 * 
	 * example in mw-drawer
	 */
	public static createSwipe(endConditions: SwipeTrigger, props: ActionProps) {
		return new SwipeAction(endConditions, props).getHandlers();
	}
	
}

class SwipeAction {

	/**
	 * the radius where you decide what the locked axis of the movement should be
	 */
	private static defaultAxisLockDeadzone = 10;

	/**
	 * Info about when the touch started
	 * @param false if the start is invalid and we can ignore it
	 * @param TouchStart when the touch is a valid start
	 * @param undefined if not yet setup
	 */
	private touchStart: false | TouchStart | undefined;
	
	/**
	 * the currently locked axis that the user chosen
	 * 
	 * false = the axis is incorrect so we ignore other touch events
	 * 1 = - horizontal \
	 * 2 = | vertical \
	 */
	private currentLockedAxis: false | 1 | 2;

	constructor(
		private cond: SwipeTrigger, 
		private props: ActionProps
	) {}

	/**
	 * Generates the handlers to add to the element
	 */
	public getHandlers(): Pick<React.DetailedHTMLProps<any, any>, 'onTouchMove' | 'onTouchEnd'> {
		return {
			onTouchMove: this.handleTouchMove,
			onTouchEnd: this.handleTouchEnd,
		}
	}

	private handleTouchEnd = (event: TouchEvent) => {
		
		const start = this.touchStart;
		const lock = this.currentLockedAxis;
		this.touchStart = undefined;
		this.currentLockedAxis = undefined;

		// if no successful lock, then it means it has never started
		if (!lock || !start)
			return;
		
		// scroll is disable once lock is active, so here we activate scroll after the return check earlier
		enableScroll();
		
		if (this.props.onEnd)
			this.props.onEnd(
				event.changedTouches[0], 
				start as TouchStart, 
				this.checkConditions(event.changedTouches[0], start)
			);
	}

	/**
	 * Finds the first parent element that can be scrolled
	 * @return false if one of the parent is blacklisted
	 * @return the scrolled target list otherwise
	 */
	private getScrollableParent(node: HTMLElement): false | TouchStart['scrolledTargets'] {

		if (this.cond.ignoreScrollableTargets === true)
			return {};


		const tor: TouchStart['scrolledTargets'] = {};

		for (; node; node = node.parentNode as HTMLElement) {
			// all assigned
			if ((node as any) === window.document || (tor.top && tor.right && tor.bottom && tor.left))
				break;

			if (this.cond.ignoreEventFrom && this.nodeMatch(node, this.cond.ignoreEventFrom))
				return false;

			// check if it should be ignored
			if (this.cond.ignoreScrollableTargets && this.nodeMatch(node, this.cond.ignoreScrollableTargets))
				continue;

			const directions = this.getScrolledDirection(node);

			for (const c of directions) {
				if (!tor[c])
					tor[c] = [];

				tor[c].push({
					scrollLeft: node.scrollLeft,
					scrollTop: node.scrollTop,
					node: node,
				});
			}

		}

		return tor;
	}

	/**
	 * Returns in which direction an element was scrolled
	 */
	private getScrolledDirection(node: HTMLElement): ('top' | 'right' | 'bottom' | 'left')[] {

		const scrolledTo: ('top' | 'right' | 'bottom' | 'left')[] = [];

		// overflow hidden element are treated as having no scrolls
		if (window.getComputedStyle(node).overflow === 'hidden')
			return scrolledTo;

		if (node.scrollLeft > 0)
			scrolledTo.push('right')
		if (node.scrollLeft + node.clientWidth < node.scrollWidth)
			scrolledTo.push('left')

		if (node.scrollTop > 0)
			scrolledTo.push('bottom')
		if (node.scrollTop + node.clientHeight < node.scrollHeight)
			scrolledTo.push('top')

		return scrolledTo;
	}

	/**
	 * Remember the initial props started
	 */
	private markStart(e: Touch, target: HTMLElement): SwipeAction['touchStart'] {

		// if text is selected then we do not scroll
		if (SmallUtils.getTextSelection())
			return this.touchStart = false;

		// check starting condition
		// and leave touchstart invalid
		if (this.cond.x && this.cond.x.startActionArea)
			if (!this.checkMinMax(Array.isArray(this.cond.x.startActionArea) ? this.cond.x.startActionArea : this.cond.x.startActionArea(e), e.pageX))
				return this.touchStart = false;

		if (this.cond.y && this.cond.y.startActionArea)
			if (!this.checkMinMax(Array.isArray(this.cond.y.startActionArea) ? this.cond.y.startActionArea : this.cond.y.startActionArea(e), e.pageY))
				return this.touchStart = false;

		const nodeInfo = this.getScrollableParent(target);

		// blacklisted item
		if (nodeInfo === false)
				return this.touchStart = false;

		return this.touchStart = { 
			x: e.pageX,
			y: e.pageY,
			ms: new Date().getTime(),
			scrolledTargets: nodeInfo,
		};
	}


	/**
	 * Checks if the move has been completed
	 */
	private handleTouchMove = (event: TouchEvent) => {

		// no multi-touch
		if (this.currentLockedAxis === false || this.touchStart === false || event.touches.length !== 1)
			return;
			
		const e = event.touches[0];

		// we create touch start on the move item, as to optimize the callbacks
		// becuase onTouchStart is triggered on simple clicks, but onTouchMove is triggered only on swipes
		// thus we take the first swipe and transform it into the touch start
		// ensuring that there are no usesless touchStart created when the user simply clicks an item instead of swiping
		if (!this.touchStart)
			if (!this.markStart(e, event.target as HTMLElement))
				return;

		// try to lock
		if (!this.currentLockedAxis)
			if (!this.lockAxisAndStart(e))
				return;

		// check if the locked axis is the required 
		if (this.currentLockedAxis)
			if (this.props.onSwiping)
				this.props.onSwiping(e, this.touchStart);

	}

	/**
	 * Checks which axis to lock based on the distance of the swipe from the start
	 */
	private lockAxisAndStart(e: Touch): SwipeAction['currentLockedAxis'] {
		const start = this.touchStart as TouchStart
		const distanceX = e.pageX - start.x;
		const distanceY = e.pageY - start.y;
		
		let actual: 'top' | 'right' | 'bottom' | 'left';
		if (distanceX > SwipeAction.defaultAxisLockDeadzone)
			actual = 'right';
		else if (distanceX < -SwipeAction.defaultAxisLockDeadzone)
			actual = 'left';
		// vertical
		else if (distanceY > SwipeAction.defaultAxisLockDeadzone)
			actual = 'bottom';
		else if (distanceY < -SwipeAction.defaultAxisLockDeadzone)
			actual = 'left';

		// if deadzone not overcame we then wait for the user to over come it
		if (!actual)
			return false;

		// scroll target so we cant lock an axis 
		if (start.scrolledTargets[actual])
			return this.currentLockedAxis = false;

		// if the actual direction is not the desired
		const desired = this.cond.direction()
		if (actual !== desired)
			return this.currentLockedAxis = false;

		// setup and callback
		const axis = actual === 'right' || actual === 'left' ? 1 : 2;

		// ensure that if the axis is horizontal
		// then no items have been scrolled vertically
		// same behavior as ios where horizontal menus do not open when an el is being scrolled
		if (axis === 1)
			for (const k of ['top', 'bottom'] as ('top' | 'bottom')[])
				if (start.scrolledTargets[k])
					for (const nodeInfo of start.scrolledTargets[k])
						if (nodeInfo.scrollTop !== nodeInfo.node.scrollTop)
							return this.currentLockedAxis = false;

		this.currentLockedAxis = axis;

		// lock the screen to avoid creating confusing experience for the user
		// where he drags vertically also :/
		disableScroll();
		
		if (this.props.onStart)
			this.props.onStart(e, start);

		return this.currentLockedAxis;
	}

	/**
	 * Checks if a node matches the given params
	 */
	private nodeMatch(node: HTMLElement, match: string[] | ((e: HTMLElement) => boolean)): boolean {
		if (Array.isArray(match)) {
			if (match.find(i => node.matches(i))) {
				return true;
			}
		}
		else if (match(node)) {
			return true;
		}

		return false;
	}

	/**
	 * Checks both axis for the conditions to be met
	 */
	private checkConditions(e: Touch, start: TouchStart): boolean {
		const x = e.pageX - start.x;
		const y = e.pageY - start.y;

		const elapsedMs = new Date().getTime() - start.ms;

		// check x if present
		if (
			this.cond.x && 
			!this.checkSingleAxisSwipeCondition(
				{elapsedMs: elapsedMs, currentPos: x, startPos: start.x},
				this.cond.x,
			)
		) {
			return false;
		}

		// check y if present
		if (
			this.cond.y && 
			!this.checkSingleAxisSwipeCondition(
				{elapsedMs: elapsedMs, currentPos: y, startPos: start.y},
				this.cond.y,
			)
		) {
			return false;
		}

		return true;
	}

	
	/**
	 * Chekcs if the conditions for a specified axis are met
	 */
	private checkSingleAxisSwipeCondition(data: {elapsedMs: number, startPos: number, currentPos: number}, condition: SwipeConditions): boolean {
		// check for the timing
		if (condition.ms && !this.checkMinMax(condition.ms, data.elapsedMs))
			return false;

		// check for minimun distance to be complete
		if (condition.minDistance) {
			// we check if we should take the +minAxis or -minAxis
			// and check only that axis 
			if (data.currentPos > 0) {
				// +x > x
				if (condition.minDistance[0] > data.currentPos)
					return false;
			}
			else {
				// -x > x
				if (condition.minDistance[1] > -data.currentPos)
					return false;
			}
		}


		// // check active area
		// if (condition.activeAreaFromWindow && !this.checkMinMax(condition.activeAreaFromWindow, data.currentPos + data.startPos))
		// 		return false;

		return true;
	}


	private checkMinMax(mm: [number, number], value: number) {
		// min > x
		if (mm[0] > value)
			return false;
		// max < x
		if (mm[1] < value)
			return false;

		return true;
	}

}
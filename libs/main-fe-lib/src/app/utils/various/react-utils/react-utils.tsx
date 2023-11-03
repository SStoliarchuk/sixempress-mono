import React from 'react';
import Slide, { SlideProps } from '@material-ui/core/Slide';
import { TransitionProps } from '@material-ui/core/transitions/transition';
import { SelectChangeField } from './select-change-field';


/**
 * This class contains various Utilities like Small-Utils but it's for React so there are transition and stuff
 */
export class ReactUtils {


	/**
	 * Returns a transition object that SLIDES
	 */
	public static getSlideTransition = (props?: Partial<SlideProps>) =>
		React.forwardRef<unknown, TransitionProps>(
			function Transition(p, ref) {
				return <Slide direction="up" ref={ref} {...p} {...props as any} />;
			}
		)

	public static SelectChangeField = SelectChangeField;

}

import React from 'react';
import Dialog, { DialogProps } from '@material-ui/core/Dialog';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { useTheme } from '@material-ui/core/styles';
import { makeStyles } from '@material-ui/core/styles';
import Slide from '@material-ui/core/Slide';
import type { TransitionProps } from '@material-ui/core/transitions/transition';
import type { ModalProps } from '../modal.service.dtd';
import clsx from 'clsx';
import { Paper, PaperProps } from '@material-ui/core';
import { TouchActionUtils } from '@sixempress/utilities';
import { DeviceInfoService } from '@sixempress/utilities';

const useStyles = makeStyles({
	root: {
		'& > div[role="none presentation"] > div[role="dialog"]': {
			// we need to hide the first <paper/> introduced
			// as we manually add a secondary paper
			//
			// this is for the margin magics
			backgroundColor: 'transparent',
			boxShadow:'none',
			// hide the bottom spacer at the beggingni
			// on fullScren this will be overridden
			'& > div > div:last-child': {
				display: 'none',
			}
		},
	},
	fullScreen: {
		'& > div[role="none presentation"]': {
			
			...(DeviceInfoService.isApple() ? {} : {
				display: 'flex',
				alignItems: 'flex-end',
			}),

			// random after thing present, what
			// we remove it here
			'&::after': DeviceInfoService.isApple() ? {
				display: 'none',
				width: 0,
				content: '',
			} : {},

			'& > div[role="dialog"]': {
				height: DeviceInfoService.isApple() ? 'calc(100% + 1px)' : '100%',
				display: 'flex',
				flexDirection: 'column',
				
				// here we add a fake margin on top of the custom paper we use
				// to simulate the space above but to make it scrollable too
				// as with normal margin the modal is not movable beyond the margin obviously
				'& > span': {
					display: 'block',
					flexGrow: 1,
					// size of the "margin" on top
					minHeight: '50px',
				},

				// add a bit of curve to the first graphical div
				// which is the header
				'& > div > div:first-child': {
					borderTopLeftRadius: '1em',
					borderTopRightRadius: '1em',
				},

				// modify the last-child which is the manual spacer
				// to add a bit of space for ios devices and devices that have screens up to the bottom 
				'& > div > div:last-child': {
					// height of the spacer at the bottom
					// change this value as you wish :D
					height: '3em',
					// override the display none of the normal status
					display: 'block !important',

					'& > div': {
						// less to "merge" into the div before
						// so in height we account for this "merge"
						top: "-5px",
						height: "calc(100% + 5px)",

						position: "relative",
						borderTop: 0,
						borderRadius: 0,
					},

				},
			},

		},
	},
});

const SlideUp = React.forwardRef<unknown, TransitionProps>(
	function Transition(p, ref) {
		return <Slide direction='up' ref={ref} {...p as any}/>;
	}
);

export function FullScrollDialog(p: ModalProps & DialogProps & {manualClose: () => void}) {
	const theme = useTheme();
	const classes = useStyles();
  const fullScreenMedia = useMediaQuery(theme.breakpoints.down('xs'));

	const {
		fullScreen = fullScreenMedia,
		removePaper,
		onClosed,
		className,
		manualClose,
		...other
	} = p;

  return (
		<Dialog
			PaperComponent={CustomPaper}
			fullScreen={fullScreen}
			{...other}
			scroll='body'
			// scroll={fullScreen ? 'paper' : 'body'}
			PaperProps={{removePaper, onClose: manualClose, fullScreen} as CustomPaperProps}
			TransitionComponent={SlideUp}
			className={clsx(className, classes.root, { [classes.fullScreen]: fullScreen })}
		/>
  );
}


type CustomPaperProps = PaperProps & {
	removePaper?: boolean,
	fullScreen?: boolean,
	onClose?: () => void,
}

/**
 * This is a custom paper wrapper for the dialog component
 * that simply adds a span before the content as to add a scrollable margin on top
 */
class CustomPaper extends React.Component<CustomPaperProps> {

	/**
	 * The initial height of the spacer that will be restored if the user hasn't closed the modal succesfully
	 */
	private restoreSpacerHeight = 0;

	/**
	 * we store the span to change its height to simulate the paper being moved up or down
	 */
	private spacerRef = React.createRef<HTMLElement>();

	/**
	 * control the animation and the closing with swipe down
	 */
	private swipeHandlers = TouchActionUtils.createSwipe({
		// the window scrolled behind
		// and the parent of the dialog that has 1px scroll always present as to not scroll the html behind on ios devices
		ignoreScrollableTargets: ['html', '[role="none presentation"]'],
		y: {minDistance: [100, Infinity]},
		direction: () => 'bottom',
	}, {
		// store the spacer height and disable the animation for better moving
		onStart: (e, s) => {
			// fast movement
			this.spacerRef.current.style.transition = 'none';
			this.restoreSpacerHeight = this.spacerRef.current.offsetHeight;
		},
		// add offset for animating the modal
		onSwiping: (e, s) => {
			const off = e.pageY - s.y;
			// work only on positive scroll, aka down and if the thing is not scrolled
			if (off < 0)
				return;

			this.spacerRef.current.style.minHeight = this.restoreSpacerHeight + (off / 2) + 'px';
		},
		onEnd: (e, s, c) => {
			if (c) {
				this.onClose();
			} 
			// restore the height with animation if the thing hasn't been closed
			else {
				this.spacerRef.current.style.transition = '200ms';
				this.spacerRef.current.style.minHeight = this.restoreSpacerHeight + 'px';
			}
		},
	});


	componentDidMount() {
		if (this.props.fullScreen && DeviceInfoService.isApple()) {
			// keep the scrollable  parent at 1 offset as to have scroll area always present
			// so that safari doesnt scroll the body as overscroll-behaviour is not implemented 3 years later...
			//
			// withouth this fix if we overscroll on top to close the modal, it moves the body behind too
			this.spacerRef.current.parentElement.parentElement.scroll(this.spacerRef.current.scrollLeft, 1);
	
			this.spacerRef.current.parentElement.parentElement.addEventListener('scroll', (e) => {
				const t = (e.target as HTMLElement);
				if (t.scrollTop === 0)
					t.scroll(t.scrollLeft, 1);
			});
		}
	}

	private onClose = () => {
		this.props.onClose && this.props.onClose();
	}

	render() {
		const {
			children,
			removePaper,
			onClose,
			fullScreen,
			...other
		} = this.props;
	
		const child = removePaper 
			? children
			: <Paper>{children}</Paper>;
	
		return (
			<Paper {...other} {...this.swipeHandlers}>
				<span ref={this.spacerRef} onClick={this.onClose}/>
				<div>
					{child}
					{/* use <Paper/> to get the correct colors etc */}
					<div><Paper></Paper></div>
				</div>
			</Paper>
		) ;
	}
}

import React from 'react';
import Dialog, { DialogProps } from '@material-ui/core/Dialog';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { useTheme } from '@material-ui/core/styles';
import { makeStyles } from '@material-ui/core/styles';
import Slide from '@material-ui/core/Slide';
import type { TransitionProps } from '@material-ui/core/transitions/transition';
import type { ModalProps } from '../modal.service.dtd';
import clsx from 'clsx';

const useStyles = makeStyles({
	root: {
		'& > div[role="none presentation"]': {
			marginTop: '2em',
			height: 'calc(100% - 2em)',
			borderTopLeftRadius: '1em',
			borderTopRightRadius: '1em',

			// move content to bottom of screen
			alignItems: 'flex-end',
			display: 'flex',
			'& > div[role="dialog"]': {
				borderTopLeftRadius: '1em',
				borderTopRightRadius: '1em',

				height: 'unset',
				maxHeight: '100%',
			},

		},
	},
	removePaper: {
		'& > div[role="none presentation"] > div[role="dialog"]': {
			backgroundColor: "transparent", 
			boxShadow: "none",
		},
	},
});


const SlideUp = React.forwardRef<unknown, TransitionProps>(
	function Transition(p, ref) {
		return <Slide direction="up" ref={ref} {...p as any}/>;
	}
);

export function FixedHeaderDialog(p: ModalProps & DialogProps) {
	const theme = useTheme();
	const classes = useStyles();
  const fullScreenMedia = useMediaQuery(theme.breakpoints.down('xs'));

	const {
		fullScreen = fullScreenMedia,
		removePaper,
		onClosed,
		className,
		...other
	} = p;

  return (
		<Dialog
			fullScreen={fullScreen}
			{...other}
			scroll={fullScreen ? 'paper' : 'body'}
			TransitionComponent={SlideUp}
			className={clsx(className, {
				[classes.root]: fullScreen,
				[classes.removePaper]: removePaper,
			})}
		/>
  );
}
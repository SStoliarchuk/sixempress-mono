import React from 'react';
import Popper from '@material-ui/core/Popper';
import Button from '@material-ui/core/Button';
import { ElOutline, polygon, TutorialItem } from '../utils';

export interface BCProps {
	data?: TutorialItem | TutorialItem[];
	onClose?: () => void,
}

export function BigCircle(p: BCProps): JSX.Element {

	const items = Array.isArray(p.data) ? p.data : [p.data];
	
	if (items.length === 1) {
		// scroll to view and account for the topbar so scroll a little bit down
		items[0].el.scrollIntoView();
		window.scroll(window.scrollX, window.scrollY - 50);
	}

	return (
		<div className="tutorial-bigcircle-container" style={{clipPath: polygon(items)}}>
			{items.map((i, idx) => (
				<SingleCircle key={"" + items.length + idx} el={i.el} text={i.text} />
			))}
			<div className='tutorial-dismiss-btn-cont'>
				<Button onClick={p.onClose}>Chiudi</Button>
			</div>
		</div>
	);
}

function SingleCircle(p: TutorialItem) {

	const rect = p.el.getBoundingClientRect();

	const longestSideCircle = rect.width > rect.height ? rect.width : rect.height;
	const paddingCircle = 150;
	const totalCircleSize = longestSideCircle + paddingCircle;

	const longestSideCircleBorder = rect.width > rect.height ? rect.width : rect.height;
	const paddingCircleBorder = 450;
	const totalCircleBorderSize = longestSideCircleBorder + paddingCircleBorder;


	const circleStyle: React.CSSProperties = {
		top: rect.top + window.scrollY - totalCircleSize / 2 + rect.height / 2 + "px",
		left: rect.left + window.scrollX - totalCircleSize / 2 + rect.width / 2 + "px",
		width: totalCircleSize + "px",
		height: totalCircleSize + "px",
	};
	const circleBorderStyle: React.CSSProperties = {
		top: rect.top + window.scrollY - totalCircleBorderSize / 2 + rect.height / 2 + "px",
		left: rect.left + window.scrollX - totalCircleBorderSize / 2 + rect.width / 2 + "px",
		width: totalCircleBorderSize + "px",
		height: totalCircleBorderSize + "px",
	};

	return (
		<>
			<div className='tutorial-border-circle' style={circleBorderStyle}></div>
			<div className='tutorial-border' style={circleStyle}></div>
			<ElOutline el={p.el}/>
			{p.text && (
				<Popper className='tutorial-bigcircle-pop' open={true} anchorEl={p.el}>
					{typeof p.text === 'function' ? p.text(p.el) : p.text}
				</Popper>
			)}
		</>
	);
}

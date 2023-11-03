import React from 'react';
import { TutorialOverlayItem } from "../utils";
import HelpOutline from '@material-ui/icons/HelpOutline';

export interface OIProps {
	arr: Array<TutorialOverlayItem>;
	onClick: (idx: number) => void;
}

export function OverlayItem(p: OIProps) {

	const onClick = (e: React.MouseEvent<any>) => {
		e.stopPropagation();
		e.preventDefault();
		const idx = parseInt(e.currentTarget.dataset.idx);
		p.onClick(idx);
	};

	return (
		<>
			{p.arr.map((o, idx) => (
				<div key={"" + p.arr.length + idx} onClick={onClick} className='tutorial-overlay-item' data-idx={idx} style={getTopLeft(o.el)}>
					<HelpOutline/>
				</div>
			))}
		</>
	);
}

function getTopLeft(el: Element): React.CSSProperties {
	const rect = el.getBoundingClientRect();
	return {top: rect.bottom + window.scrollY, left: rect.right + window.scrollX};
}

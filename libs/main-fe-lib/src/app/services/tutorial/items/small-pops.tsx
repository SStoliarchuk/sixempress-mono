import React from 'react';
import { ElOutline, polygon, TutorialItem } from '../utils';
import Popper from '@material-ui/core/Popper';

interface SPProps {
	arr: Array<TutorialItem>;
}

export function SmallPops(p: SPProps) {

	return (
		<div className="tutorial-small-pops-container" style={{clipPath: polygon(p.arr)}}>
			{p.arr.map((o, idx) => (
				<React.Fragment key={"" + p.arr.length + idx}>
					<ElOutline el={o.el}/>
					{o.text && (
						<Popper className='tutorial-pop' open={true} anchorEl={o.el}>
							{typeof o.text === 'function' ? o.text(o.el) : o.text}
						</Popper>
					)}
				</React.Fragment>
			))}
		</div>
	);

}

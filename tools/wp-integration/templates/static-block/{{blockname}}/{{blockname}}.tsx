import './style.scss';
import './edit.scss';
import { registerBlockType } from '@wordpress/blocks';

registerBlockType('seprimio/{{blockname}}', {
	title: '{{blockname}}',
	icon: 'dismiss',
	category: 'seprimio',
	attributes: {},
	edit: (p) => {
		return (
			<div data-block-name="seprimio/{{blockname}}" data-edit="" className={p.className}>
				edit {{blockname}}
			</div>
		)
	},
	save: (p) => {
		return (
			<div data-block-name="seprimio/{{blockname}}">
				save {{blockname}}
			</div>
		)
	}
});

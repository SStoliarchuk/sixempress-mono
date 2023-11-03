import './style.scss';
import './edit.scss';
import { registerBlockType } from '@wordpress/blocks';

registerBlockType('sxmpes/repair-status', {
	title: 'Stato Riparazione',
	icon: 'megaphone',
	category: 'sxmpes',
	edit: ({ className }) => {
		return (
			<a className={className}>
				Stato Riparazione
			</a>
		);
	},
});


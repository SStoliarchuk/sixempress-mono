import './style.scss';
import './edit.scss';
import { registerBlockType } from '@wordpress/blocks';

/**
 * This block type is used in WPRedirects.php, so dont change it please
 */
registerBlockType('sxmpes/repair-status', {
	title: 'repair-status',
	icon: 'dismiss',
	category: 'sxmpes',
	attributes: {},
	edit: (p) => {
		return (
			<div data-block-name="sxmpes/repair-status" data-edit="" className={p.className}>
				Visualizza lo stato della riparazione
			</div>
		)
	},
	save: (p) => {
		return (
			<div data-block-name="sxmpes/repair-status">
				
			</div>
		)
	},
});

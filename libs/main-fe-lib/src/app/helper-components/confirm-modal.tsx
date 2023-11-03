import React from 'react';
import Button from '@material-ui/core/Button';
import { ModalService } from '../services/modal-service/modal.service';
import { OpenModalControls } from '@sixempress/theme';

/**
 * This component is a global confirmation modal
 * 
 * you can open it anywhere and using a callback it will tell what the user chosed
 * if positive or negative outcome
 */
export class ConfirmModalComponent {

	/**
	 * Static variable of logic below to open the confirm modal from anywhere in the app
	 */
	public static open(title: string, content: string | JSX.Element, fn: (response: boolean) => void) {
		let modal: OpenModalControls<any>;

		const respond = (bool: boolean) => { 
			fn(bool); 
			modal.close(); 
		};

		const onKeyPress = (e: React.KeyboardEvent) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				respond(true);
			}
		};

		modal = ModalService.open(
			{
				title,
				// content,
				content: (
					<div tabIndex={1} onKeyDown={onKeyPress}>
						{content}
					</div>
				),
				actions: (
					<>
						<Button onClick={e => respond(false)} color="primary">
							Annulla
						</Button>
						<Button onClick={e => respond(true)} color="primary">
							Conferma
						</Button>
					</>
				)
			},
			{onClosed: (e: any) => respond(false)},
		);
		return modal;
	}

}

import React from 'react';
import { LibNotification } from "../../services/notifications/notifications.dtd";
import { NotificationsService } from "../../services/notifications/notifications.service";
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import Close from '@material-ui/icons/Close';
import IconButton from '@material-ui/core/IconButton';

interface NSState {
	notfs: LibNotification[],
}

interface NSProps {
	onCloseMenu: () => void,
}

export class NotificationsStack extends React.Component<NSProps, NSState> {

	state: NSState = {
		notfs: [],
	};

	componentDidMount() {
		this.handlers.onNotificationUpdate();
		NotificationsService.notificationsUpdate.registerAction(this.handlers.onNotificationUpdate);
	}
	componentWillUnmount() {
		NotificationsService.notificationsUpdate.removeAction(this.handlers.onNotificationUpdate);
	}


	private handlers = {
		onNotificationUpdate: () => {
			const n = [...NotificationsService.notifications].sort(i => i.dismissable !== false ? -1 : 1);
			this.setState({notfs: n});
		},
		onClick: (e: React.MouseEvent<any>) => {
			const id = e.currentTarget.dataset.id;
			const ntf = this.state.notfs.find(i => i.id === id);
			if (!ntf || !ntf.onClick)
				return;

			ntf.onClick(e);
			this.props.onCloseMenu();

			if (ntf.onClickDismiss !== false)
				NotificationsService.removeNotification(id);
		},
		onCloseNotf: (e: React.MouseEvent<any>) => {
			const id = e.currentTarget.dataset.id;
			NotificationsService.removeNotification(id);
		},
		onClickAction: (e: React.MouseEvent<any>) => {
			const id = e.currentTarget.dataset.id;
			const idx = e.currentTarget.dataset.idx;
			
			const ntf = this.state.notfs.find(i => i.id === id);
			if (!ntf)
				return;

			const act = ntf.actions && ntf.actions[idx];
			if (act.onClick)
				act.onClick(e);

			if (act.dismiss !== false)
				NotificationsService.removeNotification(id);
		}
	}

	render () {
		return (
			<div className='notfs-container'>
				{this.state.notfs.map(n => (
					<Paper key={n.id}>
						{n.dismissable !== false && (
							<IconButton size='small' onClick={this.handlers.onCloseNotf} data-id={n.id}>
								<Close/>
							</IconButton>
						)}
						<div className={n.onClick ? 'mouse-link' : ''} data-id={n.id} onClick={this.handlers.onClick}>
							{n.title}<br/>
							<small>{n.content}</small>
						</div>
						<div>
							{(n.actions || []).map((i, idx) => (
								<Button 
									key={'' + n.actions.length + idx} 
									size='small' 
									data-id={n.id} 
									data-idx={idx} 
									onClick={this.handlers.onClickAction}
								>
									{i.title}
								</Button>
							))}
						</div>
					</Paper>
				))}
			</div>
		);
	}
}
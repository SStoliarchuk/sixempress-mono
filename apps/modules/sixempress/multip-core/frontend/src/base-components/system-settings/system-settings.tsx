import React from 'react';
import Box from '@material-ui/core/Box';
import { SSState } from './dtd';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
// import { SystemUsage } from './system-usage/system-usage';
import { Settings } from './settings/settings';


export class SystemSettings extends React.Component<{}, SSState> {

	state: SSState = {
		selectedPage: 1,
		enabledPages: {
			usage: true,
			settings: true,
		},
	};

	private navigateHandler = (e: React.MouseEvent<any>) => {
		const val = e.currentTarget.dataset.tabN;
		this.setState({selectedPage: parseInt(val)});
	}


	render() {
		return <Settings/>
		
		// if (!this.state.enabledPages.settings) {
		// 	return <SystemUsage/>;
		// }
		// // show the tab selector
		// else {
		// 	return (
		// 		<>
		// 			<Box mb={2}>
		// 				<Tabs
		// 					value={this.state.selectedPage}
		// 					indicatorColor="primary"
		// 					textColor="primary"
		// 				>
		// 					<Tab label="Dati Utilizzo" data-tab-n={0} onClick={this.navigateHandler}/>
		// 					<Tab label="Impostazioni" data-tab-n={1} onClick={this.navigateHandler}/>
		// 				</Tabs>
		// 			</Box>
					
		// 			{
		// 				this.state.selectedPage === 0
		// 					? ( <SystemUsage/> ) 
		// 					: ( <Settings/> )
		// 			}
		// 		</>
		// 	);
		// }
	}
	
}

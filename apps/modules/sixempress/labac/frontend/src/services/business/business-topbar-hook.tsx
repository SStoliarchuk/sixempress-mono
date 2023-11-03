import React from 'react';
import Badge from '@material-ui/core/Badge';
import ArrowDropDown from '@material-ui/icons/ArrowDropDown';
import Button from '@material-ui/core/Button';
import { HookReact } from "@stlse/frontend-connector";
import { BusinessLocationsService } from "./business-locations.service";
import Typography from '@material-ui/core/Typography';
import Check from '@material-ui/icons/Check';
import MenuItem from '@material-ui/core/MenuItem';
import Popover, { PopoverOrigin } from '@material-ui/core/Popover';
import Menu from '@material-ui/core/Menu';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import { FieldsFactory, RouterService, UiTransferContext } from '@sixempress/main-fe-lib';


export const BusinessLocationServiceHooks: HookReact = {
  // if there are more thatn 1 locations then show only the business locations topbar with select. Otherwise show all
  sxmp_main_wrapper_topbar_center_content: (p, l) => BusinessLocationsService.getLocationsFilteredByUser(false).length > 1 ? [BusinessTopbarSettings] : l,
};

interface BTSState {
	choseLocationMenuAnchor: null | HTMLElement,
	addChosenLocationFilter: boolean,
	addChosenLocationContent: boolean,
	chosenLocationId: string,
}


class BusinessTopbarSettings extends React.Component<{}, BTSState> {

  state: BTSState = {
    choseLocationMenuAnchor: null, 
		addChosenLocationFilter: BusinessLocationsService.addChosenLocationFilter,
		addChosenLocationContent: BusinessLocationsService.addChosenLocationContent,
		chosenLocationId: BusinessLocationsService.chosenLocationId,
  }
  
  private anchorInfo: PopoverOrigin = {
		vertical: 'top',
		horizontal: 'center',
	};
  
  	
	private handlers = {
		onChangeLocation: (e: React.MouseEvent<any>) => {
			const val = e.currentTarget.dataset.location || undefined;
			if (val === BusinessLocationsService.chosenLocationId) { return; }
	
			BusinessLocationsService.chosenLocationId = val;
			
			// use the service value as to be sure we get the correct actual value
			this.setState({chosenLocationId: BusinessLocationsService.chosenLocationId});
			// remove the location filter if no location
			if (!val) { this.setLocationFilter(false); }
	
			RouterService.reloadPage();
		},
		onClickToggleLocationMenu: (e?: React.MouseEvent<any>) => {
			this.setState({choseLocationMenuAnchor: this.state.choseLocationMenuAnchor || !e ? null : e.currentTarget});
		},
		onClickToggleLocationFilter: () => {
			this.setLocationFilter(!BusinessLocationsService.addChosenLocationFilter);
		},
		onClickToggleLocationContentFilter: () => {
			this.setLocationContentFilter(!BusinessLocationsService.addChosenLocationContent);
		},
	}

  private setLocationFilter = (val: boolean) => {
		val = Boolean(val);
		if (BusinessLocationsService.addChosenLocationFilter === val) {
			return;
		}

		BusinessLocationsService.addChosenLocationFilter = val;
		this.setState({addChosenLocationFilter: BusinessLocationsService.addChosenLocationFilter});
		RouterService.reloadPage();
	}

	private setLocationContentFilter = (val: boolean) => {
		val = Boolean(val);
		if (BusinessLocationsService.addChosenLocationContent === val) {
			return;
		}

		BusinessLocationsService.addChosenLocationContent = val;
		this.setState({addChosenLocationContent: BusinessLocationsService.addChosenLocationContent});
		RouterService.reloadPage();
	}

	
  render() {
    if (BusinessLocationsService.getLocationsFilteredByUser(false).length === 1)
      return null;

    const uiLocs = BusinessLocationsService.formatLocationsForSelect(BusinessLocationsService.getLocationsFilteredByUser(false));
    return (
      <UiTransferContext>
        <Menu
          className='mw-location-menu'
          keepMounted
          anchorEl={this.state.choseLocationMenuAnchor}
          open={Boolean(this.state.choseLocationMenuAnchor)}
          onClose={this.handlers.onClickToggleLocationMenu}
          anchorOrigin={this.anchorInfo}
          transformOrigin={this.anchorInfo}
        >
          <MenuItem onClick={this.handlers.onChangeLocation}>
            <ListItemIcon>
              {!this.state.chosenLocationId && (<Check color='primary' />)}
            </ListItemIcon>
            <Typography variant="inherit">VISTA GLOBALE</Typography>
          </MenuItem>
          {uiLocs.map((l, idx) => (
            <MenuItem key={l.value} data-location={l.value} onClick={this.handlers.onChangeLocation}>
              <ListItemIcon>
                {this.state.chosenLocationId === l.value && (<Check color='primary' />)}
              </ListItemIcon>
              <Typography variant="inherit">{l.label}</Typography>
            </MenuItem>
          ))}
          {this.state.chosenLocationId && uiLocs.length !== 1 && (
            <>
              <FieldsFactory.Switch
                label="Filtra visibilita'"
                checked={this.state.addChosenLocationFilter}
                onChange={this.handlers.onClickToggleLocationFilter}
                formControlProps={{labelPlacement: 'start'}}
              />
              <br/>
              <FieldsFactory.Switch
                label="Filtra contenuto"
                checked={this.state.addChosenLocationContent}
                onChange={this.handlers.onClickToggleLocationContentFilter}
                formControlProps={{labelPlacement: 'start'}}
              />
            </>
          )}
        </Menu>

        <Badge color="error" variant={(this.state.addChosenLocationFilter || this.state.addChosenLocationContent) ? 'dot' : undefined} className='mui-badge-fix'>
          <Button style={{textAlign: 'left'}} onClick={this.handlers.onClickToggleLocationMenu}>
            {
              BusinessLocationsService.chosenLocationId 
                ? BusinessLocationsService.getNameById(BusinessLocationsService.chosenLocationId)
                : "Vista GLOBALE"
            }
            <ArrowDropDown/>
          </Button>
        </Badge>
      </UiTransferContext>
    )
  }

}

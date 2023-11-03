import './inventory-categories.css';
import React from 'react';
import TreeView from '@material-ui/lab/TreeView';
import TreeItem, { TreeItemProps } from '@material-ui/lab/TreeItem';
import Paper from '@material-ui/core/Paper';
import Box from '@material-ui/core/Box';
import Create from '@material-ui/icons/Create';
import Delete from '@material-ui/icons/Delete';
import { ConfirmModalComponent, ObjectUtils, FetchableField, ModalComponentProps } from '@sixempress/main-fe-lib';
import { AuthService } from '@sixempress/abac-frontend';
import { ModelClass } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/model-class';
import { Attribute } from 'apps/modules/sixempress/multip-core/frontend/src/utils/enums/attributes';
import Popover from '@material-ui/core/Popover';
import Container from '@material-ui/core/Container';
import LibraryAdd from '@material-ui/icons/LibraryAdd';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import { InventoryCategory } from './InventoryCategories';
import Switch from '@material-ui/core/Switch';
import { IICLProps, IICLState, ICategoriesTreeItem, MinusSquare, PlusSquare, CloseSquare } from './util-components';
import { InventoryCategoryController } from './InventoryCategory.controller';
import Tooltip from '@material-ui/core/Tooltip';

export class ProductCategoriesList extends React.Component<ModalComponentProps & IICLProps, IICLState> {

	controller = new InventoryCategoryController();

	state: IICLState = {
		enableModify: false,

		addPopover: null,
		modifyPopover: null,
	};

	cache: {
		catIdHm: any,
		attrs: {modify: boolean, delete: boolean, add: boolean},
		tree?: JSX.Element[],
	} = {
		catIdHm: {},
		attrs: {
			modify: AuthService.isAttributePresent(Attribute.modifyInventoryCategories), 
			delete: AuthService.isAttributePresent(Attribute.deleteInventoryCategories), 
			add: AuthService.isAttributePresent(Attribute.addInventoryCategories), 
		}
	};


	// create the catIdHm from the categories in the DB
	componentDidMount() {
		this.createTree();
	}

	private createTree() {
		this.controller.getMulti()
		.then(res => {
			const hm = ObjectUtils.arrayToHashmap(res.data, '_id');
			this.setModifyState(res.data.length === 0);
			this.setState({catIdHm: hm});
		});
	}


	/**
	 * outside here just for performance
	 */
	private getTreeItem(c: ICategoriesTreeItem) {
		return (
			<this.StyledTreeItem 
				key={c._id} 
				cat_id={c._id} 
				nodeId={c._id} 
				label={c.name} 
				children={c.__jsx_children}
			/>
		);
	}

	/**
	 * Creates the LOGIC tree of the categories
	 */
	private buildCategoriesTree(allCategories: ICategoriesTreeItem[]): JSX.Element[] {

		const idHm: {[id: string]: ICategoriesTreeItem} = {};
		const toR: JSX.Element[] = [];

		for (let i = 0; i < allCategories.length; i += 1) {
			const c = allCategories[i];
			idHm[c._id] = c;
			c.__jsx_children = [];
			c.__jsx = this.getTreeItem(c);
		}

		for (let i = 0; i < allCategories.length; i += 1) {
			const c = allCategories[i];
			if (c.extends) {
				idHm[c.extends.id].__jsx_children.push(this.getTreeItem(c));
			} 
			else {
				toR.push(c.__jsx);
			}
		}

		return toR;
	}


	/**
	 * Handles the delete of a category
	 */
	private handleDeleteCategory = (e: React.MouseEvent<any>) => {

		e.stopPropagation();
		const cat = this.state.catIdHm[e.currentTarget.dataset.catId];

		const message = cat.extends 
			? 'Eliminando questa categoria, tutti i prodotti che vi appartenevano verrano cambieranno la propria categoria in: ' + this.state.catIdHm[cat.extends.id].name
			: 'Eliminando questa categoria, tutti i prodotti che vi appartenevano avranno categoria nulla';

		ConfirmModalComponent.open('Eliminazione Categoria', message, (res) => {
			if (res) {
				this.controller.deleteSingle(cat._id).then(res => {
					this.setState(s => {
						const catId = {...s.catIdHm};
						delete catId[cat._id];

						for (const k in catId) {
							if (catId[k]._parentsTree && catId[k]._parentsTree.includes(cat._id)) {
								delete catId[k];
							}
						}
						
						return {catIdHm: catId};
					});
				});
			}
		});
	}

	/**
	 * Allows you to animate the transition withouth having to setState again
	 * because the tree will be regenareted
	 */
	private setModifyState = (toSet: boolean) => {
		const els = Array.from(document.getElementsByClassName('control-container'));
		if (toSet) {
			for (const e of els) {
				if (!e.className.includes(' open ')) {
					e.className += ' open ';
				}
			}
		} 
		else {
			for (const e of els) {
				if (e.className.includes(' open ')) {
					e.className = e.className.replace(' open ', '');
				}
			}
		}
		this.setState({enableModify: toSet});
	}

	/**
	 * Adds the buttons to enable the modification of the tree
	 */
	private toggleModify = (e?: any) => this.setModifyState(!this.state.enableModify);

	/**
	 * Closes the add and modify popovers
	 */
	private closePopover = (e?: any) => this.setState({modifyPopover: null, addPopover: null});

	/**
	 * Opens the cat name editor
	 */
	private openCatEditor = (e: React.MouseEvent<any>) => {
		e.stopPropagation();
		const cat = this.state.catIdHm[e.currentTarget.dataset.catId]
		this.setState({ modifyPopover: { anchor: e.currentTarget, targetCategory: cat, name: cat.name, } });
	}

	/**
	 * Opens the add class popover
	 */
	private openCatAddHandler = (e: React.MouseEvent<any>) => {
		e.stopPropagation();
		const parentOfTheCategoryToAdd = this.state.catIdHm[e.currentTarget.dataset.parentId]
		this.setState({addPopover: { anchor: e.currentTarget, parent: parentOfTheCategoryToAdd, name: '' }});
	}


	/**
	 * Handle to change the name of a category
	 */
	private changeCatName = (mode: "add" | "modify") => (e?: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		if (mode === 'add') {
			this.setState({addPopover: {...this.state.addPopover, name: value}});
		} else {
			this.setState({modifyPopover: {...this.state.modifyPopover, name: value}});
		}
	}

	private changeCatGroup = (mode: 'add' | "modify") => (e: React.ChangeEvent<any>) => {
		const value = e.target.value;
		if (mode === 'add') {
			this.setState({addPopover: {...this.state.addPopover}});
		} else {
			this.setState({modifyPopover: {...this.state.modifyPopover}});
		}
	}

	/**
	 * saves the changes for an edited category
	 */
	private saveCatChanges = (mode: 'add' | 'modify') => (e?: any) => {

		if (mode === 'add') {

			const pop = this.state.addPopover;

			if (!pop.name) {
				return;
			}

			// create the obj to post
			const obj: InventoryCategory = { 
				name: pop.name,
				documentLocationsFilter: ['*'],
			};
			

			// add extended details
			if (pop.parent) {
				obj.extends = new FetchableField(pop.parent._id, ModelClass.InventoryCategory);
				if (pop.parent.group) {
					obj.group = pop.parent.group;
				}
			}

			// save the object and add the created object to the state
			this.controller.post(obj).then(updated => {
				this.setState(s => {
					const catIds = {...s.catIdHm};
					catIds[updated._id] = updated;
					return { catIdHm: catIds, addPopover: null, modifyPopover: null };
				});
			});

		} 
		// update the obj
		else {

			const pop = this.state.modifyPopover;

			// dont if nothing has changed
			if (pop.name === pop.targetCategory.name) {
				return;
			}
			
			const toPut: ICategoriesTreeItem = {
				...pop.targetCategory, 
				name: pop.name
			};
			delete toPut.__jsx_children;
			delete toPut.__jsx;

			// yeet
			this.controller.put(pop.targetCategory._id, toPut)
			.then(updated => {
				this.setState(s => {
					const catIds = {...s.catIdHm};
					catIds[pop.targetCategory._id].name = pop.name;
					return { catIdHm: catIds, addPopover: null, modifyPopover: null };
				});
	
			});
		}
	}


	render() {
		
		if (!this.state.catIdHm) { return (null); }


		let tree = this.cache.tree;
		if (!tree || this.cache.catIdHm !== this.state.catIdHm) {
			this.cache.catIdHm = this.state.catIdHm;
			this.cache.tree = this.buildCategoriesTree(Object.values(this.state.catIdHm));
			tree = this.cache.tree;
		}

		return (
			<Container id='category-container' component='div' maxWidth='lg' disableGutters={true}>
				<Paper>
					<Box p={2}>

						{(this.state.addPopover || this.state.modifyPopover) && (
							<Popover
								open={Boolean((this.state.addPopover || this.state.modifyPopover).anchor)}
								anchorEl={(this.state.addPopover || this.state.modifyPopover).anchor}
								onClose={this.closePopover}
								anchorOrigin={{vertical: 'center', horizontal: 'center', }}
								transformOrigin={{vertical: 'center', horizontal: 'left', }}
							>
								<Box p={2} pb={1}>
									<TextField
										label={
											this.state.addPopover
											? 'Nuova categoria' 
											: this.state.modifyPopover
												? 'Rinomina'
												: 'Chiusura..'
										}
										fullWidth
										defaultValue={this.state.addPopover ? '' : this.state.modifyPopover.name}
										onChange={this.changeCatName(this.state.addPopover ? "add" : "modify")}
									/>
									<Box textAlign='right'>
										<Button color='primary' onClick={this.saveCatChanges(this.state.addPopover ? "add" : "modify")}>
											Salva
										</Button>
									</Box>
								</Box>
							</Popover>
						)}


						<Box mb={1} display='flex' alignItems='center'>
						{(this.cache.attrs.add || this.cache.attrs.delete || this.cache.attrs.modify) && (
							<div>
								Abilita Modifica
								<Switch color="primary" onClick={this.toggleModify} checked={this.state.enableModify} />
							</div>
						)}
						</Box>

						<TreeView
							defaultExpanded={Object.keys(this.state.catIdHm)}
							defaultCollapseIcon={<MinusSquare />}
							defaultExpandIcon={<PlusSquare />}
							defaultEndIcon={<CloseSquare />}
						>
							{tree}
						</TreeView>

						{this.cache.attrs.add && (
							<Box height={this.state.enableModify ? '2.2em' : '0px'} overflow='hidden' style={{transition: '250ms'}}>
								<Button onClick={this.openCatAddHandler} color='primary' size='small' >+ Aggiungi categoria principale</Button>
							</Box>
						)}
					</Box>
				</Paper>
			</Container>
		);
	}

	/**
	 * Single voice in the tree
	 */
	private StyledTreeItem = (props: TreeItemProps & { cat_id: string }) => (
		<TreeItem
			className="treeItemLi"
			classes={{iconContainer: "iconContainer", group: "group"}}
			{...props}
			label={(
				<div className="hover-handler">
				
					<div className={this.state.enableModify ? 'control-container open' : "control-container"}>
						{!this.props.selectCategoryMode && this.cache.attrs.delete && (
							<Tooltip title="Elimina categoria">
								<Delete data-cat-id={props.cat_id} onClick={this.handleDeleteCategory}/>
							</Tooltip>
						)}
						{!this.props.selectCategoryMode && this.cache.attrs.modify && (
							<Tooltip title="Modifica nome">
								<Create data-cat-id={props.cat_id} onClick={this.openCatEditor}/>
							</Tooltip>
						)}
						{this.cache.attrs.add && (
							<Tooltip title="Aggiungi sotto-categoria">
								<LibraryAdd data-parent-id={props.cat_id} onClick={this.openCatAddHandler}/>
							</Tooltip>
						)}
					</div>

					<div>
						{this.props.selectCategoryMode 
							? (
								<span
									className="selectCategoryName"
									onClick={(e) => {
										e.stopPropagation(); 
										const cat: ICategoriesTreeItem = { ...this.state.catIdHm[props.cat_id] }
										delete cat.__jsx;
										delete cat.__jsx_children;
										if (this.props.modalRef) { this.props.modalRef.close(); }
										this.props.selectCategoryMode.selectFn(cat)
									}}
								>
								{props.label}	
								</span>
							) 
							: props.label
						}
					</div>
				</div>
			)}
		/>
	)

	

}



/**
 * For custom attributes found in the SingleClientAbstract
 * Start the values from 1000,
 * The first 1000 values should be private values for the system
 * 
 * The logic of the attributes should be that every attribute ADDS a feature to the system
 * ATTRIBUTES SHOULD NOT BE USED TO PREVENT A FEATURE, ONLY TO ADD A FEATURE
 * 
 */
export const Attribute = {
	changeSystemContentConfig: 'sx_sc',

	viewCustomers: 10000,
	addCustomers: 10001,
	modifyCustomers: 10002,
	deleteCustomers: 10003,

	// 11000 is blocked

	// temporary disabling this viewProductMovements stuff
	// because it need recursive attr check to be sure that when you sellproduct
	// you can see the amount
	// TODO fix 
	viewProductMovements: 12000,
	addProductMovements: 12001,
	modifyProductMovements: 12002,
	
	viewProducts: 13000,
	addProducts: 13001,
	modifyProducts: 13002,
	deleteProducts: 13003,
	viewProductsReport: 13004,
	viewProductBuyPrice: 13005,
	viewProductSellPrice: 13006,

	viewInventoryCategories: 14000,
	addInventoryCategories: 14001,
	modifyInventoryCategories: 14002,
	deleteInventoryCategories: 14003,

	// 15000 -> 17000 is blocked

	viewSales: 18000,
	addSales: 18001,
	modifySales: 18002,
	deleteSales: 18003,
	viewSaleNetReport: 18004,
	allowSaleDiscount: 18005,

	viewMovements: 19000,
	addMovements: 19001,
	modifyMovements: 19002,
	deleteMovements: 19003,
	/**
	 * The movements has an option
	 * that they are hidden to all the users
	 * that don't have this attribute
	 */
	viewHiddenMovements: 19004,
	viewAllTimeMovements: 19005,
	viewMovementsReport: 19006,
	// viewSplitMovementReport= 19007,
	
	viewSuppliers: 21000,
	addSuppliers: 21001,
	modifySuppliers: 21002,
	deleteSuppliers: 21003,

	// 22000 -> 23000 is blocked

	viewRawFiles: 24000,
	addRawFiles: 24001,
	modifyRawFiles: 24002,
	deleteRawFiles: 24003,

	// 25000 -> 27000 is blocked

	viewProductVariants: 28000,
	addProductVariants: 28001,
	modifyProductVariants: 28002,
	deleteProductVariants: 28003,

	viewCustomerOrder: 29000,
	addCustomerOrder: 29001,
	modifyCustomerOrder: 29002,
	deleteCustomerOrder: 29003,

	// 30000 -> 34000 is blocked

	viewCustomerReturns: 35000,
	addCustomerReturns: 35001,
	modifyCustomerReturns: 35002,
	deleteCustomerReturns: 35003,

	viewExternalConnection: 36000,
	addExternalConnection: 36001,
	modifyExternalConnection: 36002,
	deleteExternalConnection: 36003,

	// 37000 -> 38000 is blocked

	viewInternalOrder: 39000,
	addInternalOrder: 39001,
	modifyInternalOrder: 39002,
	deleteInternalOrder: 39003,

	viewTransferOrder: 40000,
	addTransferOrder: 40001,
	modifyTransferOrder: 40002,
	deleteTransferOrder: 40003,

	viewSaleAnalysis: 41000,
	addSaleAnalysis: 41001,
	modifySaleAnalysis: 41002,
	deleteSaleAnalysis: 41003,

	viewDashboard: 42000,

	viewSupplierReturn: 43000,
	addSupplierReturn: 43001,
	modifySupplierReturn: 43002,
	deleteSupplierReturn: 43003,

	viewCoupon: 44000,
	addCoupon: 44001,
	modifyCoupon: 44002,
	deleteCoupon: 44003,
}


// DO NOT COPY BELOW THIS LINE
export const AttributeLabel = {
	[Attribute.changeSystemContentConfig]        :  'Cambiare informazioni dell\'attivita\'',

	[Attribute.viewCustomers]                    :  'Visualizzare Clienti',
	[Attribute.addCustomers]                     :  'Aggiungere Clienti',
	[Attribute.modifyCustomers]                  :  'Modificare Clienti',
	[Attribute.deleteCustomers]                  :  'Eliminare Clienti',

	[Attribute.viewProductMovements]             :  'Visualizzare Quantita\' Prodotti',
	[Attribute.addProductMovements]              :  'Aggiungere Quantita\' Prodotti',
	[Attribute.modifyProductMovements]           :  'Modificare Giacenza Prodotti',

	[Attribute.viewProducts]                     :  'Visualizzare Prodotti',
	[Attribute.addProducts]                      :  'Aggiungere Prodotti',
	[Attribute.modifyProducts]                   :  'Modificare Prodotti',
	[Attribute.deleteProducts]                   :  'Eliminare Prodotti',
	[Attribute.viewProductsReport]               :  'Visualizzare Report dati Prodotti',
	[Attribute.viewProductBuyPrice]              :  'Visualizzare Prezzo d\'acquisto Prodotto',
	[Attribute.viewProductSellPrice]             :  'Visualizzare Prezzo di vendita Prodotto',

	[Attribute.viewInventoryCategories]          :  'Visualizzare Categorie',
	[Attribute.addInventoryCategories]           :  'Aggiungere Categorie',
	[Attribute.modifyInventoryCategories]        :  'Modificare Categorie',
	[Attribute.deleteInventoryCategories]        :  'Eliminare Categorie',

	[Attribute.viewSales]                        :  'Visualizzare Vendite',
	[Attribute.addSales]                         :  'Aggiungere Vendite',
	[Attribute.modifySales]                      :  'Modificare Vendite',
	[Attribute.deleteSales]                      :  'Eliminare Vendite',
	[Attribute.viewSaleNetReport]                :  'Visualizzare Analisi Netto',
	[Attribute.allowSaleDiscount]                :  'Impostare sconto Vendita',

	[Attribute.viewMovements]                    :  'Visualizzare Movimenti',
	[Attribute.addMovements]                     :  'Aggiungere Movimenti',
	[Attribute.modifyMovements]                  :  'Modificare Movimenti',
	[Attribute.deleteMovements]                  :  'Eliminare Movimenti',
	[Attribute.viewHiddenMovements]              :  'Movimenti Nascosti',
	[Attribute.viewAllTimeMovements]             :  'Tabella Movimenti Completa',
	[Attribute.viewMovementsReport]              :  'Report dati Movimenti',
	// [Attribute.viewSplitMovementReport]          :  'Report Movimenti suddivisi',

	[Attribute.viewSuppliers]                    :  'Visualizzare Fornitori',
	[Attribute.addSuppliers]                     :  'Aggiungere Fornitori',
	[Attribute.modifySuppliers]                  :  'Modificare Fornitori',
	[Attribute.deleteSuppliers]                  :  'Eliminare Fornitori',

	[Attribute.viewRawFiles]                     :  'Visualizzare File e Documenti',
	[Attribute.addRawFiles]                      :  'Aggiungere File e Documenti',
	[Attribute.modifyRawFiles]                   :  'Modificare File e Documenti',
	[Attribute.deleteRawFiles]                   :  'Eliminare File e Documenti',

	[Attribute.viewProductVariants]              :  "Visualizzare Variazioni Salvate",
	[Attribute.addProductVariants]               :  "Aggiungere Variazioni Salvate",
	[Attribute.modifyProductVariants]            :  "Modificare Variazioni Salvate",
	[Attribute.deleteProductVariants]            :  "Eliminare Variazioni Salvate",

	[Attribute.viewCustomerOrder]                :  "Visualizzare Ordini Cliente",
	[Attribute.addCustomerOrder]                 :  "Aggiungere Ordini Cliente",
	[Attribute.modifyCustomerOrder]              :  "Modificare Ordini Cliente",
	[Attribute.deleteCustomerOrder]              :  "Eliminare Ordini Cliente",

	[Attribute.viewCustomerReturns]              :  "Visualizzare Reso Cliente",
	[Attribute.addCustomerReturns]               :  "Aggiungere Reso Cliente",
	[Attribute.modifyCustomerReturns]            :  "Modificare Reso Cliente",
	[Attribute.deleteCustomerReturns]            :  "Eliminare Reso Cliente",

	[Attribute.viewExternalConnection]           :  "Visualizzare Connesioni Esterne",
	[Attribute.addExternalConnection]            :  "Aggiungere Connesioni Esterne",
	[Attribute.modifyExternalConnection]         :  "Modificare Connesioni Esterne",
	[Attribute.deleteExternalConnection]         :  "Eliminare Connesioni Esterne",

	[Attribute.viewInternalOrder]                :  "Visualizzare Ordini Interni",
	[Attribute.addInternalOrder]                 :  "Aggiungere Ordini Interni",
	[Attribute.modifyInternalOrder]              :  "Modificare Ordini Interni",
	[Attribute.deleteInternalOrder]              :  "Eliminare Ordini Interni",

	[Attribute.viewTransferOrder]                :  "Visualizzare Ordine Trasferimento",
	[Attribute.addTransferOrder]                 :  "Aggiungere Ordine Trasferimento",
	[Attribute.modifyTransferOrder]              :  "Modificare Ordine Trasferimento",
	[Attribute.deleteTransferOrder]              :  "Eliminare Ordine Trasferimento",

	[Attribute.viewSaleAnalysis]                 :  "Visualizzare Analisi Vendite",
	[Attribute.addSaleAnalysis]                  :  "Aggiungere Analisi Vendite",
	[Attribute.modifySaleAnalysis]               :  "Modificare Analisi Vendite",
	[Attribute.deleteSaleAnalysis]               :  "Eliminare Analisi Vendite",

	[Attribute.viewDashboard]                    :  "Visualizzare Dashboard",

	[Attribute.viewSupplierReturn]               :  "Visualizzare Reso Fornitore",
	[Attribute.addSupplierReturn]                :  "Aggiungere Reso Fornitore",
	[Attribute.modifySupplierReturn]             :  "Modificare Reso Fornitore",
	[Attribute.deleteSupplierReturn]             :  "Eliminare Reso Fornitore",

	[Attribute.viewCoupon]                       :  "Visualizzare Buono Cassa",
	[Attribute.addCoupon]                        :  "Aggiungere Buono Cassa",
	[Attribute.modifyCoupon]                     :  "Modificare Buono Cassa",
	[Attribute.deleteCoupon]                     :  "Eliminare Buono Cassa",

}

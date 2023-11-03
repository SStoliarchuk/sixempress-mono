
export interface CardsResponse {
	clients: {
		today: number,
		total: number,
	},
	orders: {
		today: number,
		toComplete: number,
	},
	products: {
		sold: number,
		total: number,
	},
	returns: {
		today: number,
		total: number,
	},
	sales: {
		today: number,
		total: number,
	},
	movements: {
		in: number,
		out: number,
	},
	analysis: {
		net: number,
		toPay: number,
	},
	site: {
		connected?: false | true, 
		stockIssue?: 'loading' | false | true
	},
}
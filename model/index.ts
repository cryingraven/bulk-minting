export interface NFTMetadata {
	spec: string
	symbol: string
	name: string
	icon: string | undefined
	base_uri: string | undefined
	reference: string | undefined
	reference_hash: string | undefined
}

export interface Royalty {
	[account: string]: number
}

export interface Royalties {
	accounts: Royalty
	percent: number
}

export interface Sale {
	royalties: Royalties
	initial_royalties: Royalties
	price: string
}

export interface CollectionData {
	account_id: string
	base_url: string
	collection_id: string
	collection_name: string
	num_of_tokens: number
	collection_description: string | undefined
	collection_media: string | undefined
	price: string | undefined
}

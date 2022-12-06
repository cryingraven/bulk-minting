import { utils } from 'near-api-js'
import { NFTMetadata, Sale } from '../model'
import { NearWallet } from './NearWallet'

export class BulKContract {
	contractId: any
	wallet: NearWallet
	constructor(contractId: any, walletToUse: NearWallet) {
		this.contractId = contractId
		this.wallet = walletToUse
	}

	async create_nft_contract(
		accountId: string,
		metadata: NFTMetadata,
		supply: number,
		sale: Sale
	) {
		await this.wallet.callMethod(
			this.contractId,
			'create_nft_contract',
			{
				collection: accountId,
				metadata,
				supply,
				sale,
			},
			'30000000000000',
			utils.format.parseNearAmount('10')?.toString()
		)
	}
}

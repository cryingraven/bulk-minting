import { utils } from 'near-api-js'
import { NFTMetadata, Sale } from '../model'
import { DEFAULT_GAS, NearWallet } from './NearWallet'

interface CheckResult {
	result: boolean
}

export class BulKContract {
	contractId: any
	wallet: NearWallet
	constructor(contractId: any, walletToUse: NearWallet) {
		this.contractId = contractId
		this.wallet = walletToUse
	}

	async checkContract(accountId: string) {
		const result = await this.wallet.viewMethod(
			this.contractId,
			'check_contract_exist',
			{
				nft_account_id: accountId,
			}
		)
		return result as CheckResult
	}

	async create_nft_contract(
		accountId: string,
		metadata: NFTMetadata,
		supply: number,
		sale: Sale
	) {
		const publicKey = await this.wallet.generateKey(accountId)
		await this.wallet.callMethod(
			this.contractId,
			'create_nft_contract',
			{
				collection: accountId,
				public_key: publicKey.toString(),
				metadata,
				supply,
				sale,
			},
			DEFAULT_GAS,
			utils.format.parseNearAmount('10')?.toString()
		)
	}
}

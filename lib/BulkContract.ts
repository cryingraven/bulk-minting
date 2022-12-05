import { NearWallet } from './NearWallet'

export class BulKContract {
	contractId: any
	wallet: NearWallet
	constructor(contractId: any, walletToUse: NearWallet) {
		this.contractId = contractId
		this.wallet = walletToUse
	}
}

import { providers } from 'near-api-js'

import '@paras-wallet-selector/modal-ui/styles.css'
import { setupModal } from '@paras-wallet-selector/modal-ui'
import MyNearIconUrl from '@paras-wallet-selector/my-near-wallet/assets/my-near-wallet-icon.png'
import NearIconUrl from '@paras-wallet-selector/near-wallet/assets/near-wallet-icon.png'
import SenderIconUrl from '@paras-wallet-selector/sender/assets/sender-icon.png'

import {
	NetworkId,
	setupWalletSelector,
	Wallet,
	WalletSelector,
} from '@paras-wallet-selector/core'
import { setupMyNearWallet } from '@paras-wallet-selector/my-near-wallet'
import { setupNearWallet } from '@paras-wallet-selector/near-wallet'
import { setupSender } from '@paras-wallet-selector/sender'
const THIRTY_TGAS = '30000000000000'
const NO_DEPOSIT = '0'
interface QueryResult {
	result: any
}
export class NearWallet {
	walletSelector: WalletSelector | undefined
	wallet: Wallet | undefined
	network: NetworkId
	createAccessKeyFor: string | undefined
	accountId: string | undefined
	constructor(
		createAccessKeyFor: string | undefined = undefined,
		network = 'testnet'
	) {
		this.createAccessKeyFor = createAccessKeyFor
		this.network = 'testnet'
	}

	async startUp() {
		this.walletSelector = await setupWalletSelector({
			network: this.network,
			modules: [
				setupMyNearWallet({ iconUrl: MyNearIconUrl.src }),
				setupNearWallet({ iconUrl: NearIconUrl.src }),
				setupSender({ iconUrl: SenderIconUrl.src }),
			],
		})

		const isSignedIn = this.walletSelector.isSignedIn()

		if (isSignedIn) {
			this.wallet = await this.walletSelector.wallet()
			this.accountId =
				this.walletSelector.store.getState().accounts[0].accountId
		}
		return isSignedIn
	}

	async getAuthToken() {
		const isSignedIn = this.walletSelector!!.isSignedIn()
		if (isSignedIn) {
			this.accountId =
				this.walletSelector!!.store.getState().accounts[0].accountId
			const arr = []
			for (let i = 0; i < this.accountId.length; i++) {
				arr[i] = this.accountId.charCodeAt(i)
			}
			const msgBuf = new Uint8Array(arr)
			const signedMsg = await this.wallet!!.signMessage({ message: msgBuf })
			const pubKey = Buffer.from(signedMsg.publicKey.data).toString('hex')
			const signature = Buffer.from(signedMsg.signature).toString('hex')
			const payload = [this.accountId, pubKey, signature]
			return Buffer.from(payload.join('&')).toString('base64')
		}
		return ''
	}

	async getAccountId() {
		return this.walletSelector
			? this.walletSelector!!.store.getState().accounts[0].accountId
			: ''
	}

	async signIn() {
		const description = 'Please select a wallet to sign in.'
		const modal = setupModal(this.walletSelector!!, {
			contractId: this.createAccessKeyFor!!,
			description,
		})
		modal.show()
	}

	async signOut() {
		this.wallet!!.signOut()
		this.wallet = undefined
		this.accountId = undefined
		this.createAccessKeyFor = undefined
		window.location.replace(window.location.origin + window.location.pathname)
	}

	async viewMethod(contractId: any, method: any, args = {}) {
		const { network } = this.walletSelector!!.options
		const provider = new providers.JsonRpcProvider({ url: network.nodeUrl })
		let res = (await provider.query({
			request_type: 'call_function',
			account_id: contractId,
			method_name: method,
			args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
			finality: 'optimistic',
		})) as unknown as QueryResult
		return JSON.parse(Buffer.from(res.result).toString())
	}

	async callMethod(
		contractId: any,
		method: any,
		args = {},
		gas = THIRTY_TGAS,
		deposit = NO_DEPOSIT
	) {
		return await this.wallet!!.signAndSendTransaction({
			signerId: this.accountId,
			receiverId: contractId,
			actions: [
				{
					type: 'FunctionCall',
					params: {
						methodName: method,
						args,
						gas,
						deposit,
					},
				},
			],
		})
	}

	async getTransactionResult(txhash: any) {
		const { network } = this.walletSelector!!.options
		const provider = new providers.JsonRpcProvider({ url: network.nodeUrl })

		const transaction = await provider.txStatus(txhash, 'unnused')
		return providers.getTransactionLastResult(transaction)
	}
}

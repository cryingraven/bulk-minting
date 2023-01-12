import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { NFTContract } from '../../lib/BulkContract'
import { NearWallet } from '../../lib/NearWallet'
import Nav from '../../components/Nav'
import { getCollectionDataForContract } from '../../services/BulkMinting'
import { CollectionData } from '../../model'

export default function MintingHome() {
	const router = useRouter()
	const contractId = router.query.contract_id?.toString() || ''
	const wallet = new NearWallet(contractId)
	const contract = new NFTContract(contractId, wallet)
	const [isLogin, setLogin] = useState<boolean | undefined>(undefined)
	const [accountId, setAccountId] = useState('')
	const [currentCollectionData, setCollectionData] = useState<CollectionData>()
	const [numberOfMint, setNumberOfMint] = useState(1)
	const initLogin = async () => {
		const loginStatus = await wallet.startUp()
		setLogin(loginStatus)
		if (loginStatus) {
			const accountId = await wallet.getAccountId()
			setAccountId(accountId)
			getDetail()
		}
		console.log(loginStatus)
	}
	const getDetail = async () => {
		if (contractId != '') {
			const response = await getCollectionDataForContract(contractId)
			const collectionContractDetail = response.data as any as CollectionData
			setCollectionData(collectionContractDetail)
		}
	}
	useEffect(() => {
		initLogin()
	}, [contractId])
	return (
		<>
			<Head>
				<title>Minting Page</title>
			</Head>
			<div className="min-h-full">
				{typeof isLogin != 'undefined' && (
					<Nav
						accountId={accountId}
						isLogin={isLogin}
						walletLogout={function (): void {
							wallet.signOut()
						}}
						walletLogin={function (): void {
							wallet.signIn()
						}}
					/>
				)}
				<main>
					<div className="mx-auto max-w-4xl py-6 sm:px-6 lg:px-8 mb-5 text-white">
						<div className="px-4 py-2 sm:px-0">
							<h1 className="text-center text-2xl font-bold">
								{currentCollectionData?.collection_name}
							</h1>
							<div className="grid grid-cols-2 mt-8">
								<div className="p-2 justify-self-center w-64">
									<img
										alt="colelction"
										src="https://bafybeif7vfmmgft2jtwmazax5z7km23lcfur4wftnkw44vxcxv3hhn2c54.ipfs.nftstorage.link/1.png"
										className="w-full"
									/>
									<div className="w-full">
										<div className="flex flex-row h-10 w-full rounded-lg relative bg-transparent mt-1">
											<button
												onClick={() => {
													if (numberOfMint > 1) {
														setNumberOfMint(numberOfMint - 1)
													}
												}}
												data-action="decrement"
												className=" bg-gray-300 text-gray-600 hover:text-gray-700 hover:bg-gray-400 h-full w-20 rounded-l cursor-pointer outline-none"
											>
												<span className="m-auto text-2xl font-thin">−</span>
											</button>
											<input
												placeholder="1"
												type="number"
												readOnly
												className="outline-none focus:outline-none text-center w-full bg-gray-300 font-semibold text-md hover:text-black focus:text-black  md:text-basecursor-default flex items-center text-gray-700"
												name="number-of-mint"
												value={numberOfMint}
											></input>
											<button
												onClick={() => {
													if (numberOfMint < 10) {
														setNumberOfMint(numberOfMint + 1)
													}
												}}
												data-action="increment"
												className="bg-gray-300 text-gray-600 hover:text-gray-700 hover:bg-gray-400 h-full w-20 rounded-r cursor-pointer"
											>
												<span className="m-auto text-2xl font-thin">+</span>
											</button>
										</div>
									</div>
									<button
										onClick={() =>
											contract.nft_mint_many(
												parseInt(currentCollectionData?.price || '0'),
												numberOfMint
											)
										}
										className="mt-4 w-full bg-blue-800 inline-block text-center relative whitespace-nowrap rounded-md font-medium text-body transition duration-150 ease-in-outbg-blue-800 text-gray-100 false py-3 px-20 text-base cursor-default"
									>
										Mint
									</button>
								</div>
								<div className="p-2">
									<h3 className="text-lg">Description</h3>
									<p className="mt-3">
										{currentCollectionData?.collection_name}
									</p>
								</div>
							</div>
						</div>
					</div>
				</main>
			</div>
		</>
	)
}

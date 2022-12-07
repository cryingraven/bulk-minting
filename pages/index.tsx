import Nav from '../components/Nav'
import { useForm } from 'react-hook-form'
import { NearWallet } from '../lib/NearWallet'
import { BulKContract } from '../lib/BulkContract'
import { useEffect, useState } from 'react'
import { submitAssets, submitCsv } from '../services/BulkMinting'
import axios, { AxiosError } from 'axios'
import { utils } from 'near-api-js'
import Head from 'next/head'
import { CollectionData, NFTMetadata, Royalties, Royalty, Sale } from '../model'
import { Md5 } from 'ts-md5'
interface FormData {
	name: string
	desc: string
	media: FileList
	csv: FileList
	images: FileList
	price: number
	api: string
}
const contractId = process.env.NEXT_PUBLIC_CONTRACT_NAME
const bulkAPI = process.env.NEXT_PUBLIC_BULK_API
export default function Home() {
	const wallet = new NearWallet(contractId)
	const contract = new BulKContract(contractId, wallet)
	const [isLogin, setLogin] = useState<boolean | undefined>(undefined)
	const [isLoading, setLoading] = useState(false)
	const [message, setMessage] = useState('')
	const [authToken, setAuthToken] = useState('')
	const [accountId, setAccountId] = useState('')
	const { register, handleSubmit } = useForm()
	const downloadTemplate = async () => {
		const buffer = (await axios.get(`${bulkAPI}/template.csv`))
			.data as unknown as BlobPart
		const blob = new Blob([buffer], { type: 'text/csv' })
		const timeSet = new Date().getTime()
		const link = document.createElement('a')
		link.href = window.URL.createObjectURL(blob)
		link.download = `template_${timeSet}.csv`
		link.click()
	}
	const cleanMessage = () => {
		setMessage('')
	}
	const onSubmit = async (data: any) => {
		const parsed = data as FormData
		setLoading(true)
		try {
			var formData = new FormData()
			formData.append('collection_name', parsed.name)
			formData.append('collection_description', parsed.desc)
			formData.append('files', parsed.csv[0])
			const result = await submitCsv(authToken, formData)

			const collectionData = result.data as any
			const collectionId = collectionData.collection_id

			var formDataImages = new FormData()
			formDataImages.append('collection_id', collectionId)
			formDataImages.append('api_key', parsed.api)
			for (let i = 0; i < parsed.images.length; i++) {
				formDataImages.append('files', parsed.images[i])
			}
			formDataImages.append('media', parsed.media[0])
			const resultUpload = await submitAssets(authToken, formDataImages)
			const collectionUpload = resultUpload.data as unknown as CollectionData
			const tokenSymbol = `${collectionUpload.account_id[0]}${
				collectionUpload.collection_id[0]
			}${collectionUpload.base_url[0]}${new Date().getTime()}`

			const metadata: NFTMetadata = {
				spec: 'nft-1.0.0',
				symbol: tokenSymbol,
				name: collectionUpload.collection_name,
				base_uri: `https://${collectionUpload.base_url}.ipfs.nftstorage.link`,
			} as NFTMetadata

			const royalty: Royalty = {
				[collectionUpload.account_id]: 10000,
			} as Royalty
			const royalties: Royalties = {
				accounts: royalty,
				percent: 1000,
			} as Royalties
			const sale: Sale = {
				royalties: royalties,
				initial_royalties: royalties,
				price: utils.format.parseNearAmount(parsed.price.toString()),
			} as Sale
			await contract.create_nft_contract(
				Md5.hashStr(collectionUpload.base_url),
				metadata,
				parsed.images.length,
				sale
			)
			setMessage('')
		} catch (e) {
			const err = e as any
			const errMsg =
				err.response?.data?.message || err.message || 'Please try again'
			setMessage(errMsg)
		}
		setLoading(false)
	}
	const initLogin = async () => {
		const loginStatus = await wallet.startUp()
		setLogin(loginStatus)
		if (loginStatus) {
			const accountId = await wallet.getAccountId()
			setAccountId(accountId)
			const auth = await wallet.getAuthToken()
			setAuthToken(auth)
		}
	}
	useEffect(() => {
		initLogin()
	}, [wallet, contract])

	return (
		<>
			<Head>
				<title>NFT Bulk Minting</title>
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
					<div className="mx-auto max-w-4xl py-6 sm:px-6 lg:px-8 mb-5">
						<div className="px-4 py-2 sm:px-0">
							{isLogin ? (
								<form
									onSubmit={handleSubmit(onSubmit)}
									method="post"
									encType="multipart/form-data"
								>
									<h3 className="text-white font-medium leading-tight text-3xl">
										Create Collection
									</h3>
									{message && (
										<div
											className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
											role="alert"
										>
											<strong className="font-bold">Upload Failed : </strong>
											<span className="block sm:inline">{message}</span>
											<span
												className="absolute top-0 bottom-0 right-0 px-4 py-3"
												onClick={cleanMessage}
											>
												<svg
													className="fill-current h-6 w-6 text-red-500"
													role="button"
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 20 20"
												>
													<title>Close</title>
													<path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" />
												</svg>
											</span>
										</div>
									)}
									<div>
										<div className="text-white mt-4">Collection Name</div>
										<input
											{...register('name')}
											required={true}
											className="mt-2 focus:border-gray-800 focus:bg-white focus:bg-opacity-10 
                  input-text flex items-center relative w-full rounded-lg bg-white 
                  bg-opacity-10 focus:border-transparent outline-none text-white 
                  text-opacity-90 text-body text-base p-2"
											type="text"
											name="name"
											placeholder="Collection Name"
										/>
									</div>
									<div>
										<div className="text-white mt-4">
											Collection Description
										</div>
										<textarea
											{...register('desc')}
											name="desc"
											required={true}
											className="mt-2 focus:border-gray-800 focus:bg-white focus:bg-opacity-10 
                  input-text flex items-center relative w-full rounded-lg bg-white 
                  bg-opacity-10 focus:border-transparent outline-none text-white 
                  text-opacity-90 text-body text-base p-2"
											placeholder="Collection Description"
										/>
									</div>
									<div>
										<div className="text-white mt-4">Media</div>
										<input
											{...register('media')}
											required={true}
											className="mt-2 focus:border-gray-800 focus:bg-white focus:bg-opacity-10 
                  input-text flex items-center relative w-full rounded-lg bg-white 
                  bg-opacity-10 focus:border-transparent outline-none text-white 
                  text-opacity-90 text-body text-base p-2"
											type="file"
											name="media"
											accept="image/png, image/jpeg"
											placeholder="Collection Media"
										/>
									</div>
									<div>
										<div className="text-white mt-4">Collection Data</div>
										<input
											{...register('csv')}
											required={true}
											className="mt-2 focus:border-gray-800 focus:bg-white focus:bg-opacity-10 
                  input-text flex items-center relative w-full rounded-lg bg-white 
                  bg-opacity-10 focus:border-transparent outline-none text-white 
                  text-opacity-90 text-body text-base p-2"
											type="file"
											name="csv"
											accept="text/csv"
											placeholder="Collection List File"
										/>
										<div className="text-white">
											<button
												onClick={downloadTemplate}
												type="button"
												className="text-blue-500 text-base font-bold"
											>
												Click here
											</button>{' '}
											to download template
										</div>
									</div>
									<div>
										<div className="text-white mt-4">Collection Images</div>
										<input
											{...register('images')}
											required={true}
											className="mt-2 focus:border-gray-800 focus:bg-white focus:bg-opacity-10 
                  input-text flex items-center relative w-full rounded-lg bg-white 
                  bg-opacity-10 focus:border-transparent outline-none text-white 
                  text-opacity-90 text-body text-base p-2"
											type="file"
											name="images"
											accept="image/png, image/jpeg"
											placeholder="Collection Images"
											multiple={true}
										/>
										<div className="text-white">
											The Images will be named in order. Please, sort first !
										</div>
									</div>
									<div>
										<div className="text-white mt-4">Price (N)</div>
										<input
											{...register('price')}
											required={true}
											className="mt-2 focus:border-gray-800 focus:bg-white focus:bg-opacity-10 
                  input-text flex items-center relative w-full rounded-lg bg-white 
                  bg-opacity-10 focus:border-transparent outline-none text-white 
                  text-opacity-90 text-body text-base p-2"
											type="number"
											name="price"
											min={1}
											max={99}
											placeholder="1"
										/>
									</div>
									<div>
										<div className="text-white mt-4">NFT STorage API Key</div>
										<input
											{...register('api')}
											required={true}
											className="mt-2 focus:border-gray-800 focus:bg-white focus:bg-opacity-10 
                  input-text flex items-center relative w-full rounded-lg bg-white 
                  bg-opacity-10 focus:border-transparent outline-none text-white 
                  text-opacity-90 text-body text-base p-2"
											type="text"
											name="api"
											placeholder="API KEY"
										/>
										<div className="text-white">
											Note: if ypu don't have one.{' '}
											<a
												className="text-blue-500 text-base font-bold"
												href="https://nft.storage/docs/quickstart/#get-an-api-token"
											>
												Create Here
											</a>
										</div>
									</div>
									<div>
										<button
											disabled={isLoading}
											type="submit"
											className="mt-8 inline-block text-center relative whitespace-nowrap 
                  rounded-md font-medium text-body transition duration-150 ease-in-out
                bg-blue-800 text-gray-100 false py-3 px-20 text-base cursor-default"
										>
											{isLoading ? (
												<div role="status">
													<svg
														className="inline mr-2 w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-gray-600 dark:fill-gray-300"
														viewBox="0 0 100 101"
														fill="none"
														xmlns="http://www.w3.org/2000/svg"
													>
														<path
															d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
															fill="currentColor"
														/>
														<path
															d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
															fill="currentFill"
														/>
													</svg>
												</div>
											) : (
												<span>Upload Data</span>
											)}
										</button>
									</div>
								</form>
							) : (
								<div className="text-white text-center">
									<h3 className="font-medium leading-tight text-3xl">
										You need to login first.
									</h3>
								</div>
							)}
						</div>
					</div>
				</main>
			</div>
		</>
	)
}

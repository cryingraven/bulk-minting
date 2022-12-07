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
			}${collectionUpload.base_url[0]}${new Date().getMonth()}`

			const metadata: NFTMetadata = {
				spec: 'nft-1.0.0',
				symbol: tokenSymbol,
				name: collectionUpload.collection_name,
				base_uri: `https://${collectionUpload.base_url}.ipfs.nftstorage.link/`,
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
							<form
								onSubmit={handleSubmit(onSubmit)}
								method="post"
								encType="multipart/form-data"
							>
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
									<div className="text-white mt-4">Collection Description</div>
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
										Upload Data
									</button>
								</div>
							</form>
						</div>
					</div>
				</main>
			</div>
		</>
	)
}

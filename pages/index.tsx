import Nav from '../components/Nav'
import { useForm } from 'react-hook-form'
import { NearWallet } from '../lib/NearWallet'
import { BulKContract } from '../lib/BulkContract'
import pLimit from 'p-limit'
import { useEffect, useState } from 'react'
import {
	getTokenData,
	postNotify,
	submitCsv,
	submitList,
} from '../services/BulkMinting'
import axios from 'axios'
import { utils } from 'near-api-js'
import AsyncRetry from 'async-retry'
import { CollectionData, NFTMetadata, Royalties, Royalty, Sale } from '../model'
import React from 'react'
import UploadDialog from '../components/UploadDialog'
import PreviewdDialog from '../components/PreviewDialog'
import { NFTStorage, File as IPFSFile } from 'nft.storage'
import Head from 'next/head'
import Loading from '../components/Loading'
import { useRouter } from 'next/router'
import SuccessDialog from '../components/SuccessDialog'
interface FormData {
	name: string
	email: string
	contract: string
	desc: string
	media: FileList
	csv: FileList
	folder: FileList
	price: number
	api: string
}
const contractId = process.env.NEXT_PUBLIC_CONTRACT_NAME
const bulkAPI = process.env.NEXT_PUBLIC_BULK_API
const apiKey = process.env.NEXT_PUBLIC_NFT_STORAGE_KEY || ''

export default function Home() {
	const router = useRouter()
	let controller: AbortController | undefined
	const wallet = new NearWallet(contractId)
	const contract = new BulKContract(contractId, wallet)
	const [isLogin, setLogin] = useState<boolean | undefined>(undefined)
	const [currentFormData, setFormData] = useState<FormData>()
	const [currentCollectionData, setCollectionData] = useState<CollectionData>()
	const [logs, setLogs] = useState<string[]>([])
	const [uploaded, setUploaded] = useState(0)
	const [totalFiles, setTotalFiles] = useState(0)
	const [tokens, setTokens] = useState<any[]>([])
	const [isLoading, setLoading] = useState(false)
	const [isUploading, setUploading] = useState(false)
	const [isPreview, setPreview] = useState(false)
	const [message, setMessage] = useState('')
	const [authToken, setAuthToken] = useState('')
	const [accountId, setAccountId] = useState('')
	const { register, handleSubmit } = useForm()
	const directoryOption = { directory: '', webkitdirectory: 'true' }
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
		controller = new window.AbortController()
		const parsed = data as FormData
		setLoading(true)
		try {
			if (!parsed.contract.match('^[a-z0-9]{5,10}')) {
				throw new Error(
					'Contract name must be alphanumeric with length 5-10 character'
				)
			}
			if (!parsed.email.match('[a-z0-9]+@[a-z]+.[a-z]{2,3}')) {
				throw new Error('Invalid email')
			}
			const checkContract = await contract.checkContract(
				`${parsed.contract}.${contractId}`
			)
			if (checkContract.result) {
				throw new Error('Account Already Exist')
			}
			setFormData(parsed)
			const saveCollectionData = async (signal: AbortSignal) => {
				var formData = new FormData()
				formData.append(
					'contract_name',
					`${parsed.contract}.${process.env.NEXT_PUBLIC_CONTRACT_NAME}`
				)
				formData.append('email', parsed.email)
				formData.append('collection_name', parsed.name)
				formData.append('collection_description', parsed.desc)
				formData.append('files', parsed.csv[0])
				formData.append('price', parsed.price.toString())
				const result = await submitCsv(authToken, formData, signal)

				const collectionSaved = result.data as any
				const collectionId = collectionSaved.collection_id
				let collectionData = {
					account_id: accountId,
					base_url: '',
					collection_name: parsed.name,
					collection_id: collectionId,
					num_of_tokens: collectionSaved.num_of_tokens,
				} as CollectionData
				setCollectionData(collectionData)
				logs.push(`csv uploaded successfully`)
				setLogs(logs)
				if (controller) {
					setUploaded(0)
					await uploadAssets(parsed, collectionData, controller.signal)
				}
			}

			await saveCollectionData(controller.signal)
			cleanMessage()
		} catch (e) {
			const err = e as any
			const errMsg =
				err.response?.data?.message || err.message || 'Please try again'
			setMessage(errMsg)
		}
		setLoading(false)
	}

	const uploadAssets = async (
		data: FormData,
		collection: CollectionData,
		signal: AbortSignal
	) => {
		setUploading(true)
		try {
			if (!collection) {
				throw new Error('Collection Not Found')
			}
			const storage = new NFTStorage({
				token: !data.api || data.api == '' ? apiKey : data.api,
			})
			const assets: File[] = []
			const toUpload: File[] = []
			const tokens: any[] = []
			logs.push(`reading media in folder`)
			setLogs(logs)
			for (let i = 0; i < data.folder.length; i++) {
				const file = data.folder.item(i) as File
				if (!file.type.includes('image') && !file.type.includes('video')) {
					continue
				}
				toUpload.push(file)
			}
			setTotalFiles(toUpload.length)
			const limit = pLimit(10)
			const promises = toUpload.map((uploadFile, i) => {
				return limit(() =>
					AsyncRetry(async (bail) => {
						try {
							if (signal.aborted) {
								bail(new Error('Canceled By User'))
							}
							const file = uploadFile
							const mediaName = file.name || 'Unsupported'
							if (mediaName == 'Unsupported') {
								bail(new Error('Device not support filename'))
							}
							const media = await file.arrayBuffer()
							const mediaIPFS = new IPFSFile([media], mediaName, {
								type: file.type,
							})
							assets.push(mediaIPFS)
							const tokenData = await getTokenData(
								collection.collection_id,
								mediaName,
								signal
							)
							const token = tokenData.data as any
							if (token) {
								token.mime_type = file.type
								const dataIPFS = new IPFSFile(
									[JSON.stringify(token)],
									`${token.token_id}.json`,
									{
										type: 'application/json',
									}
								)
								assets.push(dataIPFS)
								tokens.push(token)
							}
							setUploaded((uploaded) => uploaded + 1)
							logs.push(`${mediaName} uploaded successfully`)
							setLogs(logs)
						} catch (e: any) {
							bail(e as Error)
						}
					})
				)
			})
			await Promise.all(promises)
			logs.push(`uploading CAR ... Note: don't close tab or turn off computer!`)
			setLogs(logs)
			const cid = await storage.storeDirectory(assets, { signal })
			logs.push(`get cid from ipfs successfully`)
			setLogs(logs)
			collection.base_url = cid as string
			setCollectionData(collection)
			for (let i = 0; i < tokens.length; i++) {
				tokens[
					i
				].media = `https://${collection.base_url}.ipfs.nftstorage.link/${tokens[i].media}`
				tokens[i].price = data.price
			}
			logs.push(`all files uploaded successfully`)
			setLogs(logs)
			setTokens(tokens.sort((a: any, b: any) => a.token_id - b.token_id))
			return cid
		} catch (err: any) {
			const errMessage = `error: ${err.message}` || 'error: Please try again.'
			logs.push(errMessage)
			setLogs(logs)
		}
		return null
	}

	const onClickMint = async (
		data: FormData,
		collectionUpload: CollectionData
	) => {
		try {
			setLoading(true)
			if (!collectionUpload) {
				throw new Error('No Data Found')
			}
			if (!controller) {
				controller = new window.AbortController()
			}
			const dataListing = {
				collection_id: collectionUpload.collection_id,
				cid: collectionUpload.base_url,
			}
			await submitList(authToken, dataListing, controller.signal)
			const tokenSymbol = `${data.contract[0]}${new Date().getTime()}`

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
				price: utils.format.parseNearAmount(data.price.toString()),
			} as Sale
			await contract.create_nft_contract(
				data.contract,
				metadata,
				tokens.length,
				sale
			)
			cleanMessage()
			setLoading(false)
		} catch (e) {
			console.log(e)
			const err = e as any
			const errMsg =
				err.response?.data?.message || err.message || 'Please try again'
			setMessage(errMsg)
			setLoading(false)
		}
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
									{router.query.transactionHashes != undefined && (
										<SuccessDialog
											txHash={router.query.transactionHashes.toString()}
											wallet={wallet}
											onExist={(contractId: string) => {
												postNotify(authToken, {
													contract_id: contractId,
												})
											}}
										/>
									)}
									{isUploading && (
										<UploadDialog
											ready={
												uploaded > 0 &&
												uploaded == totalFiles &&
												currentCollectionData != undefined &&
												currentCollectionData.base_url != ''
											}
											logs={logs}
											onCancel={function (): void {
												setUploading(false)
												setLogs([])
												if (controller) {
													controller.abort('Canceled By User')
												}
												setLoading(false)
											}}
											onFinish={function (): void {
												setUploading(false)
												setPreview(true)
												setLogs([])
											}}
										/>
									)}
									{isPreview && (
										<PreviewdDialog
											onCancel={function (): void {
												setPreview(false)
												if (controller) {
													controller.abort('Canceled By User')
												}
												setLoading(false)
												if (currentFormData && currentCollectionData) {
													const storage = new NFTStorage({
														token:
															!currentFormData.api || currentFormData.api == ''
																? apiKey
																: currentFormData.api,
													})
													storage.delete(currentCollectionData.base_url)
												}
											}}
											onFinish={function (): void {
												setPreview(false)
												if (currentFormData && currentCollectionData) {
													onClickMint(currentFormData, currentCollectionData)
												}
											}}
											data={tokens}
										/>
									)}
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
										<div className="text-white mt-4">Your Email</div>
										<input
											{...register('email')}
											required={true}
											className="mt-2 focus:border-gray-800 focus:bg-white focus:bg-opacity-10 
                  input-text flex items-center relative w-full rounded-lg bg-white 
                  bg-opacity-10 focus:border-transparent outline-none text-white 
                  text-opacity-90 text-body text-base p-2"
											type="email"
											name="email"
											placeholder="Your Email"
										/>
									</div>
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
										<div className="text-white mt-4">Smart Contract Name</div>
										<input
											{...register('contract')}
											required={true}
											className="mt-2 focus:border-gray-800 focus:bg-white focus:bg-opacity-10 
                  input-text flex items-center relative w-full rounded-lg bg-white 
                  bg-opacity-10 focus:border-transparent outline-none text-white 
                  text-opacity-90 text-body text-base p-2"
											type="text"
											name="contract"
											placeholder={`name.${process.env.NEXT_PUBLIC_CONTRACT_NAME}`}
											maxLength={10}
											minLength={5}
										/>
										<div className="text-gray-100 text-xs">
											Contract ID contains lowercase characters (a-z) , digits
											(0-9) & length 5-10
										</div>
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
										<div className="text-white mt-4">Assets Folder</div>
										<input
											{...register('folder')}
											required={true}
											className="mt-2 focus:border-gray-800 focus:bg-white focus:bg-opacity-10 
                  input-text flex items-center relative w-full rounded-lg bg-white 
                  bg-opacity-10 focus:border-transparent outline-none text-white 
                  text-opacity-90 text-body text-base p-2"
											type="file"
											name="folder"
											{...directoryOption}
										/>
									</div>
									<div>
										<div className="text-white mt-4">CSV Files</div>
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
											placeholder="Collection Tokens CSV"
										/>
										<div className="text-gray-100  text-xs">
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
										<div className="text-white mt-4">NFT Storage API Key</div>
										<input
											{...register('api')}
											className="mt-2 focus:border-gray-800 focus:bg-white focus:bg-opacity-10 
                  input-text flex items-center relative w-full rounded-lg bg-white 
                  bg-opacity-10 focus:border-transparent outline-none text-white 
                  text-opacity-90 text-body text-base p-2"
											type="text"
											name="api"
											placeholder="(Optional)"
										/>
									</div>
									<div>
										<button
											disabled={isLoading}
											type="submit"
											className="mt-8 inline-block text-center relative whitespace-nowrap 
                  rounded-md font-medium text-body transition duration-150 ease-in-out
                bg-blue-800 text-gray-100 false py-3 px-20 text-base cursor-default"
										>
											{isLoading ? <Loading /> : <span>Upload Data</span>}
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

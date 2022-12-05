import axios from 'axios'
import { NearWallet } from '../lib/NearWallet'

const baseRequest = axios.create({
	baseURL: process.env.NEXT_PUBLIC_MARKETPLACE_API || '',
})

baseRequest.interceptors.response.use(
	function (response) {
		return response.data
	},
	function (error) {
		return Promise.reject(error)
	}
)
export const postUploadSingleImage = (data: unknown) =>
	baseRequest.post('/upload/single', data)

export const submitCsv = async (auth: string, data: any) => {
	return baseRequest.post('/collection/bulk-creation', data, {
		headers: {
			Authorization: auth,
		},
	})
}

export const submitAssets = async (auth: string, data: any) => {
	return baseRequest.post('/collection/bulk-creation-assets', data, {
		headers: {
			Authorization: auth,
		},
	})
}

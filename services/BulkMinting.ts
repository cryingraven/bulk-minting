import axios from 'axios'

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

export const submitCsv = async (auth: string, data: any) =>
	baseRequest.post('/collection/bulk-creation', data, {
		headers: {
			Authorization: auth,
			'Content-Type': 'multipart/form-data',
		},
	})

export const submitAssets = async (auth: string, data: any) =>
	baseRequest.post('/collection/bulk-creation-assets', data, {
		headers: {
			Authorization: auth,
			'Content-Type': 'multipart/form-data',
		},
	})

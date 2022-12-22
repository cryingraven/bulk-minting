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

export const submitCsv = async (auth: string, data: any, signal: AbortSignal) =>
	baseRequest.post('/collection/bulk-creation', data, {
		headers: {
			Authorization: auth,
			'Content-Type': 'multipart/form-data',
		},
		signal: signal,
	})

export const submitList = async (
	auth: string,
	data: any,
	signal: AbortSignal
) =>
	baseRequest.post('/collection/bulk-creation-list', data, {
		headers: {
			Authorization: auth,
		},
		signal: signal,
	})

export const getTokenData = async (
	collectionId: string,
	mediaName: string,
	signal: AbortSignal
) =>
	baseRequest.get(
		`/collection/bulk-creation/data/${collectionId}/${mediaName}`,
		{
			signal: signal,
		}
	)

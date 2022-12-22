import { Dialog } from '@headlessui/react'
import { useState } from 'react'
import Loading from './Loading'
interface UploadDialogProps {
	onCancel(): void
	onFinish(): void
	logs: string[]
	ready: boolean
}

export default function UploadDialog({
	onCancel,
	onFinish,
	logs,
	ready = false,
}: UploadDialogProps) {
	const [isOpen, setIsOpen] = useState(true)

	return (
		<Dialog
			open={isOpen}
			onClose={() => {}}
			className="top-0 left-0 right-0 fixed mt-24 z-999 w-full"
		>
			<Dialog.Panel>
				<div className="mx-auto max-w-4xl p-3 bg-gray-800 text-white rounded-lg flex flex-col">
					<h6 className="text-2xl">Uploading Image Assets</h6>
					<div className="m-2 p-3 border border-blue-800 rounded-lg overflow-y-scroll modal-scroll">
						<ul className="list-none">
							{logs.map((value, index) => {
								return <li key={index}>{value}</li>
							})}
						</ul>
					</div>
					<div className="flex w-8/12 mx-auto">
						<button
							className="grow m-3 p-1 text-blue-300"
							onClick={() => {
								setIsOpen(false)
								onCancel()
							}}
						>
							Cancel
						</button>
						{ready ? (
							<button
								className="grow m-3 p-1 text-green-300"
								onClick={() => {
									setIsOpen(false)
									onFinish()
								}}
							>
								Done
							</button>
						) : (
							<button
								disabled={true}
								className="grow flex justify-center m-3 p-1 text-blue-300"
								onClick={() => {
									setIsOpen(false)
									onFinish()
								}}
							>
								<div className="mr-3">Uploading</div>
								<Loading />
							</button>
						)}
					</div>
				</div>
			</Dialog.Panel>
		</Dialog>
	)
}

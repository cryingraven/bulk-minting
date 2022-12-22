import { Dialog, Switch } from '@headlessui/react'
import { useState } from 'react'

interface PreviewdDialogProps {
	onCancel(): void
	onFinish(): void
	data: any[]
}

export default function PreviewdDialog({
	onCancel,
	onFinish,
	data,
}: PreviewdDialogProps) {
	const [isOpen, setIsOpen] = useState(true)
	const [isAgree, setAgree] = useState(false)

	return (
		<Dialog
			open={isOpen}
			onClose={() => {}}
			className="top-0 left-0 right-0 fixed mt-24 z-999 w-full"
		>
			<Dialog.Panel>
				<div className="mx-auto max-w-5xl p-3 bg-gray-800 text-white rounded-lg flex flex-col">
					<h6 className="text-2xl">Preview</h6>
					<div className="m-2 p-8 overflow-y-scroll modal-scroll grid grid-cols-1 gap-4 md:grid-cols-4 sm:grid-cols-2">
						{data.map((item, index) => {
							return (
								<div
									key={index}
									className="border border-blue-700 p-2 rounded-md"
								>
									<img
										src={item.media}
										alt={index.toString()}
										className="w-full"
									/>
									<div className="text-base text-white m-1">
										{item.title || '-'}
									</div>
									<div className="text-sm text-white font-bold m-1">
										{item.price || '-'} N
									</div>
								</div>
							)
						})}
					</div>
					<div className="flex flex-row items-center self-end m-3">
						<Switch
							checked={isAgree}
							onChange={setAgree}
							className={`${
								isAgree ? 'bg-blue-600' : 'bg-gray-300'
							} relative inline-flex h-6 w-11 items-center rounded-full`}
						>
							<span className="sr-only">Agree</span>
							<span
								className={`${
									isAgree ? 'translate-x-6' : 'translate-x-1'
								} inline-block h-4 w-4 transform rounded-full bg-white transition`}
							/>
						</Switch>
						<div className="m-1">This Process is Irreversable</div>
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
						{isAgree ? (
							<button
								className="grow m-3 p-1 text-green-300"
								onClick={() => {
									setIsOpen(false)
									onFinish()
								}}
							>
								Mint
							</button>
						) : (
							<button disabled={true} className="grow m-3 p-1 text-blue-200">
								Mint
							</button>
						)}
					</div>
				</div>
			</Dialog.Panel>
		</Dialog>
	)
}

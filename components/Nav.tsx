import { useEffect, useState } from 'react'
import { NearWallet } from '../lib/NearWallet'

interface NavProps {
	accountId: string
	isLogin: boolean
	walletLogout(): void
	walletLogin(): void
}
export default function Nav({
	accountId,
	isLogin,
	walletLogin,
	walletLogout,
}: NavProps) {
	return (
		<nav>
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex h-24 items-center justify-between">
					<div className="flex justify-between min-w-full">
						<div className="flex-shrink-0">
							<img className="h-24 w-24" src="/paras.svg" alt="Your Company" />
						</div>
						<div className="ml-10 flex items-center space-x-4">
							{isLogin ? (
								<button
									onClick={walletLogout}
									className="bg-gray-900 text-white px-3 py-2 rounded-md text-base font-medium"
									aria-current="page"
								>
									{accountId} (Sign Out)
								</button>
							) : (
								<button
									onClick={walletLogin}
									className="bg-gray-900 text-white px-3 py-2 rounded-md text-base font-medium"
									aria-current="page"
								>
									Login With Near
								</button>
							)}
						</div>
					</div>
				</div>
			</div>
		</nav>
	)
}

import { Logo } from "../logo/logo";

export function Header() {
	return (
		<header className='container flex items-center justify-between mx-auto px-4 pt-5 pb-2'>
			<Logo text/>
			<div>
				<a className='btn-contained' href='https://app.sixempress.com/' target='_blank' rel="noreferrer">AREA CLIENTI</a>
				{/* <ul className='flex'>
					<li>Prezzo</li>
					<li className='ml-3'>Contatti</li>
				</ul> */}
			</div>
		</header>
	)
}
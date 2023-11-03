import styles from './logo.module.css';

export function Logo(p: {text?: boolean, className?: string}) {
	return (
		<div className={'flex items-center ' + styles.logo + ' ' + (p.className || '')}>
			<img src="/assets/logo_white.svg"/>
			{/* <img src={require('./logo_white.svg?url')}/> */}
			{/* <div dangerouslySetInnerHTML={{__html: require('./logo_white.svg?include')}}/> */}
			{p.text && <span className='text-logo'>SIXEMPRESS</span>}
		</div>
	);
}

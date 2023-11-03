import styles from './content-circle.module.css';

export function ContentCircle(p: {children: any}) {
	return (
		<div className={'relative ' + styles.content_circle_container}>
			<div className={styles.content_circle + ' ' + styles.cc1}></div>
			<div className={styles.content_circle + ' ' + styles.cc2}></div>
			<div className={styles.content_circle + ' ' + styles.cc3}></div>
			<article>
				{p.children}
			</article>
		</div>
	)
}
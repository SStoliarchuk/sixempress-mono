import styles from './utilities.module.css';

/* eslint-disable-next-line */
export interface UtilitiesProps {}

export function Utilities(props: UtilitiesProps) {
  return (
    <div className={styles['container']}>
      <h1>Welcome to Utilities!</h1>
    </div>
  );
}

export default Utilities;

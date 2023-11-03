import { Link } from 'react-router-dom';
import { Root } from '../root';

export function Page2() {
  return (
    <Root>
      <ul>
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/page2">Page 2</Link>
        </li>
      </ul>
      Hi, this is page 2
    </Root>
  );
}

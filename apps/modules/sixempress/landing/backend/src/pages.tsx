import { Route } from 'react-router-dom';
import { Index } from './pages/index';
import { Page2 } from './pages/page2';
import { NotFound } from './pages/404';

type Page = { path: string; element: React.ReactNode };

// add here your pages
const pages: Page[] = [
  { path: '/', element: <Index /> },
  { path: '/page2', element: <Page2 /> },
  { path: '*', element: <NotFound /> },
];

export const generateReactPages = () => {
  return pages.map((p, idx) => (
    <Route key={p.path + idx} path={p.path} element={p.element} />
  ));
};

import { App as AntApp, ConfigProvider } from 'antd';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import './styles/overrides.css';
import { antdTheme } from './theme/antdTheme';

// `AntApp` is here for its `.ant-app` wrapper, which carries antd's base colour
// and font onto non-antd children. antd ships no global reset of its own — its
// styles are scoped to `.ant-*` — so without this the plain elements that remain
// (headings, lists, the confirm dialog) would not inherit the theme.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={antdTheme}>
      <AntApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);

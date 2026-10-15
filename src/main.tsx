import { StyleProvider } from '@ant-design/cssinjs';
import { App as AntApp, ConfigProvider } from 'antd';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { antdTheme } from './theme/antdTheme';

// `layer` puts every antd rule in `@layer antd`, slotted between our base reset
// and Tailwind utilities by the order declared at the top of index.css. It must
// wrap ConfigProvider, not sit inside it, or icon styles miss the layer.
//
// `AntApp` is here for its `.ant-app` wrapper, which carries antd's base colour
// and font onto non-antd children. antd ships no global reset of its own — its
// styles are scoped to `.ant-*` — so without this the plain elements that remain
// (headings, lists, the confirm dialog) would not inherit the theme.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StyleProvider layer>
      <ConfigProvider theme={antdTheme}>
        <AntApp>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AntApp>
      </ConfigProvider>
    </StyleProvider>
  </StrictMode>,
);

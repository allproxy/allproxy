import './App.css';
import '@fortawesome/fontawesome-free/css/all.css';
import 'bootstrap-css-only/css/bootstrap.css';
import MainTabs from './components/MainTabs';
import Header from './components/Header';
import { filterStore } from './store/FilterStore';
import { socketStore } from './store/SocketStore';
import { messageQueueStore } from './store/MessageQueueStore';
import { mainTabStore } from './store/MainTabStore';
import Footer from './components/Footer';
import { breakpointStore } from './store/BreakpointStore';
import { createTheme, PaletteType, ThemeProvider } from '@material-ui/core';
import React from 'react';
import SideBar from './components/SideBar';
import StatusBox from './components/StatusBox';
import { observer } from 'mobx-react-lite';
import { themeStore } from './store/ThemeStore';
import { initApFileSystem } from './store/APFileSystem';

const theme = localStorage.getItem('allproxy-theme');
let defaultTheme: 'dark' | 'light' = 'dark';
if (theme === 'dark' || theme === 'light') {
  defaultTheme = theme;
}

let colorSchemeQueryList: MediaQueryList | undefined = window.matchMedia('(prefers-color-scheme: dark)');

function initTheme() {
  const theme = localStorage.getItem('allproxy-theme');
  if (theme) {
    if (theme !== 'system' && theme !== themeStore.getTheme()) {
      window.darkMode.toggle();
    }
  }
}

function App() {
  const [paletteType, setPaletteType] = React.useState<PaletteType>(defaultTheme);

  if (colorSchemeQueryList !== undefined) {
    setTheme(colorSchemeQueryList);
    setTimeout(initTheme, 1000);
    colorSchemeQueryList = undefined;
  }

  const theme = createTheme({
    palette: {
      type: paletteType
    },
  });

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", setTheme);

  function setTheme(e: any) {
    const cs = e.matches ? "dark" : "light";
    themeStore.setTheme(cs);
    setPaletteType(cs);
  }

  initApFileSystem();

  if (document.location.pathname.includes('jsonlogs')) {
    document.title = 'JSONLogs';
  } else if (document.location.pathname.includes('logviewer')
    || document.location.pathname.includes('jlogviewer')
    || document.location.pathname.includes('json-log-viewer')) {
    document.title = 'JLogViewer';
  } else if (document.location.pathname.includes('mitmproxy')) {
    document.title = 'MitmProxy';
  } else {
    document.title = 'AllProxy';
  }

  return (
    <ThemeProvider theme={theme}>
      <div className="App">
        <Header
          socketStore={socketStore}
          filterStore={filterStore}
          messageQueueStore={messageQueueStore}
          mainTabStore={mainTabStore}
        />
        <Updating />
        <div className="side-bar-tabs">
          <div>
            <SideBar />
          </div>
          <div>
            <MainTabs
              messageQueueStore={messageQueueStore}
              mainTabStore={mainTabStore}
            />
          </div>
        </div>
        <Footer
          filterStore={filterStore}
          breakpointStore={breakpointStore}
        />
      </div>
    </ThemeProvider>
  );
}

const Updating = observer(() => {
  if (mainTabStore.getUpdatingMessage().length === 0) return null;
  return <StatusBox show={mainTabStore.isUpdating()}>{mainTabStore.getUpdatingMessage()}</StatusBox>;
});

export default App;

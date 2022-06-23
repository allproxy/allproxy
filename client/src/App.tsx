import './App.css';
import '@fortawesome/fontawesome-free/css/all.css';
import 'bootstrap-css-only/css/bootstrap.css';
import Snapshots from './components/SnapshotTabs';
import Header from './components/Header';
import { filterStore } from './store/FilterStore';
import { socketStore } from './store/SocketStore';
import { messageQueueStore } from './store/MessageQueueStore';
import { snapshotStore } from './store/SnapshotStore';
import Footer from './components/Footer';
import { breakpointStore } from './store/BreakpointStore';
import { createTheme, PaletteType, ThemeProvider } from '@material-ui/core';
import React from 'react';

const theme = localStorage.getItem('allproxy-theme');
let defaultTheme : 'dark' | 'light' = 'dark'
if (theme === 'dark' || theme === 'light') {
  defaultTheme = theme;
}
export let colorScheme = theme;

let colorSchemeQueryList: MediaQueryList | undefined = window.matchMedia('(prefers-color-scheme: dark)');

function initTheme() {
	const theme = localStorage.getItem('allproxy-theme');
	if (theme) {
		if(theme !== 'system' && theme !== colorScheme) {
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
    colorScheme = cs;
    setPaletteType(cs);
	}

  return (
    <ThemeProvider theme={theme}>
      <div className="App">
        <Header
          socketStore={socketStore}
          filterStore={filterStore}
          messageQueueStore={messageQueueStore}
          snapshotStore={snapshotStore}
        />
        <Snapshots
          messageQueueStore={messageQueueStore}
          snapshotStore={snapshotStore}
        />
        <Footer
          socketStore={socketStore}
          filterStore={filterStore}
          messageQueueStore={messageQueueStore}
          breakpointStore={breakpointStore}
        />
      </div>
    </ThemeProvider>
  );
}

export default App;

import React from 'react';
import './App.css';
import '@fortawesome/fontawesome-free/css/all.css';
import 'bootstrap-css-only/css/bootstrap.css';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import { filterStore } from './store/FilterStore';
import { socketStore } from './store/SocketStore';
import { messageQueueStore } from './store/MessageQueueStore';

function App() {
  return (
    <div className="App">
      <Header
        socketStore={socketStore}
        filterStore={filterStore}
        messageQueueStore={messageQueueStore}
      />
      <Dashboard messageQueueStore={ messageQueueStore }/>
    </div>
  );
}

export default App;

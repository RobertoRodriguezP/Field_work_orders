import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { BrowserRouter } from 'react-router-dom';

import { ConnectivityProvider } from './context/ConnectivityContext';
import { AuthProvider } from './context/AuthContext';
import { TasksProvider } from './context/TasksContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConnectivityProvider>
      <AuthProvider>
        <TasksProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </TasksProvider>
      </AuthProvider>
    </ConnectivityProvider>
  </React.StrictMode>
);

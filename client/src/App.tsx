import { Link, Route, Routes, useLocation } from 'react-router-dom';
import ConnectionBanner from './components/ConnectionBanner';
import TasksPage from './pages/TasksPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './RegisterPage';
import { useAuth } from './context/AuthContext';
import { useConnectivity } from './context/ConnectivityContext';

export default function App() {
  const { me, isGuest, login, logout } = useAuth();
  const { apiOnline } = useConnectivity();
  const { pathname } = useLocation();

  return (
    <div className="app-main container-fluid">
      <ConnectionBanner />

      {/* Topbar minimal */}
      <header className="d-flex align-items-center justify-content-between py-2" style={{ gap: 12 }}>
        <nav className="d-flex align-items-center" style={{ gap: 12 }}>
          <Link className={`btn btn-sm ${pathname === '/' ? 'btn-primary' : 'btn-outline-secondary'}`} to="/">
            Tasks
          </Link>
          <Link className={`btn btn-sm ${pathname === '/login' ? 'btn-primary' : 'btn-outline-secondary'}`} to="/login">
            Login
          </Link>
          <Link className={`btn btn-sm ${pathname === '/register' ? 'btn-primary' : 'btn-outline-secondary'}`} to="/register">
            Register
          </Link>
        </nav>

        <div className="d-flex align-items-center" style={{ gap: 8 }}>
          {apiOnline ? <span className="badge text-bg-success">API online</span>
                     : <span className="badge text-bg-danger">API offline</span>}
          {me ? (
            <>
              <span className="text-secondary small">{me.email || me.preferred_username}</span>
              <button className="btn btn-sm btn-outline-secondary" onClick={logout}>Logout</button>
            </>
          ) : (
            <Link
              className={`btn btn-sm btn-outline-secondary ${!apiOnline ? 'disabled' : ''}`}
              to="/login"
              aria-disabled={!apiOnline}
            >
              {apiOnline ? 'Login (Keycloak vía C#)' : 'Login deshabilitado'}
            </Link>
          )}
        </div>
      </header>

      {/* Contenido */}
      <main className="pt-2" style={{ minHeight: 0 }}>
        <Routes>
          <Route path="/" element={<TasksPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </main>
    </div>
  );
}

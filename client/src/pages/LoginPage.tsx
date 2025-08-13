// src/pages/LoginPage.tsx
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { Link, useNavigate } from 'react-router-dom';
import { useConnectivity } from '../context/ConnectivityContext';

type Form = { username: string; password: string };

export default function LoginPage() {
  const { register, handleSubmit } = useForm<Form>();
  const { login } = useAuth();
  const { apiOnline } = useConnectivity();
  const navigate = useNavigate();

  const onSubmit = async (data: Form) => {
    await login(data.username, data.password);
    navigate('/');
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="container-fluid px-3">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-11 col-md-10 col-lg-8 col-xl-6 col-xxl-5">
            <div className="card shadow-sm w-100">
              <div className="card-body p-4 p-md-5">
                <h4 className="card-title mb-4 text-center">Log in</h4>
                <form onSubmit={handleSubmit(onSubmit)} className="d-grid gap-3">
                  <div>
                    <label className="form-label">Username</label>
                    <input className="form-control form-control-lg" required {...register('username')} defaultValue="admin1" />
                  </div>
                  <div>
                    <label className="form-label">Password</label>
                    <input className="form-control form-control-lg" type="password" required {...register('password')} defaultValue="Passw0rd!" />
                  </div>
                  <div className="d-grid gap-2">
                    <button className="btn btn-primary btn-lg w-100" type="submit" disabled={!apiOnline}>
                      Iniciar sesión
                    </button>
                  </div>
                  <p className="mt-3 text-secondary">
                    ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
                  </p>
                </form>
              </div>
            </div>
            <div className="my-3 d-sm-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

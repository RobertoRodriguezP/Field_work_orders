// LoginPage.tsx
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
type Form = { email: string; name: string; };
import { Link, useNavigate, NavLink } from 'react-router-dom';
import { useConnectivity } from '../context/ConnectivityContext';

export default function LoginPage() {
  const { register, handleSubmit } = useForm<Form>();
  const { login } = useAuth();
  const { apiOnline } = useConnectivity();
  const navigate = useNavigate();

  //const onSubmit = (data: Form) => {
  //  const fakeJwt = 'demo.jwt.token';
  //  login(fakeJwt, { id: data.email, email: data.email, name: data.name || 'User' });
  //  localStorage.setItem("guest_email", data.email);
  //  navigate("/");
  //};

  const onSubmit = () => {    login();
  };

  return (
    // Pantalla completa + centrado
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      {/* container-fluid para usar todo el ancho */}
      <div className="container-fluid px-3">
        <div className="row justify-content-center">
          {/* Full width en móvil; se va estrechando en pantallas grandes */}
          <div className="col-12 col-sm-11 col-md-10 col-lg-8 col-xl-6 col-xxl-5">
            <div className="card shadow-sm w-100">
              <div className="card-body p-4 p-md-5">
                <h4 className="card-title mb-4 text-center">Log in</h4>
                <form onSubmit={handleSubmit(onSubmit)} className="d-grid gap-3">
                  <div>
                    <label className="form-label">Email</label>
                    <input className="form-control form-control-lg" type="email" required {...register('email')} />
                  </div>
                  <div>
                    <label className="form-label">Name</label>
                    <input className="form-control form-control-lg" type="text" {...register('name')} />
                  </div>
                  <div className="d-grid gap-2">
                  <button className="btn btn-secondary btn-lg w-100" type="submit">Entrar como invitado</button>
                  <button className="btn btn-primary btn-lg w-100"
                      type="button"
                      onClick={() => login()}
                      disabled={!apiOnline}
                      title={apiOnline ? "Keycloak via C#" : "Servidor no disponible"}>
                      Continuar con proveedor (OIDC)</button>
                  </div>
                  <p className="mt-3 text-secondary">
                    ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
                  </p>
                </form>
              </div>
            </div>
            {/* margen inferior en móvil para que respire */}
            <div className="my-3 d-sm-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

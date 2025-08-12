import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from './api/http';
import { useState } from 'react';
import { useConnectivity } from './context/ConnectivityContext';

const RegisterSchema = z.object({
  email: z.string().email('Correo inválido'),
  firstName: z.string().min(1, 'Nombre requerido'),
  lastName: z.string().optional(),
});
type RegisterForm = z.infer<typeof RegisterSchema>;

export default function RegisterPage() {
  const { apiOnline } = useConnectivity();
  const [serverMsg, setServerMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<RegisterForm>({
    resolver: zodResolver(RegisterSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    if (!apiOnline) return;
    setSubmitting(true);
    setServerMsg(null);
    try {
      // Contrato esperado: POST /api/auth/register { email, firstName, lastName }
      // Backend C# crea el usuario en Keycloak o inicia flujo de invitación
      const res = await api.post('/api/auth/register', data);
      setServerMsg(res?.data?.message || 'Cuenta creada. Revisa tu correo o continúa con Login.');
      reset();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data || err?.message || 'Error registrando';
      setServerMsg(String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const continueWithGoogle = () => {
    if (!apiOnline) return;
    // El backend C# maneja Keycloak y redirige
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/login?provider=google&prompt=consent`;
  };

  const continueWithMicrosoft = () => {
    if (!apiOnline) return;
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/login?provider=microsoft&prompt=consent`;
  };

  return (
    <div className="d-grid gap-3" style={{ height: '100%' }}>
      <div className="card">
        <div className="card-body">
          <h5 className="card-title mb-3">Create your account</h5>

          {!apiOnline && (
            <div className="alert alert-warning">
              Sin señal con el servidor. Puedes navegar la app, pero el registro requiere conexión.
            </div>
          )}

          {serverMsg && (
            <div className="alert alert-info">{serverMsg}</div>
          )}

          {/* Social / federado */}
          <div className="d-flex flex-column flex-md-row gap-2 mb-3">
            <button
              className="btn btn-outline-light w-100 w-md-auto"
              onClick={continueWithGoogle}
              disabled={!apiOnline || submitting}
              title="Keycloak via C#"
            >
              Continuar con Google
            </button>
            <button
              className="btn btn-outline-light w-100 w-md-auto"
              onClick={continueWithMicrosoft}
              disabled={!apiOnline || submitting}
              title="Keycloak via C#"
            >
              Continuar con Microsoft
            </button>
          </div>

          <div className="text-secondary small mb-2">o con email</div>

          {/* Form email */}
          <form onSubmit={handleSubmit(onSubmit)} className="d-grid gap-3">
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label">Nombre</label>
                <input
                  className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
                  {...register('firstName')}
                  disabled={!apiOnline || submitting}
                />
                {errors.firstName && <div className="invalid-feedback">{errors.firstName.message}</div>}
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Apellido</label>
                <input
                  className="form-control"
                  {...register('lastName')}
                  disabled={!apiOnline || submitting}
                />
              </div>
              <div className="col-12">
                <label className="form-label">Email</label>
                <input
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  {...register('email')}
                  disabled={!apiOnline || submitting}
                />
                {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!apiOnline || submitting}
              >
                {submitting ? 'Creando...' : 'Crear cuenta'}
              </button>
            </div>
          </form>

          <div className="text-secondary small mt-3">
            Al continuar, aceptas los términos y políticas de la plataforma.
          </div>
        </div>
      </div>
    </div>
  );
}

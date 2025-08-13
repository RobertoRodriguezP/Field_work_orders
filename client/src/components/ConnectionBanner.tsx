import { useConnectivity } from "../context/ConnectivityContext";

export default function ConnectionBanner() {
  const { apiOnline, lastOkAt } = useConnectivity();
  const last = lastOkAt ? new Date(lastOkAt).toLocaleTimeString() : '—';
  if (apiOnline) return null;
  return (
    <div className="offline-banner">
      <div className="offline-banner__content">
        <strong>Sin señal con el servidor</strong>
        <span className="sep">•</span>
        <span>Estás en modo local (puedes seguir usando la interfaz)</span>
        {lastOkAt && (
          <>
            <span className="sep">•</span>
            <span>Último intento: {new Date(lastOkAt).toLocaleTimeString()}</span>
          </>
        )}
      </div>
    </div>
  );
}

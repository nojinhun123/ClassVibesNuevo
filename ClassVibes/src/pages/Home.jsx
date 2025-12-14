import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import Cursos from './Cursos';
import Profesores from './Profesores';

export default function Home() {
  const [resenas, setResenas] = useState([]);

  useEffect(() => {
    async function cargarResenas() {
      const { data, error } = await supabase
        .from('RESEÑAS')
        .select('texto, idAlumno, USUARIO(nombre, fotoPerfil)')
        .limit(3)
        .order('idResena', { ascending: true });
      if (!error) setResenas(data ?? []);
    }
    cargarResenas();
  }, []);

  return (
    <div>
      {/* Hero */}
      <div
        className="text-center py-5"
        style={{
          background: 'linear-gradient(90deg, #007CF0 0%, #00DFD8 100%)',
          color: 'black',
          fontWeight: 'bold',
          fontSize: '2rem',
        }}
      >
        Cambiando el mundo,<br />una mente a la vez.
      </div>

      {/* Cursos en portada */}
      <div className="container py-5">
        <Cursos />
      </div>

      {/* Profesores en portada */}
      <div className="container pb-5">
        <Profesores />
      </div>

      {/* Reseñas (máx 3) */}
      <div className="container pb-5">
        <h4 className="mb-3">Reseñas</h4>
        <div className="d-flex flex-row flex-wrap justify-content-center gap-3">
          {resenas.map((r, i) => (
            <div
              key={i}
              className="card p-3"
              style={{ width: '18rem', borderColor: '#007CF0', borderWidth: '1px' }}
            >
              <div className="d-flex align-items-center mb-2">
                <img
                  src={r.USUARIO?.fotoPerfil || 'https://via.placeholder.com/50'}
                  alt="perfil"
                  className="rounded-circle me-2"
                  width="50"
                  height="50"
                />
                <strong>{r.USUARIO?.nombre || 'Usuario'}</strong>
              </div>
              <p className="mb-0 text-muted">"{r.texto.slice(0, 120)}..."</p>
            </div>
          ))}
          {resenas.length === 0 && <div className="text-muted">Sin reseñas</div>}
        </div>
      </div>
    </div>
  );
}

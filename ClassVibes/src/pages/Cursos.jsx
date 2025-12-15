import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

export default function Cursos() {
  const navigate = useNavigate();
  const [cursos, setCursos] = useState([]);
  const [suscripciones, setSuscripciones] = useState([]);
  const [usuario, setUsuario] = useState(null);

  const esAlumno = usuario?.rol === 'alumno';

  const cargarCursos = async () => {
    const { data } = await supabase.from('cursos').select('*');
    setCursos(data ?? []);
  };

  const cargarSuscripciones = async (idalumno) => {
    const { data } = await supabase
      .from('usuario_cursos')
      .select('*')
      .eq('idalumno', idalumno);

    setSuscripciones(data ?? []);
  };

  useEffect(() => {
    const data = localStorage.getItem('usuario');
    if (data) {
      const parsed = JSON.parse(data);
      setUsuario(parsed);
      if (parsed.rol === 'alumno') {
        cargarSuscripciones(parsed.id); // 🔥 CLAVE
      }
    }
    cargarCursos();
  }, []);

  const idsSuscriptos = useMemo(
    () => new Set(suscripciones.map(s => s.idcurso)),
    [suscripciones]
  );

  const handleSuscribir = async (idcurso) => {
    if (!esAlumno) {
      navigate('/login');
      return;
    }

    const { data: curso } = await supabase
      .from('cursos')
      .select('*')
      .eq('idcurso', idcurso)
      .single();

    if (curso.precio > 0) {
      navigate(`/curso/pagar/${idcurso}`);
      return;
    }

    await supabase.from('usuario_cursos').insert({
      idcurso,
      idalumno: usuario.id, // 🔥 UNIFICADO
    });

    cargarSuscripciones(usuario.id);
  };

  const handleDesuscribir = async (idcurso) => {
    await supabase
      .from('usuario_cursos')
      .delete()
      .eq('idcurso', idcurso)
      .eq('idalumno', usuario.id);

    alert('Te desuscribiste del curso');
    cargarSuscripciones(usuario.id);
  };

  return (
    <div className="container py-5">
      <h2>Cursos</h2>

      <div className="row g-3">
        {cursos.map(c => {
          const suscripto = idsSuscriptos.has(c.idcurso);

          return (
            <div className="col-md-4" key={c.idcurso}>
              <div className="card h-100">
                <div className="card-body d-flex flex-column">
                  <h5>{c.nombre}</h5>
                  <p>{c.descripcion}</p>
                  <p><strong>Precio:</strong> ${c.precio}</p>

                  {esAlumno && (
                    suscripto ? (
                      <button
                        className="btn btn-danger mt-auto"
                        onClick={() => handleDesuscribir(c.idcurso)}
                      >
                        Desuscribirse
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary mt-auto"
                        onClick={() => handleSuscribir(c.idcurso)}
                      >
                        Suscribirse
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

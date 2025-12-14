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
    // Cargar cursos
    const { data: cursosData, error: errorCursos } = await supabase
      .from('cursos')
      .select('*');
    
    if (errorCursos) {
      console.error('Error al cargar cursos:', errorCursos);
      setCursos([]);
      return;
    }

    if (!cursosData || cursosData.length === 0) {
      setCursos([]);
      return;
    }

    // Obtener IDs únicos de profesores
    const idProfesores = [...new Set(cursosData.map(c => c.idprofesor).filter(Boolean))];
    
    // Cargar profesores relacionados
    const { data: profesoresData, error: errorProfesores } = await supabase
      .from('profesores')
      .select('idprofesor, nombre, materia, fotoperfil')
      .in('idprofesor', idProfesores);

    if (errorProfesores) {
      console.error('Error al cargar profesores:', errorProfesores);
      setCursos(cursosData);
      return;
    }

    // Crear un mapa de profesores por idprofesor
    const profesoresMap = {};
    if (profesoresData) {
      profesoresData.forEach(p => {
        profesoresMap[p.idprofesor] = p;
      });
    }

    // Combinar cursos con sus profesores
    const cursosConProfesores = cursosData.map(curso => ({
      ...curso,
      profesor: profesoresMap[curso.idprofesor] || null
    }));

    setCursos(cursosConProfesores);
  };

  const cargarSuscripciones = async (idalumno) => {
    if (!idalumno) return;
    // la tabla en la base de datos se llama `usuario_cursos`
    // Traemos las suscripciones con info del curso (join manual vía select de columnas relacionadas si corresponde)
    const { data, error } = await supabase
      .from('usuario_cursos')
      .select('*, cursos(*)')
      .eq('idalumno', idalumno);
    if (!error && data) setSuscripciones(data);
  };

  useEffect(() => {
    const load = () => {
      const data = localStorage.getItem('usuario');
      if (data) {
        const parsed = JSON.parse(data);
        // Si falta idalumno pero existe idusuario, usarlo y persistirlo para permitir suscripciones
        if (parsed.rol === 'alumno' && !parsed.idalumno && parsed.idusuario) {
          parsed.idalumno = parsed.idusuario;
          localStorage.setItem('usuario', JSON.stringify(parsed));
        }
        setUsuario(parsed);
        if (parsed.rol === 'alumno') cargarSuscripciones(parsed.idalumno ?? parsed.idusuario);
        else setSuscripciones([]);
      } else {
        setUsuario(null);
        setSuscripciones([]);
      }
      cargarCursos();
    };
    load();
    window.addEventListener('usuario-changed', load);
    return () => window.removeEventListener('usuario-changed', load);
  }, []);

  const idsSuscriptos = useMemo(() => new Set(suscripciones.map((s) => s.idcurso)), [suscripciones]);

  const handleSuscribir = async (idcurso) => {
    if (!esAlumno) {
      navigate('/login');
      return;
    }
    const idAlumnoReal = usuario.idalumno ?? usuario.idusuario ?? usuario.id ?? null;
    if (idAlumnoReal === null || idAlumnoReal === undefined || idAlumnoReal === '') {
      console.error('ID de alumno inválido al intentar suscribirse', { usuario });
      alert('ID de alumno inválido. Reingresá sesión o contactá al administrador.');
      return;
    }

    // Obtener el curso para decidir flujo (gratis o pago)
    const { data: cursoData } = await supabase.from('cursos').select('*').eq('idcurso', idcurso).maybeSingle();
    const precio = cursoData?.precio ?? 0;
    if (precio && Number(precio) > 0) {
      // redirigir a la página de pago
      navigate(`/curso/pagar/${idcurso}`);
      return;
    }

    try {
      // insertar en la tabla correcta `usuario_cursos`
      const { data, error } = await supabase.from('usuario_cursos').insert([{ idcurso, idalumno: idAlumnoReal }]);
      if (error) {
        // Si PostgREST retorna 404 suele indicar que la tabla no está accesible con la clave/rol (RLS/políticas)
        console.error('Error insertando suscripcion:', error, { idcurso, idalumno: idAlumnoReal, data });
        alert('No se pudo suscribir. Revisa permisos/Row Level Security en Supabase (ver consola).');
        return;
      }
      cargarSuscripciones(idAlumnoReal);
      // navegar a confirmación
      navigate(`/curso/suscrito/${idcurso}`);
    } catch (err) {
      console.error('Excepción al insertar suscripción:', err);
      alert('Ocurrió un error inesperado al suscribirse (ver consola).');
    }
  };

  const handleDesuscribir = async (idcurso) => {
    if (!esAlumno) return;
    const idAlumnoReal = usuario.idalumno ?? usuario.idusuario ?? usuario.id ?? null;
    if (idAlumnoReal === null || idAlumnoReal === undefined || idAlumnoReal === '') {
      console.error('ID de alumno inválido al intentar desuscribirse', { usuario });
      alert('ID de alumno inválido. Reingresá sesión o contactá al administrador.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('usuario_cursos')
        .delete()
        .eq('idcurso', idcurso)
        .eq('idalumno', idAlumnoReal);
      if (error) {
        console.error('Error eliminando suscripcion:', error, { idcurso, idalumno: idAlumnoReal, data });
        alert('No se pudo desuscribir. Revisa permisos/Row Level Security en Supabase (ver consola).');
        return;
      }
      cargarSuscripciones(idAlumnoReal);
    } catch (err) {
      console.error('Excepción al eliminar suscripción:', err);
      alert('Ocurrió un error inesperado al desuscribirse (ver consola).');
    }
  };

  return (
    <div className="container py-5">
      {esAlumno && suscripciones && suscripciones.length > 0 && (
        <div className="mb-4">
          <h4>Mis cursos</h4>
          <div className="row g-3">
            {suscripciones.map((s) => (
              <div className="col-md-4" key={s.idcurso + '-' + s.idalumno}>
                <div className="card">
                  <div className="card-body">
                    <h6 className="card-title">{s.cursos?.nombre ?? ('Curso ' + s.idcurso)}</h6>
                    <p className="card-text">Profesor: {s.cursos?.idprofesor ?? '-'}</p>
                    <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/curso/suscrito/${s.idcurso}`)}>Ver</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">Cursos disponibles</h2>
          <small className="text-muted">Todos los profesores</small>
        </div>
        {usuario ? (
          <span className="badge bg-success text-uppercase">{usuario.rol}</span>
        ) : (
          <button className="btn btn-outline-primary" onClick={() => navigate('/login')}>Iniciar sesión</button>
        )}
      </div>

      <div className="row g-3">
        {cursos.map((c) => {
          const suscripto = idsSuscriptos.has(c.idcurso);
          return (
            <div className="col-md-4" key={c.idcurso}>
              <div className="card h-100">
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title">{c.nombre}</h5>
                  <p className="card-text text-muted mb-2">Materia: {c.materia}</p>
                  <p className="card-text text-muted mb-2">Precio: ${c.precio}</p>
                  {c.profesor && (
                    <p className="card-text text-muted mb-2">
                      <strong>Profesor:</strong> {c.profesor.nombre}
                    </p>
                  )}
                  <p className="card-text">{c.descripcion?.slice(0, 120) ?? ''}</p>
                  {esAlumno && (
                    <div className="mt-auto">
                      {suscripto ? (
                        <button className="btn btn-outline-danger w-100" onClick={() => handleDesuscribir(c.idcurso)}>
                          Dejar de suscribirse
                        </button>
                      ) : (
                        <button className="btn btn-primary w-100" onClick={() => handleSuscribir(c.idcurso)}>
                          Suscribirse
                        </button>
                      )}
                    </div>
                  )}
                  {!esAlumno && (
                    <small className="text-muted mt-auto">Inicia sesión como alumno para suscribirte</small>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {cursos.length === 0 && (
          <div className="col-12">
            <div className="alert alert-info">No hay cursos disponibles.</div>
          </div>
        )}
      </div>
    </div>
  );
}


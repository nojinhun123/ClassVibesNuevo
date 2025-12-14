import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export default function Profesores() {
  const [profesores, setProfesores] = useState([]);
  const [cursosPorProfesor, setCursosPorProfesor] = useState({});

  useEffect(() => {
    async function load() {
      // Cargar profesores
      const { data: profesoresData, error: errorProfesores } = await supabase
        .from('profesores')
        .select('*');
      
      if (errorProfesores) {
        console.error('Error al cargar profesores:', errorProfesores);
        return;
      }

      if (profesoresData) {
        setProfesores(profesoresData);

        // Cargar cursos para cada profesor
        const { data: cursosData, error: errorCursos } = await supabase
          .from('cursos')
          .select('idcurso, nombre, idprofesor');

        if (!errorCursos && cursosData) {
          // Agrupar cursos por idprofesor
          const cursosAgrupados = {};
          cursosData.forEach((curso) => {
            if (!cursosAgrupados[curso.idprofesor]) {
              cursosAgrupados[curso.idprofesor] = [];
            }
            cursosAgrupados[curso.idprofesor].push(curso);
          });
          setCursosPorProfesor(cursosAgrupados);
        }
      }
    }
    load();
  }, []);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Profesores</h2>
        <small className="text-muted">Todos los profesores</small>
      </div>

      <div className="row g-3">
        {profesores.map((p) => {
          const cursos = cursosPorProfesor[p.idprofesor] || [];
          return (
            <div className="col-md-4" key={p.idprofesor}>
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">{p.nombre}</h5>
                  <p className="mb-1 text-muted">Materia: {p.materia}</p>
                  <p className="mb-1 text-muted">Valoración: {p.valoracion ?? '-'}</p>
                  <p className="mb-1 text-muted">Búsquedas: {p.busquedas ?? '-'}</p>
                  <p className="mb-1 text-muted">Cant. alumnos: {p.cantalumnos ?? '-'}</p>
                  <div className="mt-3">
                    <h6 className="mb-2">Cursos ({cursos.length}):</h6>
                    {cursos.length > 0 ? (
                      <ul className="list-unstyled mb-0">
                        {cursos.map((curso) => (
                          <li key={curso.idcurso} className="text-muted small">
                            • {curso.nombre}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted small mb-0">No tiene cursos aún</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {profesores.length === 0 && (
          <div className="col-12">
            <div className="alert alert-info">No hay profesores para mostrar.</div>
          </div>
        )}
      </div>
    </div>
  );
}



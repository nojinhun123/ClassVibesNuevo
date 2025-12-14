import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate, useParams } from 'react-router-dom';

export default function CrearCurso() {
  const navigate = useNavigate();
  const { idcurso } = useParams();
  const esEdicion = !!idcurso;
  const [usuario, setUsuario] = useState(null);
  const [curso, setCurso] = useState({
    idprofesor: '',
    nombre: '',
    precio: '',
    materia: '',
    aniosecundaria: '',
    fotocurso: '',
    descripcion: '',
    videocurso: ''
  });
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const data = localStorage.getItem('usuario');
    if (!data) {
      navigate('/login');
      return;
    }
    const parsed = JSON.parse(data);
    if (parsed.rol !== 'profesor') {
      navigate('/login');
      return;
    }
    setUsuario(parsed);
    setCurso((prev) => ({ ...prev, idprofesor: parsed.idprofesor }));

    // Si estamos editando, cargar los datos del curso
    if (esEdicion && idcurso) {
      cargarCurso(idcurso, parsed.idprofesor);
    }
  }, [navigate, idcurso, esEdicion]);

  const cargarCurso = async (idcurso, idprofesor) => {
    setCargando(true);
    const { data, error } = await supabase
      .from('cursos')
      .select('*')
      .eq('idcurso', idcurso)
      .eq('idprofesor', idprofesor)
      .single();

    if (error || !data) {
      alert('Error al cargar el curso. No se encontró o no tenés permisos para editarlo.');
      navigate('/admin');
      return;
    }

    setCurso({
      idprofesor: data.idprofesor.toString(),
      nombre: data.nombre || '',
      precio: data.precio?.toString() || '',
      materia: data.materia || '',
      aniosecundaria: data.aniosecundaria?.toString() || '',
      fotocurso: data.fotocurso || '',
      descripcion: data.descripcion || '',
      videocurso: data.videocurso || ''
    });
    setCargando(false);
  };

  const handleChange = (e) => {
    setCurso({ ...curso, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar que el usuario esté logueado y sea profesor
    if (!usuario || usuario.rol !== 'profesor') {
      return alert("Debés iniciar sesión como profesor.");
    }

    // Obtener idprofesor del usuario (puede venir directamente o necesitamos buscarlo)
    let idprofesor = usuario.idprofesor;
    
    // Si no tenemos idprofesor, intentar buscarlo por nombre
    if (!idprofesor) {
      const { data: profData } = await supabase
        .from('profesores')
        .select('idprofesor')
        .eq('nombre', usuario.nombre)
        .maybeSingle();
      idprofesor = profData?.idprofesor;
    }

    if (!idprofesor) {
      return alert("No se pudo identificar el ID del profesor. Por favor, contactá al administrador.");
    }

    // Validaciones de campos
    if (!curso.nombre.trim()) return alert("El nombre del curso es obligatorio.");
    if (isNaN(parseFloat(curso.precio))) return alert("El precio debe ser un número.");
    if (!curso.materia.trim()) return alert("La materia es obligatoria.");
    if (!curso.aniosecundaria || isNaN(curso.aniosecundaria)) return alert("El año debe ser un número.");
    if (!curso.fotocurso.trim()) return alert("Debe ingresar la URL de la foto.");
    if (!curso.descripcion.trim()) return alert("La descripción es obligatoria.");
    if (!curso.videocurso.trim()) return alert("Debe ingresar la URL del video.");

    // Preparar datos para insertar (solo campos que existen en la tabla)
    const cursoFinal = {
      idprofesor: parseInt(idprofesor),
      nombre: curso.nombre.trim(),
      precio: parseFloat(curso.precio),
      materia: curso.materia.trim(),
      aniosecundaria: parseInt(curso.aniosecundaria),
      fotocurso: curso.fotocurso.trim(),
      descripcion: curso.descripcion.trim(),
      videocurso: curso.videocurso.trim()
    };

    console.log("⏳ Enviando a Supabase:", cursoFinal);

    let error = null;
    
    if (esEdicion && idcurso) {
      // Actualizar curso existente
      const { error: updateError } = await supabase
        .from('cursos')
        .update(cursoFinal)
        .eq('idcurso', idcurso)
        .eq('idprofesor', idprofesor);
      error = updateError;
    } else {
      // Crear nuevo curso
      const { error: insertError } = await supabase.from('cursos').insert([cursoFinal]);
      error = insertError;
    }

    if (error) {
      console.error('❌ Supabase error:', error);
      alert(`Error al ${esEdicion ? 'actualizar' : 'crear'} el curso. Revisa la consola para más información.`);
    } else {
      alert(`Curso ${esEdicion ? 'actualizado' : 'creado'} correctamente`);
      navigate('/admin');
    }
  };

  const handleCancel = () => navigate('/admin');

  if (!usuario) return null;

  if (cargando) {
    return (
      <div className="container py-5" style={{ maxWidth: '800px' }}>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="container py-5" style={{ maxWidth: '800px' }}>
      <h2 className="mb-4 fw-bold">{esEdicion ? 'Editar Curso' : 'Crear Curso'}</h2>
      <form onSubmit={handleSubmit}>
        {/* Profesor actual */}
        <div className="mb-3">
          <label>Profesor</label>
          <input
            type="text"
            className="form-control"
            value={usuario?.nombre || ''}
            disabled
          />
        </div>

        {/* Campos de texto */}
        {[
          ['nombre', 'Nombre del Curso'],
          ['precio', 'Precio'],
          ['materia', 'Materia'],
          ['aniosecundaria', 'Año Secundaria'],
          ['fotocurso', 'Foto del Curso (URL)'],
          ['videocurso', 'Video del Curso (URL)']
        ].map(([name, label]) => (
          <div className="mb-3" key={name}>
            <label>{label} <span className="text-danger">*</span></label>
            <input
              type={name === 'aniosecundaria' ? 'number' : name === 'precio' ? 'number' : 'text'}
              className="form-control"
              name={name}
              value={curso[name]}
              onChange={handleChange}
              required
              step={name === 'precio' ? '0.01' : undefined}
            />
          </div>
        ))}

        {/* Descripción */}
        <div className="mb-4">
          <label>Descripción <span className="text-danger">*</span></label>
          <textarea
            className="form-control"
            name="descripcion"
            rows="3"
            value={curso.descripcion}
            onChange={handleChange}
            required
          />
        </div>

        {/* Botones */}
        <button type="submit" className="btn btn-primary me-2">
          {esEdicion ? 'Guardar Cambios' : 'Crear Curso'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={handleCancel}>
          Cancelar
        </button>
      </form>
    </div>
  );
}

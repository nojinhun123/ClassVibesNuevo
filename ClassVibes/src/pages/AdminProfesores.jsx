import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

export default function AdminProfesores() {
  const [profesores, setProfesores] = useState([]);
  const [form, setForm] = useState({ 
    idprofesor: null, 
    nombre: '', 
    email: '', 
    clave: '', 
    materia: '',
    experiencia: '',
    fotoperfil: ''
  });
  const navigate = useNavigate();

  const cargarProfesores = async () => {
    const { data, error } = await supabase.from('profesores').select('*').order('idprofesor', { ascending: true });
    if (!error && data) setProfesores(data);
  };

  useEffect(() => {
    const data = localStorage.getItem('usuario');
    if (!data) {
      navigate('/login');
      return;
    }
    const parsed = JSON.parse(data);
    if (parsed.rol !== 'admin') {
      navigate('/login');
      return;
    }
    cargarProfesores();
  }, [navigate]);

  const resetForm = () => setForm({ 
    idprofesor: null, 
    nombre: '', 
    email: '', 
    clave: '', 
    materia: '',
    experiencia: '',
    fotoperfil: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.email.trim() || !form.clave.trim() || !form.materia.trim()) {
      alert('Completá todos los campos obligatorios (Nombre, Email, Clave, Materia)');
      return;
    }

    const profesorData = {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      clave: form.clave.trim(),
      materia: form.materia.trim(),
      experiencia: form.experiencia ? parseInt(form.experiencia) : 0,
      fotoperfil: form.fotoperfil.trim() || null,
      valoracion: 0,
      busquedas: 0,
      cantcursos: 0,
      cantalumnos: 0
    };

    if (form.idprofesor) {
      // En la actualización, no incluimos campos que no queremos cambiar
      const updateData = {
        nombre: profesorData.nombre,
        email: profesorData.email,
        clave: profesorData.clave,
        materia: profesorData.materia,
        experiencia: profesorData.experiencia
      };
      if (profesorData.fotoperfil) {
        updateData.fotoperfil = profesorData.fotoperfil;
      }
      const { error } = await supabase
        .from('profesores')
        .update(updateData)
        .eq('idprofesor', form.idprofesor);
      if (error) {
        console.error('Error al actualizar profesor:', error);
        return alert('Error al actualizar profesor: ' + error.message);
      }
    } else {
  // 1. Verificar que NO exista usuario con ese email
  const { data: usuarioExistente, error: errorCheckUsuario } = await supabase
    .from('usuario')
    .select('id')
    .eq('email', profesorData.email)
    .maybeSingle();

  if (errorCheckUsuario) {
    return alert('Error al verificar usuario: ' + errorCheckUsuario.message);
  }

  if (usuarioExistente) {
    return alert('Ya existe un usuario con ese email.');
  }

  // 2. Crear usuario
  const { data: usuarioInserted, error: errorUsuario } = await supabase
    .from('usuario')
    .insert([{
      nombre: profesorData.nombre,
      username: profesorData.email.split('@')[0],
      contraseña: profesorData.clave,
      email: profesorData.email,
      fotoperfil: profesorData.fotoperfil || null,
      fechanacimiento: null,
      genero: null,
      aniosecundaria: null,
      telefono: null,
      edad: null
    }])
    .select()
    .single();

  if (errorUsuario) {
    return alert('Error al crear usuario: ' + errorUsuario.message);
  }

  // 3. Obtener perfil profesor
  const { data: perfiles } = await supabase.from('perfiles').select('*');
  const perfilProfesor = perfiles.find(p => p.nombre.toLowerCase() === 'profesor');

  if (!perfilProfesor) {
    await supabase.from('usuario').delete().eq('id', usuarioInserted.id);
    return alert('No existe el perfil profesor.');
  }

  // 4. Asignar perfil
  const { error: errorUsuarioPerfil } = await supabase
    .from('usuario_perfil')
    .insert([{
      usuario_id: usuarioInserted.id,
      perfil_id: perfilProfesor.id
    }]);

  if (errorUsuarioPerfil) {
    await supabase.from('usuario').delete().eq('id', usuarioInserted.id);
    return alert('Error al asignar perfil.');
  }

  // 5. Crear profesor (AHORA sí, porque el usuario ya existe)
  const { error: errorProfesor } = await supabase
    .from('profesores')
    .insert([profesorData]);

  if (errorProfesor) {
    await supabase.from('usuario').delete().eq('id', usuarioInserted.id);
    return alert('Error al crear profesor: ' + errorProfesor.message);
  }
}

    resetForm();
    cargarProfesores();
  };

  const handleEditar = (prof) => {
    setForm({
      idprofesor: prof.idprofesor,
      nombre: prof.nombre || '',
      email: prof.email || '',
      clave: prof.clave || '',
      materia: prof.materia || '',
      experiencia: prof.experiencia || '',
      fotoperfil: prof.fotoperfil || ''
    });
  };

  const handleEliminar = async (idprofesor) => {
  if (!window.confirm('¿Eliminar profesor?')) return;

  // 1. Obtener el email del profesor
  const { data: profesor, error: errorProfesor } = await supabase
    .from('profesores')
    .select('email')
    .eq('idprofesor', idprofesor)
    .single();

  if (errorProfesor || !profesor) {
    return alert('No se pudo obtener el profesor.');
  }

  // 2. Borrar el usuario (esto dispara la cascada)
  const { error: errorUsuario } = await supabase
    .from('usuario')
    .delete()
    .eq('email', profesor.email);

  if (errorUsuario) {
    return alert('No se pudo eliminar el usuario.');
  }

  // 3. Listo: profesor + cursos + lo que dependa cae solo
  cargarProfesores();
};

  return (
    <div className="container py-5" style={{ maxWidth: '900px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Administrar Profesores</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/home')}>Volver</button>
      </div>

      <form className="card card-body mb-4" onSubmit={handleSubmit}>
        <h5 className="mb-3">{form.idprofesor ? 'Editar profesor' : 'Nuevo profesor'}</h5>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Nombre <span className="text-danger">*</span></label>
            <input
              type="text"
              className="form-control"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Email <span className="text-danger">*</span></label>
            <input
              type="email"
              className="form-control"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Clave <span className="text-danger">*</span></label>
            <input
              type="password"
              className="form-control"
              value={form.clave}
              onChange={(e) => setForm({ ...form, clave: e.target.value })}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Materia <span className="text-danger">*</span></label>
            <input
              type="text"
              className="form-control"
              value={form.materia}
              onChange={(e) => setForm({ ...form, materia: e.target.value })}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Experiencia (años)</label>
            <input
              type="number"
              className="form-control"
              value={form.experiencia}
              onChange={(e) => setForm({ ...form, experiencia: e.target.value })}
              min="0"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Foto de Perfil (URL)</label>
            <input
              type="url"
              className="form-control"
              value={form.fotoperfil}
              onChange={(e) => setForm({ ...form, fotoperfil: e.target.value })}
              placeholder="https://ejemplo.com/imagen.jpg"
            />
          </div>
        </div>
        <div className="mt-3">
          <small className="text-muted d-block mb-2"><span className="text-danger">*</span> Campos obligatorios</small>
          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary">{form.idprofesor ? 'Guardar cambios' : 'Crear'}</button>
            {form.idprofesor && <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancelar edición</button>}
          </div>
        </div>
      </form>

      <table className="table table-bordered table-hover">
        <thead className="table-light">
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Materia</th>
            <th>Experiencia</th>
            <th style={{ width: '160px' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {profesores.map((p) => (
            <tr key={p.idprofesor}>
              <td>{p.nombre}</td>
              <td>{p.email}</td>
              <td>{p.materia || '-'}</td>
              <td>{p.experiencia || 0} años</td>
              <td>
                <div className="d-flex gap-2">
                  <button className="btn btn-sm btn-warning" onClick={() => handleEditar(p)}>Editar</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleEliminar(p.idprofesor)}>Eliminar</button>
                </div>
              </td>
            </tr>
          ))}
          {profesores.length === 0 && (
            <tr><td colSpan="5">No hay profesores cargados.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}



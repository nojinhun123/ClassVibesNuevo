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
      // Crear el profesor primero
      const { data: profesorInserted, error: errorProfesor } = await supabase
        .from('profesores')
        .insert([profesorData])
        .select()
        .single();
      
      if (errorProfesor) {
        console.error('Error al crear profesor:', errorProfesor);
        return alert('Error al crear profesor: ' + errorProfesor.message);
      }

      // Obtener el ID del perfil "profesor" (case-insensitive)
      const { data: perfilesData, error: errorPerfil } = await supabase
        .from('perfiles')
        .select('id, nombre');

      if (errorPerfil) {
        console.error('Error al obtener perfiles:', errorPerfil);
        return alert('Error al obtener los perfiles: ' + errorPerfil.message);
      }

      const perfilData = perfilesData?.find(p => p.nombre?.toLowerCase() === 'profesor');
      
      if (!perfilData) {
        console.error('No se encontró el perfil de profesor');
        // Eliminar el profesor creado
        await supabase.from('profesores').delete().eq('idprofesor', profesorInserted.idprofesor);
        return alert('Error: No se encontró el perfil "profesor" en la tabla perfiles. Asegurate de que exista.');
      }

      // Verificar si el email ya existe en usuarios
      const { data: usuarioExistente, error: errorCheckUsuario } = await supabase
        .from('usuario')
        .select('id')
        .eq('email', profesorData.email)
        .maybeSingle();

      if (errorCheckUsuario) {
        console.error('Error al verificar usuario existente:', errorCheckUsuario);
        await supabase.from('profesores').delete().eq('idprofesor', profesorInserted.idprofesor);
        return alert('Error al verificar si el usuario existe: ' + errorCheckUsuario.message);
      }

      if (usuarioExistente) {
        await supabase.from('profesores').delete().eq('idprofesor', profesorInserted.idprofesor);
        return alert('Error: Ya existe un usuario con ese email. El profesor no fue creado.');
      }

      // Generar username único (usar parte del email antes del @)
      let usernameBase = profesorData.email.split('@')[0] || profesorData.nombre.toLowerCase().replace(/\s+/g, '');
      let username = usernameBase;
      let contador = 1;
      const maxIntentos = 100;

      // Verificar si el username ya existe y generar uno único
      let usernameExiste = true;
      while (usernameExiste && contador <= maxIntentos) {
        const { data: usernameCheck } = await supabase
          .from('usuario')
          .select('id')
          .eq('username', username)
          .maybeSingle();
        
        if (!usernameCheck) {
          usernameExiste = false;
        } else {
          username = `${usernameBase}${contador}`;
          contador++;
        }
      }

      if (contador > maxIntentos) {
        await supabase.from('profesores').delete().eq('idprofesor', profesorInserted.idprofesor);
        return alert('Error: No se pudo generar un username único después de varios intentos.');
      }

      // Crear el usuario con los datos del profesor (sin ID, asumiendo auto-increment)
      const usuarioData = {
        nombre: profesorData.nombre,
        username: username,
        contraseña: profesorData.clave,
        email: profesorData.email,
        fotoperfil: profesorData.fotoperfil,
        // Campos opcionales con valores por defecto
        fechanacimiento: null,
        genero: null,
        aniosecundaria: null,
        telefono: null,
        edad: null
      };

      // Intentar crear el usuario (el ID se auto-incrementa automáticamente en Supabase)
      let { data: usuarioInserted, error: errorUsuario } = await supabase
        .from('usuario')
        .insert([usuarioData])
        .select()
        .single();

      // Si falla con duplicate key, obtener el siguiente ID disponible manualmente
      if (errorUsuario && errorUsuario.message?.includes('duplicate key') && errorUsuario.message?.includes('usuario_pkey')) {
        console.log('Error de clave duplicada detectado, obteniendo siguiente ID disponible...');
        
        // Obtener todos los IDs existentes para encontrar el siguiente disponible
        const { data: todosUsuarios, error: errorTodos } = await supabase
          .from('usuario')
          .select('id')
          .order('id', { ascending: true });

        if (errorTodos) {
          console.error('Error al obtener usuarios:', errorTodos);
          await supabase.from('profesores').delete().eq('idprofesor', profesorInserted.idprofesor);
          return alert('Error al obtener los IDs de usuarios: ' + errorTodos.message);
        }

        // Encontrar el siguiente ID disponible
        let siguienteId = 1;
        if (todosUsuarios && todosUsuarios.length > 0) {
          const ids = todosUsuarios.map(u => u.id).sort((a, b) => a - b);
          // Buscar el primer hueco o usar el máximo + 1
          for (let i = 0; i < ids.length; i++) {
            if (ids[i] !== i + 1) {
              siguienteId = i + 1;
              break;
            }
            siguienteId = ids[ids.length - 1] + 1;
          }
        }

        // Intentar insertar con el ID calculado
        const usuarioDataConId = {
          ...usuarioData,
          id: siguienteId
        };

        const result = await supabase
          .from('usuario')
          .insert([usuarioDataConId])
          .select()
          .single();

        usuarioInserted = result.data;
        errorUsuario = result.error;
      }

      if (errorUsuario || !usuarioInserted) {
        console.error('Error al crear usuario:', errorUsuario);
        // Si falla la creación del usuario, eliminar el profesor creado
        await supabase.from('profesores').delete().eq('idprofesor', profesorInserted.idprofesor);
        
        // Mensaje de error más descriptivo
        if (errorUsuario?.message?.includes('null') && errorUsuario?.message?.includes('id')) {
          return alert('Error: El campo ID es requerido. Necesitas configurar el auto-increment en Supabase para la columna id de la tabla usuario, o contactar al administrador.');
        }
        return alert('Error al crear usuario: ' + (errorUsuario?.message || 'Error desconocido'));
      }

      // Crear la relación usuario_perfil para asignar el rol de profesor
      const { error: errorUsuarioPerfil } = await supabase
        .from('usuario_perfil')
        .insert([{
          usuario_id: usuarioInserted.id,
          perfil_id: perfilData.id
        }]);

      if (errorUsuarioPerfil) {
        console.error('Error al asignar perfil de profesor:', errorUsuarioPerfil);
        // Si falla la asignación del perfil, eliminar usuario y profesor
        await supabase.from('usuario').delete().eq('id', usuarioInserted.id);
        await supabase.from('profesores').delete().eq('idprofesor', profesorInserted.idprofesor);
        return alert('Error al asignar el perfil de profesor: ' + errorUsuarioPerfil.message);
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
    if (!confirm('¿Eliminar profesor?')) return;
    const { error } = await supabase.from('profesores').delete().eq('idprofesor', idprofesor);
    if (error) {
      alert('No se pudo eliminar');
      return;
    }
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



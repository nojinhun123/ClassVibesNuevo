import { useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [form, setForm] = useState({ identificador: '', contraseña: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.identificador.trim()) {
      setError('Ingresá tu ID, usuario o nombre.');
      return;
    }

    // Login contra la tabla usuario y rol desde perfiles (usuario_perfil → perfiles)
    const identifier = form.identificador.trim();
    const isNumericId = identifier !== '' && !Number.isNaN(Number(identifier));

    let data = null;
    let error = null;

    if (isNumericId) {
      ({ data, error } = await supabase
        .from('usuario')
        .select(
          `
          *,
          usuario_perfil (
            perfiles (id, nombre)
          )
        `
        )
        .eq('id', Number(identifier))
        .maybeSingle());
    }

    if (!data && !error) {
      ({ data, error } = await supabase
        .from('usuario')
        .select(
          `
          *,
          usuario_perfil (
            perfiles (id, nombre)
          )
        `
        )
        .or(`username.eq.${identifier},nombre.eq.${identifier}`)
        .maybeSingle());
    }

    if (error || !data) {
      setError('Usuario o contraseña incorrectos');
      return;
    }

    const passwordField = data.contraseña ?? data.contrasena ?? data.password ?? data.clave;
    if (passwordField !== form.contraseña) {
      setError('Usuario o contraseña incorrectos');
      return;
    }

    const perfil = data.usuario_perfil?.[0]?.perfiles?.nombre?.toLowerCase();
    const rol = perfil || 'alumno'; // fallback
    const idFieldFound = 'id';

    // Si es profesor, tratamos de obtener idprofesor por nombre
    let idprofesor = null;
    if (rol === 'profesor') {
      const { data: profData } = await supabase
        .from('profesores')
        .select('idprofesor, nombre')
        .eq('nombre', data.nombre)
        .maybeSingle();
      idprofesor = profData?.idprofesor ?? null;
    }

    if (!data || !rol) {
      setError('Usuario o contraseña incorrectos');
      return;
    }

    const usuario = {
      [idFieldFound]: data[idFieldFound],
      nombre: data.nombre,
      username: data.username ?? data.nombre,
      rol,
      idprofesor: idprofesor ?? undefined,
      idusuario: data.id,
      // si el usuario es alumno, guardamos idalumno para las suscripciones
      idalumno: rol === 'alumno' ? data.id : undefined
    };

    localStorage.setItem('usuario', JSON.stringify(usuario));
    window.dispatchEvent(new Event('usuario-changed'));
    if (rol === 'admin') navigate('/admin/profesores');
    else if (rol === 'profesor') navigate('/admin');
    else navigate('/cursos');
  };

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', background: '#f4f4f4' }}>
      <div className="text-center w-100" style={{ maxWidth: '400px' }}>
        <h2 className="mb-4" style={{ fontWeight: 'bold' }}>Iniciar Sesión</h2>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} className="border rounded shadow-sm p-4" style={{ borderColor: '#007CF0', borderWidth: '1px' }}>
          <div className="mb-3 text-start">
            <label className="form-label fw-bold">ID / Usuario / Nombre</label>
            <input
              type="text"
              name="identificador"
              className="form-control bg-light"
              value={form.identificador}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-4 text-start">
            <label className="form-label fw-bold">Contraseña</label>
            <input
              type="password"
              name="contraseña"
              className="form-control bg-light"
              value={form.contraseña}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-100 fw-bold">Iniciar Sesión</button>
        </form>
      </div>
    </div>
  );
}
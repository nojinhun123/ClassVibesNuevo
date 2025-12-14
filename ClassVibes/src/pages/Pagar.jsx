import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate, useParams } from 'react-router-dom';

export default function Pagar() {
  const { idcurso } = useParams();
  const navigate = useNavigate();
  const [curso, setCurso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('cursos').select('*').eq('idcurso', Number(idcurso)).maybeSingle();
      setCurso(data);
      setLoading(false);
    };
    load();
  }, [idcurso]);

  const handlePay = async () => {
    setPaying(true);
    // Simulamos pago: en un caso real llamarías al provider y al retornar insertar la suscripción
    setTimeout(async () => {
      // Insertar suscripción
      const usuarioRaw = localStorage.getItem('usuario');
      const usuario = usuarioRaw ? JSON.parse(usuarioRaw) : null;
      const idAlumnoReal = usuario?.idalumno ?? usuario?.idusuario ?? usuario?.id;
      if (!idAlumnoReal) {
        alert('ID de alumno inválido. Reingresá sesión');
        setPaying(false);
        return;
      }
      await supabase.from('usuario_cursos').insert([{ idcurso: Number(idcurso), idalumno: idAlumnoReal }]);
      navigate(`/curso/suscrito/${idcurso}`);
    }, 1200);
  };

  if (loading) return <div className="container py-5">Cargando...</div>;
  if (!curso) return <div className="container py-5">Curso no encontrado.</div>;

  return (
    <div className="container py-5">
      <h2>Pagar curso</h2>
      <p>Vas a pagar el curso <strong>{curso.nombre}</strong> por ${curso.precio}.</p>
      <button className="btn btn-success" onClick={handlePay} disabled={paying}>{paying ? 'Procesando...' : 'Pagar'}</button>
    </div>
  );
}

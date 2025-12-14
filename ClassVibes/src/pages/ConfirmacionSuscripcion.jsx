import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useParams, Link } from 'react-router-dom';

export default function ConfirmacionSuscripcion() {
  const { idcurso } = useParams();
  const [curso, setCurso] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('cursos').select('*').eq('idcurso', Number(idcurso)).maybeSingle();
      setCurso(data);
      setLoading(false);
    };
    load();
  }, [idcurso]);

  if (loading) return <div className="container py-5">Cargando...</div>;
  if (!curso) return <div className="container py-5">Curso no encontrado.</div>;

  return (
    <div className="container py-5">
      <h2>Te has suscrito</h2>
      <p>Te has suscrito al curso <strong>{curso.nombre}</strong>.</p>
      <p>Profesor: {curso.nombre}</p>
      <Link to="/cursos" className="btn btn-primary">Volver a cursos</Link>
    </div>
  );
}

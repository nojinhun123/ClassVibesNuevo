import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate, useParams } from 'react-router-dom';

export default function Pagar() {
  const { idcurso } = useParams();
  const navigate = useNavigate();
  const [curso, setCurso] = useState(null);

  useEffect(() => {
    supabase
      .from('cursos')
      .select('*')
      .eq('idcurso', Number(idcurso))
      .single()
      .then(({ data }) => setCurso(data));
  }, [idcurso]);

  const handlePay = async () => {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    if (!usuario) {
      navigate('/login');
      return;
    }

    const { error } = await supabase.from('usuario_cursos').insert({
      idcurso: Number(idcurso),
      idalumno: usuario.id, // 🔥 MISMO ID
    });

    if (error) {
      alert('Error al pagar');
      return;
    }

    alert('Pago exitoso');
    navigate('/cursos'); // 🔥 vuelve y se recarga bien
  };

  if (!curso) return null;

  return (
    <div className="container py-5">
      <h2>Pago</h2>
      <p>
        Curso: <strong>{curso.nombre}</strong><br />
        Precio: ${curso.precio}
      </p>

      <button className="btn btn-success" onClick={handlePay}>
        Confirmar pago
      </button>
    </div>
  );
}

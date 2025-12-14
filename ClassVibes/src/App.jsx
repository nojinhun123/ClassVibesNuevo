import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import AdminCursos from './pages/AdminCursos';
import CrearCurso from './pages/CrearCurso';
import Cursos from './pages/Cursos';
import AdminProfesores from './pages/AdminProfesores';
import Profesores from './pages/Profesores';
import ConfirmacionSuscripcion from './pages/ConfirmacionSuscripcion';
import Pagar from './pages/Pagar';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/cursos" element={<Cursos />} />
  <Route path="/curso/suscrito/:idcurso" element={<ConfirmacionSuscripcion />} />
  <Route path="/curso/pagar/:idcurso" element={<Pagar />} />
        <Route path="/profesores" element={<Profesores />} />
        <Route path="/admin" element={<AdminCursos />} />
        <Route path="/admin/crear-curso" element={<CrearCurso />} />
        <Route path="/admin/editar-curso/:idcurso" element={<CrearCurso />} />
        <Route path="/admin/profesores" element={<AdminProfesores />} />
      </Routes>
      <Footer />
    </>
  );
}

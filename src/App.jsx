import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ChatCliente from './components/ChatCliente';
import DashboardAdmin from './components/DashboardAdmin';

function App() {
  return (
    <Router>
      <Routes>
        {/* Questa è la pagina che vedranno tutti i clienti */}
        <Route path="/" element={<ChatCliente />} />

        {/* Questa è la tua pagina segreta (cambia il nome come vuoi) */}
        <Route path="/tempio-segreto-creator-99" element={<DashboardAdmin />} />
        
        {/* Rotta di cortesia se sbagliano link */}
        <Route path="*" element={<div style={{color: 'white', textAlign: 'center', marginTop: '50px'}}>L'universo non ha trovato questa pagina...</div>} />
      </Routes>
    </Router>
  );
}

export default App;

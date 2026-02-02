import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ChatCliente from './components/ChatCliente';
import DashboardAdmin from './components/DashboardAdmin';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ChatCliente />} />
        <Route path="/admin-segreto" element={<DashboardAdmin />} />
      </Routes>
    </Router>
  );
}
export default App;

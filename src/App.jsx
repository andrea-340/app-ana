import ChatCliente from './components/ChatCliente';
import DashboardAdmin from './components/DashboardAdmin';

function App() {
  // Controlla se nell'URL c'è "?admin=true"
  const isAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';

  return (
    <div className="App">
      {isAdmin ? <DashboardAdmin /> : <ChatCliente />}
    </div>
  );
}

export default App;
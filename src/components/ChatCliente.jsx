import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ChatCliente() {
  const [nomeCognome, setNomeCognome] = useState('');
  const [chatId, setChatId] = useState(localStorage.getItem('chat_token'));
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef();

  // Carica messaggi e attiva Realtime
  useEffect(() => {
    if (!chatId) return;
    
    const fetchMsgs = async () => {
      const { data } = await supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMsgs();

    const channel = supabase.channel(`chat-${chatId}`).on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      (p) => setMessages(prev => [...prev, p.new])
    ).subscribe();

    return () => supabase.removeChannel(channel);
  }, [chatId]);

  // Scroll automatico all'ultimo messaggio
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const startChat = async (e) => {
    e.preventDefault();
    if (!nomeCognome.trim()) return;
    
    const { data, error } = await supabase.from('chats').insert([{ client_name: nomeCognome }]).select().single();
    if (data) {
      setChatId(data.id);
      localStorage.setItem('chat_token', data.id);
    }
  };

  const sendMsg = async () => {
    if (!input.trim()) return;
    await supabase.from('messages').insert([{ chat_id: chatId, content: input, sender: 'client' }]);
    setInput('');
  };

  const styles = {
    screen: { 
      height: '100vh', 
      width: '100vw', 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: '#1a0033', // Sfondo scuro
      color: '#ffd700', 
      fontFamily: 'sans-serif' 
    },
    loginContainer: {
      margin: 'auto',
      width: '90%',
      maxWidth: '400px',
      padding: '30px',
      backgroundColor: '#2a004f',
      borderRadius: '15px',
      border: '2px solid #ffd700',
      textAlign: 'center',
      boxShadow: '0 0 20px rgba(0,0,0,0.5)'
    },
    header: { 
      padding: '15px', 
      backgroundColor: '#2a004f', 
      borderBottom: '2px solid #ffd700', 
      textAlign: 'center', 
      fontWeight: 'bold',
      fontSize: '1.2rem'
    },
    msgArea: { 
      flex: 1, 
      overflowY: 'auto', 
      padding: '15px', 
      display: 'flex', 
      flexDirection: 'column'
    },
    inputArea: { 
      padding: '15px', 
      backgroundColor: '#2a004f', 
      display: 'flex', 
      gap: '10px', 
      borderTop: '2px solid #ffd700',
      paddingBottom: '30px' // Spazio extra per mobile (evita la barra del browser)
    },
    inputField: { 
      flex: 1, 
      padding: '12px', 
      borderRadius: '25px', 
      border: '1px solid #ffd700', 
      backgroundColor: 'white', // Fondo bianco per essere sicuri che si veda
      color: 'black', 
      fontSize: '16px' // Evita lo zoom automatico su iPhone
    },
    btn: { 
      backgroundColor: '#ffd700', 
      color: '#1a0033', 
      border: 'none', 
      padding: '10px 20px', 
      borderRadius: '25px', 
      fontWeight: 'bold',
      cursor: 'pointer'
    }
  };

  // SCHERMATA LOGIN (Se non c'è chatId)
  if (!chatId) {
    return (
      <div style={styles.screen}>
        <div style={styles.loginContainer}>
          <h2 style={{ marginBottom: '20px' }}>Benvenuta</h2>
          <p style={{ marginBottom: '20px', fontSize: '0.9rem' }}>Inserisci il tuo nome per iniziare la chat privata</p>
          <form onSubmit={startChat}>
            <input 
              style={styles.inputField} 
              placeholder="Nome e Cognome" 
              value={nomeCognome} 
              onChange={e => setNomeCognome(e.target.value)}
              required
            />
            <button type="submit" style={{ ...styles.btn, marginTop: '20px', width: '100%' }}>
              ENTRA NELLA CHAT
            </button>
          </form>
        </div>
      </div>
    );
  }

  // SCHERMATA CHAT ATTIVA
  return (
    <div style={styles.screen}>
      <div style={styles.header}>Supporto Clienti</div>
      
      <div style={styles.msgArea}>
        {messages.map(m => (
          <div key={m.id} style={{ 
            alignSelf: m.sender === 'client' ? 'flex-end' : 'flex-start',
            backgroundColor: m.sender === 'client' ? '#4a148c' : '#330066',
            color: 'white',
            padding: '10px 15px',
            borderRadius: '15px',
            marginBottom: '10px',
            maxWidth: '80%',
            border: m.sender === 'client' ? '1px solid #ffd700' : '1px solid #4a148c'
          }}>
            {m.content}
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <div style={styles.inputArea}>
        <input 
          style={styles.inputField} 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyPress={e => e.key === 'Enter' && sendMsg()}
          placeholder="Scrivi qui..."
        />
        <button style={styles.btn} onClick={sendMsg}>Invia</button>
      </div>
    </div>
  );
}

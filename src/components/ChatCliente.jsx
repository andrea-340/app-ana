import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ChatCliente() {
  const [nomeCognome, setNomeCognome] = useState('');
  const [chatId, setChatId] = useState(localStorage.getItem('chat_token'));
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef();

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

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const startChat = async (e) => {
    e.preventDefault();
    if (!nomeCognome.trim()) return;
    const { data } = await supabase.from('chats').insert([{ client_name: nomeCognome }]).select().single();
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
    screen: { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: '#1a0033', color: '#ffd700', fontFamily: 'serif' },
    loginBox: { margin: 'auto', textAlign: 'center', padding: '20px', width: '90%', maxWidth: '400px', border: '2px solid #ffd700', borderRadius: '20px', backgroundColor: '#2a004f' },
    header: { padding: '15px', backgroundColor: '#2a004f', borderBottom: '1px solid #ffd700', textAlign: 'center', fontWeight: 'bold' },
    msgArea: { flex: 1, overflowY: 'auto', padding: '15px', backgroundImage: 'radial-gradient(circle, #2a004f, #1a0033)' },
    inputArea: { padding: '15px', backgroundColor: '#2a004f', display: 'flex', gap: '10px', borderTop: '1px solid #ffd700' },
    input: { flex: 1, padding: '12px', borderRadius: '25px', border: '1px solid #ffd700', backgroundColor: '#1a0033', color: 'white' },
    btn: { backgroundColor: '#ffd700', color: '#1a0033', border: 'none', padding: '10px 20px', borderRadius: '20px', fontWeight: 'bold' }
  };

  if (!chatId) {
    return (
      <div style={styles.screen}>
        <div style={styles.loginBox}>
          <h2 style={{ marginBottom: '20px' }}>Benvenuta nel mio Salotto</h2>
          <form onSubmit={startChat}>
            <input 
              style={{ ...styles.input, width: '100%', marginBottom: '15px' }} 
              placeholder="Il tuo Nome e Cognome" 
              value={nomeCognome} 
              onChange={e => setNomeCognome(e.target.value)} 
            />
            <button type="submit" style={styles.btn}>Inizia Conversazione</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.screen}>
      <div style={styles.header}>Assistenza Privata</div>
      <div style={styles.msgArea}>
        {messages.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.sender === 'client' ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
            <div style={{ 
              backgroundColor: m.sender === 'client' ? '#4a148c' : '#330066', 
              color: 'white', padding: '10px 15px', borderRadius: '15px', border: '1px solid #ffd700', maxWidth: '80%' 
            }}>
              {m.content}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>
      <div style={styles.inputArea}>
        <input 
          style={styles.input} 
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

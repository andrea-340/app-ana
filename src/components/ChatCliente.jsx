import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ChatCliente() {
  const [nome, setNome] = useState('');
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
    const sub = supabase.channel(`chat-${chatId}`).on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      (p) => setMessages(prev => [...prev, p.new])
    ).subscribe();
    return () => supabase.removeChannel(sub);
  }, [chatId]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const startChat = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return;
    const { data } = await supabase.from('chats').insert([{ client_name: nome }]).select().single();
    if (data) {
      setChatId(data.id);
      localStorage.setItem('chat_token', data.id);
    }
  };

  const send = async () => {
    if (!input.trim() || !chatId) return;
    const val = input;
    setInput('');
    await supabase.from('messages').insert([{ chat_id: chatId, content: val, sender: 'client' }]);
  };

  const exitChat = () => {
    if (window.confirm("Vuoi davvero uscire dalla chat?")) {
      localStorage.removeItem('chat_token');
      setChatId(null);
      setNome('');
      setMessages([]);
    }
  };

  const styles = {
    screen: { height: '100dvh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: '#1a0033', color: '#ffd700' },
    header: { padding: '15px', backgroundColor: '#2a004f', borderBottom: '2px solid #ffd700', textAlign: 'center', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    msgArea: { flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column' },
    inputArea: { padding: '15px', backgroundColor: '#2a004f', display: 'flex', gap: '10px', borderTop: '1px solid #ffd700', paddingBottom: '35px' },
    input: { flex: 1, padding: '12px', borderRadius: '25px', border: '1px solid #ffd700', backgroundColor: 'white', color: 'black', fontSize: '16px' },
    btn: { backgroundColor: '#ffd700', color: '#1a0033', border: 'none', padding: '10px 20px', borderRadius: '25px', fontWeight: 'bold', cursor: 'pointer' },
    exitBtn: { background: 'none', border: 'none', color: '#ffd700', fontSize: '20px', cursor: 'pointer' }
  };

  if (!chatId) {
    return (
      <div style={{ ...styles.screen, justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ background: '#2a004f', padding: '30px', borderRadius: '20px', border: '2px solid #ffd700', width: '90%', maxWidth: '350px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '20px' }}>Accesso Privato</h2>
          <input style={{...styles.input, width: '100%', marginBottom: '20px'}} placeholder="Inserisci il tuo nome" value={nome} onChange={e => setNome(e.target.value)} />
          <button onClick={startChat} style={{ ...styles.btn, width: '100%' }}>ACCEDI</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <span style={{flex: 1, textAlign: 'center'}}>Assistenza Live</span>
        <button onClick={exitChat} style={styles.exitBtn}>X</button>
      </div>
      <div style={styles.msgArea}>
        {messages.map(m => (
          <div key={m.id} style={{ alignSelf: m.sender === 'client' ? 'flex-end' : 'flex-start', marginBottom: '10px', maxWidth: '85%' }}>
            <div style={{ backgroundColor: m.sender === 'client' ? '#4a148c' : '#330066', color: 'white', padding: '12px', borderRadius: '15px', border: '1px solid #ffd700' }}>
              {m.type === 'video' ? (
                <video controls src={m.content} style={{ maxWidth: '100%', borderRadius: '8px' }} />
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>
      <div style={styles.inputArea}>
        <input style={styles.input} value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && send()} placeholder="Scrivi qui..." />
        <button onClick={send} style={styles.btn}>INVIA</button>
      </div>
    </div>
  );
}

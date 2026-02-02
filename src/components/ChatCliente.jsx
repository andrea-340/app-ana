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
    const sub = supabase.channel(`chat-${chatId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, (p) => setMessages(prev => [...prev, p.new])).subscribe();
    return () => supabase.removeChannel(sub);
  }, [chatId]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const startChat = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return;
    const { data } = await supabase.from('chats').insert([{ client_name: nome }]).select().single();
    if (data) { setChatId(data.id); localStorage.setItem('chat_token', data.id); }
  };

  const exit = () => {
    if (confirm("Vuoi chiudere la chat e uscire?")) {
      localStorage.removeItem('chat_token');
      setChatId(null);
      setMessages([]);
    }
  };

  const send = async () => {
    if (!input.trim() || !chatId) return;
    const val = input; setInput('');
    await supabase.from('messages').insert([{ chat_id: chatId, content: val, sender: 'client' }]);
  };

  if (!chatId) {
    return (
      <div style={{height:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'#1a0033', color:'#ffd700'}}>
        <div style={{background:'#2a004f', padding:'30px', borderRadius:'20px', border:'1px solid #ffd700', width:'85%', textAlign:'center'}}>
          <h2>Benvenuta</h2>
          <input style={{width:'100%', padding:'12px', borderRadius:'20px', marginBottom:'15px', border:'none'}} placeholder="Nome e Cognome" value={nome} onChange={e => setNome(e.target.value)} />
          <button onClick={startChat} style={{width:'100%', padding:'12px', borderRadius:'20px', background:'#ffd700', color:'#1a0033', fontWeight:'bold', border:'none'}}>ENTRA</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{height:'100dvh', display:'flex', flexDirection:'column', backgroundColor:'#1a0033', color:'#ffd700'}}>
      <div style={{padding:'15px', background:'#2a004f', borderBottom:'1px solid #ffd700', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <span>ASSISTENZA</span>
        <button onClick={exit} style={{background:'none', border:'none', color:'#ffd700', fontSize:'20px', fontWeight:'bold'}}>X</button>
      </div>
      <div style={{flex:1, overflowY:'auto', padding:'15px'}}>
        {messages.map(m => (
          <div key={m.id} style={{textAlign: m.sender === 'client' ? 'right' : 'left', marginBottom:'10px'}}>
            <div style={{display:'inline-block', padding:'10px', borderRadius:'10px', background: m.sender === 'client' ? '#4a148c' : '#330066', border: '1px solid #ffd700', maxWidth:'80%', color:'white'}}>
              {m.type === 'video' ? <video src={m.content} controls style={{width:'100%', borderRadius:'8px'}} /> : m.content}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>
      <div style={{padding:'10px', background:'#2a004f', display:'flex', gap:'8px', borderTop:'1px solid #ffd700', paddingBottom:'35px'}}>
        <input style={{flex:1, padding:'10px', borderRadius:'20px', border:'none'}} value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && send()} placeholder="Scrivi..." />
        <button onClick={send} style={{background:'#ffd700', padding:'10px 15px', borderRadius:'20px', fontWeight:'bold', border:'none'}}>INVIA</button>
      </div>
    </div>
  );
}

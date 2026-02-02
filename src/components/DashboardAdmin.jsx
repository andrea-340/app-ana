import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

function DashboardAdmin() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    fetchChats();
    const subscription = supabase.channel('admin_room')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchChats();
        if (selectedChat) fetchMessages(selectedChat.id);
      })
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, [selectedChat]);

  async function fetchChats() {
    const { data } = await supabase.from('chats').select('*').order('updated_at', { ascending: false });
    if (data) setChats(data);
  }

  async function fetchMessages(chatId) {
    const { data } = await supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });
    if (data) setMessages(data);
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedChat) return;
    await supabase.from('messages').insert([{ chat_id: selectedChat.id, content: newMessage, sender: 'admin' }]);
    setNewMessage('');
    fetchMessages(selectedChat.id);
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'sans-serif' }}>
      {/* SIDEBAR: Si nasconde su mobile se una chat è selezionata */}
      <div style={{
        width: window.innerWidth < 768 && selectedChat ? '0' : (window.innerWidth < 768 ? '100%' : '300px'),
        display: window.innerWidth < 768 && selectedChat ? 'none' : 'block',
        borderRight: '1px solid #ddd',
        backgroundColor: 'white',
        overflowY: 'auto'
      }}>
        <h2 style={{ padding: '20px', borderBottom: '1px solid #eee' }}>Richieste Clienti</h2>
        {chats.map(chat => (
          <div 
            key={chat.id} 
            onClick={() => { setSelectedChat(chat); fetchMessages(chat.id); }}
            style={{ padding: '15px', cursor: 'pointer', borderBottom: '1px solid #f9f9f9', backgroundColor: selectedChat?.id === chat.id ? '#e7f3ff' : 'transparent' }}
          >
            <strong>{chat.client_name}</strong>
          </div>
        ))}
      </div>

      {/* CHAT BOX: Prende tutto lo spazio su mobile se selezionata */}
      <div style={{
        flexGrow: 1,
        display: window.innerWidth < 768 && !selectedChat ? 'none' : 'flex',
        flexDirection: 'column',
        width: '100%'
      }}>
        {selectedChat ? (
          <>
            <div style={{ padding: '10px', background: '#0084ff', color: 'white', display: 'flex', alignItems: 'center' }}>
              {window.innerWidth < 768 && (
                <button onClick={() => setSelectedChat(null)} style={{ marginRight: '10px', background: 'none', border: 'none', color: 'white', fontSize: '20px' }}>⬅</button>
              )}
              <span>Chat con: {selectedChat.client_name}</span>
            </div>
            <div style={{ flexGrow: 1, padding: '20px', overflowY: 'auto', backgroundColor: '#e5ddd5' }}>
              {messages.map(m => (
                <div key={m.id} style={{ textAlign: m.sender === 'admin' ? 'right' : 'left', marginBottom: '10px' }}>
                  <div style={{ display: 'inline-block', padding: '10px', borderRadius: '10px', backgroundColor: m.sender === 'admin' ? '#dcf8c6' : 'white' }}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '20px', backgroundColor: 'white', display: 'flex', gap: '10px' }}>
              <input 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Scrivi messaggio..." 
                style={{ flexGrow: 1, padding: '10px', borderRadius: '20px', border: '1px solid #ddd' }}
              />
              <button onClick={sendMessage} style={{ padding: '10px 20px', borderRadius: '20px', border: 'none', backgroundColor: '#0084ff', color: 'white' }}>Invia</button>
            </div>
          </>
        ) : (
          <div style={{ margin: 'auto', color: '#888' }}>Seleziona un cliente per rispondere</div>
        )}
      </div>
    </div>
  );
}

export default DashboardAdmin;

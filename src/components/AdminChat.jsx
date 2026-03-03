import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

export default function AdminPage() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const scrollRef = useRef();

  // 1. Carica la lista delle chat uniche
  const fetchChats = async () => {
    const { data, error } = await supabase
      .from("chat")
      .select("chat_id, nome, cognome, piano, created_at")
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Filtra per avere solo una riga per ogni chat_id (la più recente)
      const uniqueChats = data.filter(
        (v, i, a) => a.findIndex((t) => t.chat_id === v.chat_id) === i
      );
      setChats(uniqueChats);
    }
  };

  useEffect(() => {
    fetchChats();

    // Sottoscrizione per vedere nuove chat in tempo reale
    const channel = supabase
      .channel("admin-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat" }, () => {
        fetchChats();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // 2. Carica i messaggi della chat selezionata
  useEffect(() => {
    if (!selectedChat) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("chat")
        .select("*")
        .eq("chat_id", selectedChat.chat_id)
        .order("created_at", { ascending: true });
      setMessages(data || []);
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat-${selectedChat.chat_id}`)
      .on("postgres_changes", 
        { event: "INSERT", schema: "public", table: "chat", filter: `chat_id=eq.${selectedChat.chat_id}` }, 
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      ).subscribe();

    return () => supabase.removeChannel(channel);
  }, [selectedChat]);

  // Scroll automatico all'ultimo messaggio
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 3. Funzione per rispondere
  const sendReply = async () => {
    if (!reply.trim() || !selectedChat) return;

    const { error } = await supabase.from("chat").insert([
      {
        chat_id: selectedChat.chat_id,
        testo: reply,
        ruolo: "admin",
        nome: "Anastasia",
        cognome: ""
      },
    ]);

    if (!error) setReply("");
  };

  // 4. FUNZIONE PER ELIMINARE LA CHAT
  const deleteChat = async (chatId) => {
    const confirmDelete = window.confirm("Sei sicura di voler eliminare tutta la conversazione?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("chat")
      .delete()
      .eq("chat_id", chatId);

    if (!error) {
      setChats((prev) => prev.filter((c) => c.chat_id !== chatId));
      if (selectedChat?.chat_id === chatId) {
        setSelectedChat(null);
        setMessages([]);
      }
    } else {
      alert("Errore nell'eliminazione");
    }
  };

  return (
    <div className="flex h-screen bg-black text-white font-sans">
      {/* Sidebar: Lista Chat */}
      <div className="w-1/3 border-r border-white/10 flex flex-col bg-zinc-950">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-xl font-bold uppercase tracking-tighter">Messaggi Clienti</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => (
            <div 
              key={chat.chat_id}
              className={`p-4 border-b border-white/5 cursor-pointer transition-all flex justify-between items-center group ${selectedChat?.chat_id === chat.chat_id ? 'bg-purple-900/20' : 'hover:bg-zinc-900'}`}
            >
              <div onClick={() => setSelectedChat(chat)} className="flex-1">
                <p className="font-bold">{chat.nome} {chat.cognome}</p>
                <p className="text-xs text-purple-400">{chat.piano}</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); deleteChat(chat.chat_id); }}
                className="opacity-0 group-hover:opacity-100 p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main: Finestra Chat */}
      <div className="flex-1 flex flex-col bg-zinc-900">
        {selectedChat ? (
          <>
            <div className="p-4 border-b border-white/10 bg-zinc-950 flex justify-between">
              <div>
                <h2 className="font-bold">{selectedChat.nome} {selectedChat.cognome}</h2>
                <p className="text-xs text-zinc-500">ID: {selectedChat.chat_id}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.ruolo === "admin" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${m.ruolo === "admin" ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-200"}`}>
                    {m.testo}
                  </div>
                </div>
              ))}
              <div ref={scrollRef}></div>
            </div>

            <div className="p-4 bg-zinc-950 border-t border-white/10 flex gap-2">
              <input 
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendReply()}
                placeholder="Scrivi una risposta..."
                className="flex-1 bg-zinc-800 p-3 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button onClick={sendReply} className="bg-purple-600 px-6 rounded-xl font-bold hover:bg-purple-500 transition-colors">Invia</button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            Seleziona una chat per iniziare a rispondere
          </div>
        )}
      </div>
    </div>
  );
}

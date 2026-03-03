import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const notificationSound = new Audio(
  "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3",
);

export default function AdminChat() {
  const [messaggi, setMessaggi] = useState([]);
  const [chatIdSelezionata, setChatIdSelezionata] = useState(null);
  const [messaggio, setMessaggio] = useState("");
  const [chatUtenti, setChatUtenti] = useState([]);
  const [notifiche, setNotifiche] = useState({});
  const scrollRef = useRef();

  const fetchUtenti = async () => {
    const { data } = await supabase
      .from("chat")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      const unique = Array.from(
        new Map(data.map((m) => [m.chat_id, m])).values(),
      );
      setChatUtenti(unique);
    }
  };

  useEffect(() => {
    fetchUtenti();
    const channel = supabase
      .channel("admin-global")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat" }, (payload) => {
          const nuovo = payload.new;
          if (nuovo.ruolo === "utente") {
            notificationSound.play().catch(() => {});
            if (nuovo.chat_id !== chatIdSelezionata) {
              setNotifiche((prev) => ({ ...prev, [nuovo.chat_id]: (prev[nuovo.chat_id] || 0) + 1 }));
            }
          }
          if (nuovo.chat_id === chatIdSelezionata) {
            setMessaggi((prev) => [...prev, nuovo]);
          }
          setChatUtenti((prev) => {
            const filtrati = prev.filter((u) => u.chat_id !== nuovo.chat_id);
            return [nuovo, ...filtrati];
          });
        }
      ).subscribe();
    return () => supabase.removeChannel(channel);
  }, [chatIdSelezionata]);

  useEffect(() => {
    if (!chatIdSelezionata) return;
    setNotifiche((prev) => ({ ...prev, [chatIdSelezionata]: 0 }));
    const caricaMessaggi = async () => {
      const { data } = await supabase.from("chat").select("*").eq("chat_id", chatIdSelezionata).order("created_at", { ascending: true });
      setMessaggi(data || []);
    };
    caricaMessaggi();
  }, [chatIdSelezionata]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messaggi]);

  const invia = async () => {
    if (!messaggio.trim() || !chatIdSelezionata) return;
    const testoInvio = messaggio;
    setMessaggio("");
    await supabase.from("chat").insert([{ chat_id: chatIdSelezionata, testo: testoInvio, ruolo: "admin", nome: "Anastasia", cognome: "Admin" }]);
  };

  // --- NUOVA FUNZIONE ELIMINA ---
  const eliminaChat = async (e, chatId) => {
    e.stopPropagation(); // Evita di aprire la chat mentre la elimini
    const conferma = window.confirm("Vuoi eliminare definitivamente questa chat e tutti i suoi messaggi?");
    if (!conferma) return;

    const { error } = await supabase.from("chat").delete().eq("chat_id", chatId);
    
    if (!error) {
      setChatUtenti((prev) => prev.filter((u) => u.chat_id !== chatId));
      if (chatIdSelezionata === chatId) {
        setChatIdSelezionata(null);
        setMessaggi([]);
      }
    } else {
      alert("Errore durante l'eliminazione");
    }
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
      {/* SIDEBAR LISTA UTENTI */}
      <div className={`${chatIdSelezionata ? "hidden md:flex" : "flex"} w-full md:w-80 flex-col border-r border-white/10 bg-zinc-950`}>
        <div className="p-6 border-b border-white/10">
          <h1 className="text-xl font-black text-purple-500 uppercase tracking-tighter">Messaggi</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chatUtenti.map((u) => (
            <div
              key={u.chat_id}
              onClick={() => setChatIdSelezionata(u.chat_id)}
              className={`p-4 border-b border-white/5 cursor-pointer transition-colors flex justify-between items-center group ${chatIdSelezionata === u.chat_id ? "bg-purple-900/20" : "hover:bg-white/5"}`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm truncate">{u.nome} {u.cognome}</p>
                <p className="text-[10px] text-zinc-500 truncate uppercase tracking-widest">{u.piano || "Nessun Piano"}</p>
              </div>
              
              <div className="flex items-center gap-3">
                {notifiche[u.chat_id] > 0 && (
                  <span className="bg-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">{notifiche[u.chat_id]}</span>
                )}
                {/* TASTO ELIMINA */}
                <button 
                  onClick={(e) => eliminaChat(e, u.chat_id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-500 transition-all"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AREA CHAT */}
      <div className={`${chatIdSelezionata ? "flex" : "hidden md:flex"} flex-1 flex-col bg-zinc-900 relative`}>
        {chatIdSelezionata ? (
          <>
            <div className="p-4 border-b border-white/5 bg-zinc-950 flex items-center gap-4">
              <button onClick={() => setChatIdSelezionata(null)} className="md:hidden text-purple-500 text-xl">←</button>
              <div>
                <h2 className="font-bold text-sm">{chatUtenti.find((u) => u.chat_id === chatIdSelezionata)?.nome}</h2>
                <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span><span className="text-[9px] text-zinc-400 uppercase tracking-[0.2em]">Online</span></div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messaggi.map((m, i) => (
                <div key={i} className={`flex ${m.ruolo === "admin" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.ruolo === "admin" ? "bg-purple-600 text-white rounded-tr-none" : "bg-zinc-800 text-gray-200 rounded-tl-none border border-white/5"}`}>
                    {m.testo}
                  </div>
                </div>
              ))}
              <div ref={scrollRef}></div>
            </div>

            <div className="p-4 bg-zinc-950 border-t border-white/5">
              <div className="flex gap-2 bg-zinc-800 p-2 rounded-2xl">
                <input value={messaggio} onChange={(e) => setMessaggio(e.target.value)} onKeyDown={(e) => e.key === "Enter" && invia()} className="flex-1 bg-transparent p-2 outline-none text-sm" placeholder="Rispondi..." />
                <button onClick={invia} className="bg-purple-600 w-10 h-10 rounded-xl flex items-center justify-center">➤</button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-700">
            <p className="text-[10px] uppercase tracking-[0.4em]">Seleziona un cliente</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

// URL di un suono pulito per la notifica
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

  // 1. Caricamento Iniziale e Realtime
  useEffect(() => {
    const fetchUtenti = async () => {
      const { data } = await supabase
        .from("chat")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) {
        // Crea lista utenti unici basata sul chat_id
        const unique = Array.from(
          new Map(data.map((m) => [m.chat_id, m])).values(),
        );
        setChatUtenti(unique);
      }
    };
    fetchUtenti();

    const channel = supabase
      .channel("admin-global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat" },
        (payload) => {
          const nuovo = payload.new;

          // Se è un messaggio dell'utente: SUONA
          if (nuovo.ruolo === "utente") {
            notificationSound
              .play()
              .catch(() =>
                console.log("Clicca sulla pagina per attivare l'audio"),
              );

            // Se non sto guardando quella chat, aggiungi il pallino rosso
            if (nuovo.chat_id !== chatIdSelezionata) {
              setNotifiche((prev) => ({
                ...prev,
                [nuovo.chat_id]: (prev[nuovo.chat_id] || 0) + 1,
              }));
            }
          }

          // Se è la chat che ho aperto, aggiungi il messaggio a video
          if (nuovo.chat_id === chatIdSelezionata) {
            setMessaggi((prev) => [...prev, nuovo]);
          }

          // Porta l'utente in cima alla lista laterale
          setChatUtenti((prev) => {
            const filtrati = prev.filter((u) => u.chat_id !== nuovo.chat_id);
            return [nuovo, ...filtrati];
          });
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [chatIdSelezionata]);

  // 2. Carica messaggi quando cambio utente
  useEffect(() => {
    if (!chatIdSelezionata) return;
    setNotifiche((prev) => ({ ...prev, [chatIdSelezionata]: 0 })); // Reset notifiche per questa chat

    const caricaMessaggi = async () => {
      const { data } = await supabase
        .from("chat")
        .select("*")
        .eq("chat_id", chatIdSelezionata)
        .order("created_at", { ascending: true });
      setMessaggi(data || []);
    };
    caricaMessaggi();
  }, [chatIdSelezionata]);

  // Scroll automatico
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messaggi]);

  // 3. Invio Messaggio
  const invia = async () => {
    if (!messaggio.trim() || !chatIdSelezionata) return;
    const testoInvio = messaggio;
    setMessaggio(""); // Svuota subito l'input

    await supabase.from("chat").insert([
      {
        chat_id: chatIdSelezionata,
        testo: testoInvio,
        ruolo: "admin",
        nome: "Anastasia",
        cognome: "Admin",
      },
    ]);
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
      {/* LISTA UTENTI (Sidebar) - Nascondi su mobile se una chat è aperta */}
      <div
        className={`${chatIdSelezionata ? "hidden md:flex" : "flex"} w-full md:w-80 flex-col border-r border-white/10 bg-zinc-950`}
      >
        <div className="p-6 border-b border-white/10">
          <h1 className="text-xl font-black text-purple-500 uppercase tracking-tighter">
            Messaggi
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chatUtenti.map((u) => (
            <div
              key={u.chat_id}
              onClick={() => setChatIdSelezionata(u.chat_id)}
              className={`p-4 border-b border-white/5 cursor-pointer transition-colors flex justify-between items-center ${chatIdSelezionata === u.chat_id ? "bg-purple-900/20" : "hover:bg-white/5"}`}
            >
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">
                  {u.nome} {u.cognome}
                </p>
                <p className="text-[10px] text-zinc-500 truncate uppercase tracking-widest">
                  {u.chat_id}
                </p>
              </div>
              {notifiche[u.chat_id] > 0 && (
                <span className="bg-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {notifiche[u.chat_id]}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* AREA DI CONVERSAZIONE - Nascondi su mobile se non c'è una chat selezionata */}
      <div
        className={`${chatIdSelezionata ? "flex" : "hidden md:flex"} flex-1 flex-col bg-zinc-900 relative`}
      >
        {chatIdSelezionata ? (
          <>
            {/* Header Chat */}
            <div className="p-4 border-b border-white/5 bg-zinc-950 flex items-center gap-4">
              <button
                onClick={() => setChatIdSelezionata(null)}
                className="md:hidden text-purple-500 text-xl"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              <div>
                <h2 className="font-bold text-sm">
                  {
                    chatUtenti.find((u) => u.chat_id === chatIdSelezionata)
                      ?.nome
                  }
                </h2>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-[0.2em]">
                    Online
                  </span>
                </div>
              </div>
            </div>

            {/* Messaggi */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messaggi.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.ruolo === "admin" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.ruolo === "admin" ? "bg-purple-600 text-white rounded-tr-none" : "bg-zinc-800 text-gray-200 rounded-tl-none border border-white/5"}`}
                  >
                    {m.testo}
                  </div>
                </div>
              ))}
              <div ref={scrollRef}></div>
            </div>

            {/* Input */}
            <div className="p-4 bg-zinc-950 border-t border-white/5">
              <div className="flex gap-2 bg-zinc-800 p-2 rounded-2xl">
                <input
                  value={messaggio}
                  onChange={(e) => setMessaggio(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && invia()}
                  className="flex-1 bg-transparent p-2 outline-none text-sm"
                  placeholder="Rispondi ad Anastasia..."
                />
                <button
                  onClick={invia}
                  className="bg-purple-600 w-10 h-10 rounded-xl flex items-center justify-center"
                >
                  <i className="fas fa-paper-plane text-xs"></i>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-700">
            <i className="fas fa-comment-dots text-4xl mb-3 opacity-20"></i>
            <p className="text-[10px] uppercase tracking-[0.4em]">
              Seleziona un cliente
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

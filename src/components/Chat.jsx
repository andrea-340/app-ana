import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

export default function Chat({ userData, onClose }) {
  const [messaggio, setMessaggio] = useState("");
  const [messaggi, setMessaggi] = useState([]);

  // Configurazione CallMeBot (I tuoi dati)
  const MIO_NUMERO = "393277507177";
  const API_KEY = "1389414";
  const ADMIN_URL = "https://tuosito.com/admin"; // Sostituisci con l'URL reale della tua pagina admin

  // ID persistente: se l'utente ricarica, rimane lo stesso
  const [chatId] = useState(() => {
    const savedId = localStorage.getItem("chat_id_anastasia");
    if (savedId) return savedId;
    const newId = Math.random().toString(36).substr(2, 9);
    localStorage.setItem("chat_id_anastasia", newId);
    return newId;
  });

  const scrollRef = useRef();

  // Funzione per inviare la notifica WhatsApp
  const inviaNotificaWhatsApp = (testo) => {
    const testoFormattato = encodeURIComponent(testo);
    fetch(
      `https://api.callmebot.com/whatsapp.php?phone=${MIO_NUMERO}&text=${testoFormattato}&apikey=${API_KEY}`,
      {
        mode: "no-cors",
      },
    );
  };

  useEffect(() => {
    const caricaEInizia = async () => {
      // 1. Carica messaggi esistenti
      const { data } = await supabase
        .from("chat")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        setMessaggi(data);
      } else {
        // Se è la prima volta, invia il messaggio del piano
        const testoPiano = `Ciao Anastasia, ho scelto il piano "${userData.piano}"`;
        const primoM = {
          chat_id: chatId,
          testo: testoPiano,
          ruolo: "utente",
          nome: userData.nome,
          cognome: userData.cognome,
        };

        const { error } = await supabase.from("chat").insert([primoM]);

        if (!error) {
          setMessaggi([primoM]);
          // Notifica WhatsApp per la nuova scelta del piano
          inviaNotificaWhatsApp(
            `🔮 *NUOVO CLIENTE!*%0A👤 *${userData.nome} ${userData.cognome}* ha appena iniziato una chat.%0A💎 *Piano:* ${userData.piano}%0A%0A🔗 Vai alla Dashboard: ${ADMIN_URL}`,
          );
        }
      }
    };

    caricaEInizia();

    // 2. Sottoscrizione Realtime
    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setMessaggi((prev) => {
            const esisteGia = prev.find((m) => m.id === payload.new.id);
            if (esisteGia) return prev;
            return [...prev, payload.new];
          });
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [chatId, userData]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messaggi]);

  const inviaMessaggio = async () => {
    if (!messaggio.trim()) return;
    const testoInvio = messaggio;
    setMessaggio(""); // Pulisci subito l'input

    const { error } = await supabase.from("chat").insert([
      {
        chat_id: chatId,
        testo: testoInvio,
        ruolo: "utente",
        nome: userData.nome,
        cognome: userData.cognome,
      },
    ]);

    if (!error) {
      // Notifica WhatsApp per ogni nuovo messaggio in chat
      inviaNotificaWhatsApp(
        `💬 *MESSAGGIO DA ${userData.nome.toUpperCase()}*:%0A"${testoInvio}"`,
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-white/10 p-6 rounded-[2rem] w-full max-w-md h-[80vh] flex flex-col shadow-2xl">
        <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <h2 className="text-white font-bold text-sm tracking-tight uppercase">
              Chat con Anastasia
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
          {messaggi.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col ${m.ruolo === "utente" ? "items-end" : "items-start"}`}
            >
              <div
                className={`p-3 rounded-2xl max-w-[85%] text-sm shadow-md ${
                  m.ruolo === "utente"
                    ? "bg-purple-600 text-white rounded-tr-none"
                    : "bg-zinc-800 text-gray-200 rounded-tl-none border border-white/5"
                }`}
              >
                {m.testo}
              </div>
              <span className="text-[9px] text-zinc-600 mt-1 px-1 capitalize">
                {m.ruolo === "admin" ? "Anastasia" : m.nome}
              </span>
            </div>
          ))}
          <div ref={scrollRef}></div>
        </div>

        <div className="flex gap-2 bg-zinc-800/50 border border-white/5 p-2 rounded-2xl focus-within:border-purple-500/50 transition-all">
          <input
            value={messaggio}
            onChange={(e) => setMessaggio(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && inviaMessaggio()}
            placeholder="Scrivi ad Anastasia..."
            className="flex-1 bg-transparent p-2 text-white outline-none text-sm placeholder:text-zinc-600"
          />
          <button
            onClick={inviaMessaggio}
            className="bg-purple-600 hover:bg-purple-500 active:scale-95 transition-all w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-lg"
          >
            <i className="fas fa-paper-plane text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

export default function Chat({ userData, onClose }) {
  const [messaggio, setMessaggio] = useState("");
  const [messaggi, setMessaggi] = useState([]);

  // Configurazione CallMeBot
  const MIO_NUMERO = "393277507177";
  const API_KEY = "1389414";

  // ID della chat: recupera o crea
  const [chatId] = useState(() => {
    const savedId = localStorage.getItem("chat_id_anastasia");
    if (savedId) return savedId;
    const newId = Math.random().toString(36).substr(2, 9);
    localStorage.setItem("chat_id_anastasia", newId);
    return newId;
  });

  const scrollRef = useRef();

  // Funzione per formattare l'orario (HH:mm)
  const formattaOra = (dateString) => {
    const d = dateString ? new Date(dateString) : new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const inviaNotificaWhatsApp = (testo) => {
    const testoFormattato = encodeURIComponent(testo);
    fetch(
      `https://api.callmebot.com/whatsapp.php?phone=${MIO_NUMERO}&text=${testoFormattato}&apikey=${API_KEY}`,
      { mode: "no-cors" },
    );
  };

  // Funzione per resettare la chat (Ripristinata)
  const resettaChat = () => {
    const conferma = window.confirm(
      "Vuoi eliminare questa chat e iniziarne una nuova? Perderai la cronologia attuale.",
    );
    if (conferma) {
      localStorage.removeItem("chat_id_anastasia");
      localStorage.removeItem("user_data_anastasia");
      window.location.reload();
    }
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
        // PRIMA VOLTA: Invio messaggio utente
        const testoPiano = `Ciao Anastasia, ho scelto il piano "${userData.piano}"`;
        const { error: errorUtente } = await supabase.from("chat").insert([
          {
            chat_id: chatId,
            testo: testoPiano,
            ruolo: "utente",
            nome: userData.nome,
            cognome: userData.cognome,
            telefono: userData.telefono,
            piano: userData.piano,
          },
        ]);

        if (!errorUtente) {
          // MESSAGGIO AUTOMATICO DI ANASTASIA (Unico invio)
          await supabase.from("chat").insert([
            {
              chat_id: chatId,
              testo: `Grazie per avermi scelto! ❤️ Ho visto che hai scelto il piano ${userData.piano.toUpperCase()}. Ciao tesoro sono Anastasia ti lascio il mio numero scrivimi su whatsapp a breve ti risponderò per darti maggiori info: 3533758697`,
              ruolo: "admin",
              nome: "Anastasia",
              cognome: "Admin",
              telefono: userData.telefono,
              piano: userData.piano,
            },
          ]);

          inviaNotificaWhatsApp(
            `🔮 *NUOVO CLIENTE!*\n👤 *${userData.nome} ${userData.cognome}*\n📱 *Tel:* ${userData.telefono}\n💎 *Piano:* ${userData.piano}`,
          );
        }
      }
    };

    caricaEInizia();

    // 2. Realtime per ricevere i messaggi
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
    setMessaggio("");

    await supabase.from("chat").insert([
      {
        chat_id: chatId,
        testo: testoInvio,
        ruolo: "utente",
        nome: userData.nome,
        cognome: userData.cognome,
        telefono: userData.telefono,
        piano: userData.piano,
      },
    ]);

    inviaNotificaWhatsApp(
      `💬 *MESSAGGIO DA ${userData.nome.toUpperCase()}*:\n"${testoInvio}"`,
    );
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-zinc-950 border border-white/10 p-6 rounded-[2.5rem] w-full max-w-md h-[85vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        {/* HEADER CHAT - Con tasto Nuova Chat ripristinato */}
        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <div>
              <h2 className="text-white font-black text-xs uppercase tracking-[0.2em]">
                Chat Privata
              </h2>
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest">
                Anastasia è Online
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={resettaChat}
              title="Elimina chat e ricomincia"
              className="text-[10px] bg-zinc-900 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded-full uppercase font-bold tracking-tighter transition-all border border-white/5"
            >
              Nuova Chat 🗑️
            </button>

            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-white transition-colors text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* AREA MESSAGGI */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
          {messaggi.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col ${m.ruolo === "utente" ? "items-end" : "items-start"}`}
            >
              <div
                className={`p-4 rounded-2xl max-w-[85%] text-sm ${m.ruolo === "utente" ? "bg-purple-600 text-white rounded-tr-none shadow-lg shadow-purple-900/20" : "bg-zinc-900 text-gray-200 rounded-tl-none border border-white/10"}`}
              >
                {m.testo}
              </div>
              <div className="flex items-center gap-2 mt-1 px-2">
                <span className="text-[8px] text-zinc-600 uppercase tracking-widest font-bold">
                  {m.ruolo === "admin" ? "Anastasia" : m.nome}
                </span>
                <span className="text-[8px] text-zinc-400 font-medium">
                  {formattaOra(m.created_at)}
                </span>
              </div>
            </div>
          ))}
          <div ref={scrollRef}></div>
        </div>

        {/* INPUT INVIO */}
        <div className="flex gap-2 bg-zinc-900 border border-white/5 p-2 rounded-2xl focus-within:border-purple-500/50 transition-all shadow-inner">
          <input
            value={messaggio}
            onChange={(e) => setMessaggio(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && inviaMessaggio()}
            placeholder="Scrivi qui la tua domanda..."
            className="flex-1 bg-transparent p-3 text-white outline-none text-sm placeholder:text-zinc-700"
          />
          <button
            onClick={inviaMessaggio}
            className="bg-purple-600 hover:bg-purple-500 active:scale-90 transition-all w-12 h-12 flex items-center justify-center rounded-xl text-white shadow-xl"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

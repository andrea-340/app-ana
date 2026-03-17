import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

export default function Chat({ userData, onClose, chatId, isFromCourse = false, onToggleGroup }) {
  const [messaggio, setMessaggio] = useState("");
  const [messaggi, setMessaggi] = useState([]);

  // Configurazione CallMeBot
  const MIO_NUMERO = "393277507177";
  const API_KEY = "1389414";

  const renderizzaMessaggio = (m) => {
    if (!m.testo) return null;
    
    if (m.testo.includes("[FILE|")) {
      try {
        const fileContent = m.testo.match(/\[FILE\|(.*?)\|(.*?)\]/);
        if (fileContent) {
          const url = fileContent[1];
          const type = fileContent[2];

          if (type.startsWith("image/")) {
            return (
              <a href={url} target="_blank" rel="noreferrer" className="block group relative">
                <img src={url} alt="file" className="rounded-xl max-w-full h-auto mt-2 border border-white/10 hover:opacity-80 transition-all shadow-lg" />
                <span className="absolute bottom-2 right-2 bg-black/60 text-[8px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">Clicca per ingrandire</span>
              </a>
            );
          } else if (type.startsWith("video/")) {
            return <video src={url} controls className="rounded-xl max-w-full mt-2 shadow-lg" />;
          } else {
            return (
              <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-white/5 rounded-xl mt-2 text-purple-400 font-bold hover:bg-white/10 border border-purple-500/20 transition-all">
                📄 Documento / File
              </a>
            );
          }
        }
      } catch (e) {
        console.error("Errore rendering file:", e);
      }
    }
    return <p className="leading-relaxed whitespace-pre-wrap">{m.testo}</p>;
  };

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

  const inviaNotificaPush = async (testo) => {
    try {
      await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: "Basic OTU5M2U5OTQtMjUzMC00Njg3LWE3YTAtMmU0YjVlNDJkMjhk", // <--- REST API KEY (Se possibile, spostala sul backend)
        },
        body: JSON.stringify({
          app_id: "c5933b83-abe0-424b-9433-af3db6372d34",
          include_external_user_ids: ["admin_anastasia"],
          contents: { en: testo, it: testo },
          headings: { en: "Nuovo Messaggio", it: "Nuovo Messaggio" },
          url: "https://app-ana.vercel.app/admin", // URL della tua app
        }),
      });
    } catch (e) {
      console.error("Errore invio push:", e);
    }
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
        const emailInfo = userData.email && userData.email !== "Non fornita" ? ` (Email: ${userData.email})` : "";
        const testoPiano = `Ciao Anastasia, ho scelto il piano "${userData.piano}"${emailInfo}`;
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
            `🔮 *NUOVO CLIENTE!*\n👤 *${userData.nome} ${userData.cognome}*\n🔞 *Età:* ${userData.eta}\n📧 *Email:* ${userData.email}\n📱 *Tel:* ${userData.telefono}\n💎 *Piano:* ${userData.piano}`,
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

    inviaNotificaPush(`Messaggio da ${userData.nome}: ${testoInvio}`);
  };

  const attivaNotifiche = () => {
    const externalId = String(chatId || "").trim();
    const invalidIds = new Set([
      "NA",
      "NULL",
      "0",
      "1",
      "-1",
      "null",
      "undefined",
      "NaN",
      "none",
      "unknown",
      "INVALID_USER",
      "not set",
    ]);

    if (!externalId || externalId.length > 128 || invalidIds.has(externalId)) {
      alert("⚠️ Errore: ID utente non valido per attivare le notifiche.");
      return;
    }

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(function (OneSignal) {
      let done = false;

      const doLogin = async () => {
        if (done) return;
        done = true;
        try {
          await OneSignal.login(externalId);
          if (isFromCourse) {
            await OneSignal.User.addTag("corso", externalId);
          }
          alert(
            "✅ Notifiche attivate con successo! Riceverai un avviso quando Anastasia risponderà.",
          );
        } catch (e) {}
      };

      try {
        OneSignal.Slidedown.promptPush();
        OneSignal.Notifications.addEventListener("permissionChange", (permission) => {
          if (permission === "granted") doLogin();
        });
        if (OneSignal.Notifications.permission === "granted") doLogin();
      } catch (e) {}
    });
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-zinc-950 border border-white/10 p-6 rounded-[2.5rem] w-full max-w-md h-[85vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        {/* SELETTORE CHAT PER STUDENTI */}
        {isFromCourse && (
          <div className="flex bg-zinc-900 p-1 rounded-2xl mb-6 border border-white/5">
            <button
              onClick={onToggleGroup}
              className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all"
            >
              Gruppo Studenti 👥
            </button>
            <button
              className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest bg-purple-600 text-white rounded-xl shadow-lg"
            >
              Chat Privata 🔒
            </button>
          </div>
        )}

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
              onClick={attivaNotifiche}
              title="Abilita Notifiche"
              className="text-[10px] bg-purple-900/30 text-purple-400 hover:bg-purple-600 hover:text-white px-3 py-1.5 rounded-full uppercase font-bold tracking-tighter transition-all border border-purple-500/20"
            >
              🔔 Notifiche
            </button>

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
                {renderizzaMessaggio(m)}
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
        <div className="flex gap-2 bg-zinc-900 border border-white/5 p-2 rounded-2xl focus-within:border-purple-500/50 transition-all shadow-inner relative">
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

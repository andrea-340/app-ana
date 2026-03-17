import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

export default function GroupChat({ userData, onClose, chatId, onTogglePrivate }) {
  const [messaggio, setMessaggio] = useState("");
  const [messaggi, setMessaggi] = useState([]);

  // ID della chat di gruppo basato sul nome del corso
  const groupId = `group_${userData.piano.toLowerCase().replace(/\s/g, "_")}`;

  const scrollRef = useRef();

  const formattaOra = (dateString) => {
    const d = dateString ? new Date(dateString) : new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const inviaNotificaPush = async (testo) => {
    try {
      await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: "Basic OTU5M2U5OTQtMjUzMC00Njg3LWE3YTAtMmU0YjVlNDJkMjhk",
        },
        body: JSON.stringify({
          app_id: "c5933b83-abe0-424b-9433-af3db6372d34",
          include_external_user_ids: ["admin_anastasia"],
          contents: { en: testo, it: testo },
          headings: { en: "Nuovo Messaggio nel Gruppo", it: "Nuovo Messaggio nel Gruppo" },
          url: "https://app-ana.vercel.app/admin",
        }),
      });
    } catch (e) {
      console.error("Errore invio push:", e);
    }
  };

  useEffect(() => {
    const caricaMessaggi = async () => {
      const { data } = await supabase
        .from("chat")
        .select("*")
        .eq("chat_id", groupId)
        .order("created_at", { ascending: true });

      if (data) setMessaggi(data);
    };

    caricaMessaggi();

    const channel = supabase
      .channel(`group-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat",
          filter: `chat_id=eq.${groupId}`,
        },
        (payload) => {
          setMessaggi((prev) => {
            if (prev.find((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Errore Realtime Gruppo:", status);
          alert("Errore di connessione alla chat. I messaggi potrebbero non apparire in tempo reale.");
        }
      });

    return () => supabase.removeChannel(channel);
  }, [groupId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messaggi]);

  const inviaMessaggio = async () => {
    if (!messaggio.trim()) return;
    const testoInvio = messaggio;
    setMessaggio("");

    const { error } = await supabase.from("chat").insert([
      {
        chat_id: groupId,
        testo: testoInvio,
        ruolo: "utente",
        nome: userData.nome,
        cognome: userData.cognome,
        piano: userData.piano,
        telefono: userData.telefono, // <--- Aggiungiamo anche il telefono per sicurezza
      },
    ]);

    if (error) {
      console.error("Errore invio messaggio:", error);
      alert("Errore nell'invio del messaggio. Riprova.");
      return;
    }

    inviaNotificaPush(`Messaggio di ${userData.nome} nel gruppo ${userData.piano}`);
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
          await OneSignal.User.addTag("corso", groupId);
          alert(
            "✅ Notifiche attivate con successo! Riceverai un avviso per ogni messaggio nel gruppo.",
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
        console.error("Errore rendering file gruppo:", e);
      }
    }
    return <p className="leading-relaxed whitespace-pre-wrap">{m.testo}</p>;
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-zinc-950 border border-white/10 p-6 rounded-[2.5rem] w-full max-w-md h-[85vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        {/* SELETTORE CHAT PER STUDENTI */}
        <div className="flex bg-zinc-900 p-1 rounded-2xl mb-6 border border-white/5">
          <button
            className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest bg-purple-600 text-white rounded-xl shadow-lg"
          >
            Gruppo Studenti 👥
          </button>
          <button
            onClick={onTogglePrivate}
            className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all"
          >
            Chat Privata 🔒
          </button>
        </div>

        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
            <div>
              <h2 className="text-white font-black text-xs uppercase tracking-[0.2em]">
                Gruppo: {userData.piano}
              </h2>
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest">
                Studenti Attivi
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
              onClick={onClose}
              className="text-zinc-500 hover:text-white transition-colors text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
          {messaggi.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.ruolo === "utente" && m.nome === userData.nome ? "items-end" : "items-start"}`}>
              <div className={`p-4 rounded-2xl max-w-[85%] text-sm ${m.ruolo === "utente" && m.nome === userData.nome ? "bg-purple-600 text-white rounded-tr-none shadow-lg shadow-purple-900/20" : "bg-zinc-900 text-gray-200 rounded-tl-none border border-white/10"}`}>
                {renderizzaMessaggio(m)}
              </div>
              <div className="flex items-center gap-2 mt-1 px-2">
                <span className="text-[8px] text-zinc-600 uppercase tracking-widest font-bold">
                  {m.ruolo === "admin" ? "Anastasia 👑" : m.nome}
                </span>
                <span className="text-[8px] text-zinc-400 font-medium">{formattaOra(m.created_at)}</span>
              </div>
            </div>
          ))}
          <div ref={scrollRef}></div>
        </div>

        <div className="flex gap-2 bg-zinc-900 border border-white/5 p-2 rounded-2xl focus-within:border-purple-500/50 transition-all shadow-inner relative">
          <input
            value={messaggio}
            onChange={(e) => setMessaggio(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && inviaMessaggio()}
            placeholder="Scrivi qui..."
            className="flex-1 bg-transparent p-3 text-white outline-none text-sm placeholder:text-zinc-700"
          />
          <button
            onClick={inviaMessaggio}
            className="bg-purple-600 hover:bg-purple-500 active:scale-90 transition-all w-12 h-12 flex items-center justify-center rounded-xl text-white shadow-xl"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

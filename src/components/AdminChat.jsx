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
  const [caricamento, setCaricamento] = useState(false);
  const [session, setSession] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [chatNascoste, setChatNascoste] = useState(() => {
    try {
      const raw = localStorage.getItem("chat_nascoste_admin_anastasia");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const chatNascosteRef = useRef(chatNascoste);
  const scrollRef = useRef();

  const gruppiCorsi = [
    { chat_id: "group_corso_base_cartomanzia", nome: "Corso Base", piano: "STUDENTI" },
    { chat_id: "group_percorso_avanzato", nome: "Percorso Avanzato", piano: "STUDENTI" },
    { chat_id: "group_masterclass_personale", nome: "Masterclass", piano: "STUDENTI" },
  ];

  const inviaNotificaPushAlCliente = async (testo, clientId) => {
    try {
      await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: "Basic OTU5M2U5OTQtMjUzMC00Njg3LWE3YTAtMmU0YjVlNDJkMjhk", // <--- REST API KEY (Se possibile, spostala sul backend)
        },
        body: JSON.stringify({
          app_id: "c5933b83-abe0-424b-9433-af3db6372d34",
          include_external_user_ids: [clientId],
          contents: { en: testo, it: testo },
          headings: { en: "Anastasia ti ha risposto", it: "Anastasia ti ha risposto" },
          url: "https://app-ana.vercel.app/", // URL della tua app
        }),
      });
    } catch (e) {
      console.error("Errore invio push al cliente:", e);
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    chatNascosteRef.current = chatNascoste;
  }, [chatNascoste]);

  const nascondiChat = (chatId) => {
    setChatNascoste((prev) => {
      const next = Array.from(new Set([...(prev || []), chatId]));
      localStorage.setItem("chat_nascoste_admin_anastasia", JSON.stringify(next));
      return next;
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoginLoading(false);
    if (error) {
      alert("Credenziali non valide.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Funzione per formattare l'orario (HH:mm)
  const formattaOra = (dateString) => {
    const d = dateString ? new Date(dateString) : new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Recupera l'utente attualmente selezionato dai dati della lista
  const utenteSelezionato = chatUtenti.find(
    (u) => u.chat_id === chatIdSelezionata,
  );

  const fetchUtenti = async () => {
    const { data } = await supabase
      .from("chat")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      const unique = Array.from(
        new Map(data.map((m) => [m.chat_id, m])).values(),
      );
      const nascoste = new Set(chatNascosteRef.current || []);
      setChatUtenti(unique.filter((u) => !nascoste.has(u.chat_id)));
    }
  };

  useEffect(() => {
    fetchUtenti();
    const channel = supabase
      .channel("admin-global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat" },
        (payload) => {
          const nuovo = payload.new;
          if ((chatNascosteRef.current || []).includes(nuovo.chat_id)) {
            return;
          }
          if (nuovo.ruolo === "utente") {
            notificationSound.play().catch(() => {});
            if (nuovo.chat_id !== chatIdSelezionata) {
              setNotifiche((prev) => ({
                ...prev,
                [nuovo.chat_id]: (prev[nuovo.chat_id] || 0) + 1,
              }));
            }
          }
          if (nuovo.chat_id === chatIdSelezionata) {
            setMessaggi((prev) => [...prev, nuovo]);
          }
          setChatUtenti((prev) => {
            const filtrati = prev.filter((u) => u.chat_id !== nuovo.chat_id);
            return [nuovo, ...filtrati];
          });
        },
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [chatIdSelezionata]);

  useEffect(() => {
    if (!chatIdSelezionata) return;
    setNotifiche((prev) => ({ ...prev, [chatIdSelezionata]: 0 }));
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

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messaggi]);

  const invia = async () => {
    if (!messaggio.trim() || !chatIdSelezionata) return;
    const testoInvio = messaggio;
    setMessaggio("");
    const { error } = await supabase.from("chat").insert([
      {
        chat_id: chatIdSelezionata,
        testo: testoInvio,
        ruolo: "admin",
        nome: "Anastasia",
        cognome: "Admin",
      },
    ]);

    if (error) {
      console.error("Errore invio messaggio admin:", error);
      alert("Errore invio messaggio. Riprova.");
      return;
    }

    if (!chatIdSelezionata.startsWith("group_")) {
      inviaNotificaPushAlCliente(testoInvio, chatIdSelezionata);
    } else {
      // Per i gruppi inviamo a tutti gli studenti iscritti (tag OneSignal)
      inviaNotificaPushGruppo(testoInvio, chatIdSelezionata);
    }
  };

  const inviaNotificaPushGruppo = async (testo, groupId) => {
    try {
      await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: "Basic OTU5M2U5OTQtMjUzMC00Njg3LWE3YTAtMmU0YjVlNDJkMjhk",
        },
        body: JSON.stringify({
          app_id: "c5933b83-abe0-424b-9433-af3db6372d34",
          filters: [
            { field: "tag", key: "corso", relation: "=", value: groupId }
          ],
          contents: { en: testo, it: testo },
          headings: { en: "Nuovo Messaggio nel Gruppo", it: "Nuovo Messaggio nel Gruppo" },
          url: "https://app-ana.vercel.app/",
        }),
      });
    } catch (e) {
      console.error("Errore invio push gruppo:", e);
    }
  };

  const gestisciFileAdmin = async (e) => {
    const file = e.target.files[0];
    if (!file || !chatIdSelezionata) return;

    setCaricamento(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error } = await supabase.storage
      .from("files")
      .upload(filePath, file);

    if (error) {
      alert("Errore nel caricamento del file: " + error.message);
      setCaricamento(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("files")
      .getPublicUrl(filePath);

    const { error: insertError } = await supabase.from("chat").insert([
      {
        chat_id: chatIdSelezionata,
        testo: `[FILE|${publicUrl}|${file.type}]`,
        ruolo: "admin",
        nome: "Anastasia",
        cognome: "Admin",
      },
    ]);

    if (insertError) {
      console.error("Errore invio file admin:", insertError);
      alert("Errore nell'invio del file. Riprova.");
      setCaricamento(false);
      return;
    }

    setCaricamento(false);
    inviaNotificaPushAlCliente("Anastasia ha inviato un nuovo file/video", chatIdSelezionata);
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
                <img src={url} alt="file" className="rounded-xl max-w-full max-h-64 object-contain h-auto mt-2 border border-white/10 hover:opacity-80 transition-all shadow-lg" />
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
        console.error("Errore rendering file admin:", e);
      }
    }
    return <p className="leading-relaxed whitespace-pre-wrap">{m.testo}</p>;
  };

  const attivaNotifiche = () => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(function (OneSignal) {
      let done = false;

      const doLogin = async () => {
        if (done) return;
        done = true;
        try {
          await OneSignal.login("admin_anastasia");
          alert("✅ Notifiche Admin attivate! Riceverai un avviso per ogni nuovo cliente.");
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

  const eliminaChat = async (e, chatId) => {
    e.stopPropagation();
    const conferma = window.confirm(
      "Vuoi eliminare definitivamente questa chat?",
    );
    if (!conferma) return;
    const { error } = await supabase
      .from("chat")
      .delete()
      .eq("chat_id", chatId);
    if (!error) {
      nascondiChat(chatId);
      setChatUtenti((prev) => prev.filter((u) => u.chat_id !== chatId));
      if (chatIdSelezionata === chatId) {
        setChatIdSelezionata(null);
        setMessaggi([]);
      }
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
          <h1 className="text-xl font-black text-purple-500 uppercase tracking-tighter mb-2">
            Admin Login
          </h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-6">
            Accesso richiesto
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="Email"
              className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-white outline-none focus:border-purple-500 transition-all"
              required
            />
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-white outline-none focus:border-purple-500 transition-all"
              required
            />
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-white text-black font-black py-4 rounded-2xl uppercase text-xs tracking-widest hover:bg-purple-600 hover:text-white transition-all disabled:opacity-60"
            >
              {loginLoading ? "Accesso..." : "Entra"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
      {/* SIDEBAR LISTA UTENTI */}
      <div
        className={`${chatIdSelezionata ? "hidden md:flex" : "flex"} w-full md:w-80 flex-col border-r border-white/10 bg-zinc-950`}
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h1 className="text-xl font-black text-purple-500 uppercase tracking-tighter">
            Messaggi
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={attivaNotifiche}
              className="text-[10px] bg-purple-900/30 text-purple-400 hover:bg-purple-600 hover:text-white px-3 py-1.5 rounded-full uppercase font-bold tracking-tighter transition-all border border-purple-500/20"
            >
              🔔 Notifiche
            </button>
            <button
              onClick={handleLogout}
              className="text-[10px] bg-zinc-900 text-zinc-500 hover:text-white px-3 py-1.5 rounded-full uppercase font-bold tracking-tighter transition-all border border-white/5"
            >
              Esci
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* GRUPPI CORSI */}
          <div className="px-6 py-4 bg-zinc-900/50 border-b border-white/10">
            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Gruppi Corsi</p>
          </div>
          {gruppiCorsi.map((g) => (
            <div
              key={g.chat_id}
              onClick={() => setChatIdSelezionata(g.chat_id)}
              className={`p-4 border-b border-white/5 cursor-pointer transition-colors flex justify-between items-center group ${chatIdSelezionata === g.chat_id ? "bg-purple-900/20" : "hover:bg-white/5"}`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm truncate">👥 {g.nome}</p>
                <p className="text-[10px] text-zinc-500 truncate uppercase tracking-widest">{g.piano}</p>
              </div>
            </div>
          ))}

          {/* CHAT PRIVATE */}
          <div className="px-6 py-4 bg-zinc-900/50 border-b border-white/10 mt-4">
            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Chat Private</p>
          </div>
          {chatUtenti.filter(u => !u.chat_id.startsWith("group_")).map((u) => (
            <div
              key={u.chat_id}
              onClick={() => setChatIdSelezionata(u.chat_id)}
              className={`p-4 border-b border-white/5 cursor-pointer transition-colors flex justify-between items-center group ${chatIdSelezionata === u.chat_id ? "bg-purple-900/20" : "hover:bg-white/5"}`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm truncate">
                  {u.nome} {u.cognome}
                </p>
                <p className="text-[10px] text-zinc-500 truncate uppercase tracking-widest">
                  {u.piano || "Nessun Piano"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {notifiche[u.chat_id] > 0 && (
                  <span className="bg-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                    {notifiche[u.chat_id]}
                  </span>
                )}
                {!u.chat_id.startsWith("group_") && (
                  <button
                    onClick={(e) => eliminaChat(e, u.chat_id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-500 transition-all"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AREA CHAT */}
      <div
        className={`${chatIdSelezionata ? "flex" : "hidden md:flex"} flex-1 flex-col bg-zinc-900 relative`}
      >
        {chatIdSelezionata ? (
          <>
            {/* SCHEDA CLIENTE IN ALTO */}
            <div className="p-4 border-b border-white/5 bg-zinc-950 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setChatIdSelezionata(null)}
                  className="md:hidden text-purple-500 text-xl"
                >
                  ←
                </button>
                <div>
                  <h2 className="font-black text-lg text-white uppercase tracking-tighter">
                    {chatIdSelezionata.startsWith("group_") 
                      ? gruppiCorsi.find(g => g.chat_id === chatIdSelezionata)?.nome 
                      : `${utenteSelezionato?.nome} ${utenteSelezionato?.cognome}`}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full uppercase font-bold border border-purple-500/20">
                      {chatIdSelezionata.startsWith("group_") 
                        ? "GRUPPO CORSO" 
                        : (utenteSelezionato?.piano || "Piano non rilevato")}
                    </span>
                    {!chatIdSelezionata.startsWith("group_") && (
                      <>
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest">
                          📱 {utenteSelezionato?.telefono || "No Tel"}
                        </span>
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest">
                          📧 {utenteSelezionato?.email || "No Email"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* TASTO WHATSAPP DIRETTO */}
              {utenteSelezionato?.telefono && !chatIdSelezionata.startsWith("group_") && (
                <a
                  href={`https://wa.me/${utenteSelezionato.telefono.replace(/\s/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-green-600 hover:bg-green-500 text-white p-3 rounded-2xl flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-green-900/20"
                >
                  <span className="text-[10px] font-black uppercase hidden sm:inline">
                    Apri WA
                  </span>
                  <span className="text-xl">📱</span>
                </a>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messaggi.map((m, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${m.ruolo === "admin" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.ruolo === "admin" ? "bg-purple-600 text-white rounded-tr-none" : "bg-zinc-800 text-gray-200 rounded-tl-none border border-white/5"}`}
                  >
                    {m.ruolo !== "admin" && chatIdSelezionata.startsWith("group_") && (
                      <p className="text-[9px] font-bold text-purple-400 mb-1 uppercase tracking-widest">{m.nome}</p>
                    )}
                    {renderizzaMessaggio(m)}
                  </div>
                  <span className="text-[8px] text-zinc-500 mt-1 px-2 font-bold uppercase tracking-widest">
                    {formattaOra(m.created_at)}
                  </span>
                </div>
              ))}
              <div ref={scrollRef}></div>
            </div>

            <div className="p-4 bg-zinc-950 border-t border-white/5">
              <div className="flex gap-2 bg-zinc-800 p-2 rounded-2xl relative">
                <label className="flex items-center justify-center w-10 h-10 bg-zinc-700 rounded-xl cursor-pointer hover:bg-zinc-600 transition-colors">
                  <input type="file" className="hidden" onChange={gestisciFileAdmin} />
                  <span className="text-xl">📎</span>
                </label>
                <input
                  value={messaggio}
                  onChange={(e) => setMessaggio(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && invia()}
                  className="flex-1 bg-transparent p-2 outline-none text-sm"
                  placeholder="Rispondi..."
                />
                <button
                  onClick={invia}
                  className="bg-purple-600 w-10 h-10 rounded-xl flex items-center justify-center transition-transform active:scale-90"
                >
                  ➤
                </button>
                {caricamento && (
                  <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center z-10">
                    <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-700">
            <p className="text-[10px] uppercase tracking-[0.4em]">
              Seleziona un cliente
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import Chat from "./components/Chat";
import GroupChat from "./components/GroupChat";
import PrenotaForm from "./components/PrenotaForm";
import { supabase } from "./components/supabase";

const CONFIG = {
  nome: "Anastasia",
  sottotitolo: "Guida Spirituale & Cartomante",
  instagram: "https://www.instagram.com/aanangottiii/",
  tiktok: "https://www.tiktok.com/@anastasia.lapiubella",
  foto: "/ana.png",
};

const Piani = [
  {
    nome: "Sussurro Arcano",
    prezzo: "10€",
    desc: "Lettura base su ciò che vuoi, svolta tramite video personalizzato.",
  },
  {
    nome: "Sentiero Illuminato",
    prezzo: "20€",
    desc: "Puoi fare fino a 10 domande specifiche con le relative tempistiche, svolta tramite video dedicato.",
    popolare: true,
  },
  {
    nome: "Visione Mistica",
    prezzo: "35€",
    desc: "Consulto completo: 20 domande con stese, tempistiche e Arcani Maggiori/Minori. Svolto tramite video dedicato.",
  },
];

const Corsi = [
  {
    nome: "Corso Base Cartomanzia",
    prezzo: "30€",
    desc: "Impara le basi degli Arcani Maggiori e come effettuare le prime stese.",
  },
  {
    nome: "Percorso Avanzato",
    prezzo: "50€",
    desc: "Approfondimento completo su Arcani Maggiori e Minori, tempistiche e letture complesse.",
    popolare: true,
  },
  {
    nome: "Masterclass Personale",
    prezzo: "70€",
    desc: "Lezioni individuali personalizzate con Anastasia per perfezionare il tuo dono.",
  },
];

function App() {
  const [formAperto, setFormAperto] = useState(false);
  const [chatAperta, setChatAperta] = useState(false);
  const [userData, setUserData] = useState(null);
  const [tabAttiva, setTabAttiva] = useState("consulti"); // "consulti" o "corsi"
  const [isCorso, setIsCorso] = useState(false);
  const [showPrivateChatInCourse, setShowPrivateChatInCourse] = useState(false);

  // ID della chat privata: recupera o crea
  const [chatId] = useState(() => {
    const savedId = localStorage.getItem("chat_id_anastasia");
    if (savedId) return savedId;
    const newId = Math.random().toString(36).substr(2, 9);
    localStorage.setItem("chat_id_anastasia", newId);
    return newId;
  });

  useEffect(() => {
    const saved = localStorage.getItem("user_data_anastasia");
    if (saved) setUserData(JSON.parse(saved));
  }, []);

  const handlePrenota = (piano, corso = false) => {
    setIsCorso(corso);
    const savedData = localStorage.getItem("user_data_anastasia");
    if (savedData) {
      const data = JSON.parse(savedData);
      setUserData({ ...data, piano });
      setChatAperta(true);
    } else {
      setUserData({ piano });
      setFormAperto(true);
    }
  };

  const handleCloseForm = () => {
    setFormAperto(false);
    const savedData = localStorage.getItem("user_data_anastasia");
    if (!savedData) {
      setUserData(null);
    }
  };

  const handleFormSubmit = async (data) => {
    setUserData(data);
    localStorage.setItem("user_data_anastasia", JSON.stringify(data));
    setFormAperto(false);
    setChatAperta(true);

    // Se è un corso, inviamo un messaggio privato all'admin per il pagamento
    if (isCorso) {
      const emailInfo = data.email && data.email !== "Non fornita" ? ` (Email: ${data.email})` : "";
      await supabase.from("chat").insert([
        {
          chat_id: chatId,
          testo: `Ciao Anastasia, vorrei iscrivermi al corso "${data.piano}"${emailInfo}. Come posso procedere con il pagamento?`,
          ruolo: "utente",
          nome: data.nome,
          cognome: data.cognome,
          telefono: data.telefono,
          piano: data.piano,
        },
      ]);
    }

    // --- NUOVA NOTIFICA ISTANTANEA TELEGRAM (Zero Ritardi) ---
    // Inserisci qui il tuo Token e Chat ID di Telegram
    const BOT_TOKEN = "IL_TUO_TOKEN_TELEGRAM";
    const CHAT_ID = "IL_TUO_ID_TELEGRAM";

    const testoNotifica =
      `🔮 *${isCorso ? "NUOVA ISCRIZIONE CORSO" : "NUOVA PRENOTAZIONE"}* 🔮\n\n` +
      `👤 *Nome:* ${data.nome} ${data.cognome}\n` +
      `🔞 *Età:* ${data.eta} anni\n` +
      `📧 *Email:* ${data.email}\n` +
      `📱 *WhatsApp:* ${data.telefono}\n` +
      `💎 *${isCorso ? "Corso" : "Piano"}:* ${data.piano}\n\n` +
      `${isCorso ? "⚠️ *Il cliente attende istruzioni per il pagamento in chat privata.*\n\n" : ""}` +
      `👉 [SCRIVI AL CLIENTE](https://wa.me/${data.telefono.replace(/\s/g, "")})`;

    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: testoNotifica,
        parse_mode: "Markdown",
      }),
    }).catch((err) => console.error("Errore Telegram:", err));
  };

  return (
    <div className="magic-bg min-h-screen w-full flex flex-col items-center justify-start py-12 px-6 text-white text-center font-sans relative">
      <div className="relative z-10 w-full flex flex-col items-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-purple-600 blur-[45px] opacity-40 animate-pulse"></div>
          <img
            src={CONFIG.foto}
            alt="Anastasia"
            className="w-32 h-32 rounded-full border-2 border-purple-400/50 relative z-10 object-cover shadow-2xl"
            onError={(e) => (e.target.src = "https://via.placeholder.com/150")}
          />
        </div>

        <h1 className="text-5xl font-bold tracking-tighter mb-2 italic uppercase drop-shadow-lg">
          {CONFIG.nome}
        </h1>
      <p className="text-purple-400 text-xs tracking-[0.4em] uppercase font-light mb-4 text-center">
        {CONFIG.sottotitolo}
      </p>
      
      {/* AVVISO 18+ */}
      <div className="mb-8 px-4 py-1.5 rounded-full bg-red-900/20 border border-red-500/30 text-[10px] font-bold uppercase tracking-[0.3em] text-red-400 animate-pulse">
        🔞 VIETATO AI MINORI DI 18 ANNI
      </div>

      <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-3xl p-6 mb-12 max-w-lg shadow-xl mx-auto text-left">
        <p className="text-sm text-gray-200 leading-relaxed">
          ✨{" "}
          <span className="text-purple-300 font-bold uppercase tracking-widest">
            Guida:
          </span>{" "}
          <br />
          Ogni consulto è <b>unico e reale</b>. Riceverai un video
          personalizzato creato appositamente per te, in cui{" "}
          <b>ripeterò il tuo nome</b> e la tua domanda per garantirti
          l'autenticità della stesa.
          <br />
          <br />
          <span className="text-white font-semibold italic text-xs uppercase tracking-tighter">
            Scegli il piano o il <button onClick={() => setTabAttiva("corsi")} className="text-purple-400 underline underline-offset-4 decoration-purple-500/50 hover:text-purple-300 transition-colors">corso</button>, clicca su "Prenota Ora" e scrivimi in chat per
            iniziare!
          </span>
          <br />
          <br />
          Fisseremo l'appuntamento in tempi brevissimi.
        </p>
      </div>

      <div className="flex justify-center space-x-14 mb-20 text-4xl">
        <a
          href={CONFIG.tiktok}
          target="_blank"
          rel="noreferrer"
          className="hover:text-purple-500 transition-all hover:scale-125"
        >
          <i className="fab fa-tiktok"></i>
        </a>
        <a
          href={CONFIG.instagram}
          target="_blank"
          rel="noreferrer"
          className="hover:text-pink-500 transition-all hover:scale-125"
        >
          <i className="fab fa-instagram"></i>
        </a>
      </div>

      {/* SELETTORE TAB */}
      <div className="flex bg-zinc-900/50 p-1.5 rounded-2xl mb-12 border border-white/5 backdrop-blur-sm">
        <button
          onClick={() => setTabAttiva("consulti")}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            tabAttiva === "consulti"
              ? "bg-white text-black shadow-lg"
              : "text-zinc-500 hover:text-white"
          }`}
        >
          Consulti 🔮
        </button>
        <button
          onClick={() => setTabAttiva("corsi")}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            tabAttiva === "corsi"
              ? "bg-white text-black shadow-lg"
              : "text-zinc-500 hover:text-white"
          }`}
        >
          Corsi 🎓
        </button>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-8 mx-auto">
        {(tabAttiva === "consulti" ? Piani : Corsi).map((p, i) => (
          <div
            key={i}
            className={`relative bg-zinc-900/40 backdrop-blur-xl border ${
              p.popolare
                ? "border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.2)] scale-105"
                : "border-white/10"
            } p-10 rounded-[2.5rem] flex flex-col items-center transition-all duration-500 hover:-translate-y-4`}
          >
            {p.popolare && (
              <span className="absolute -top-4 bg-purple-600 text-[10px] font-bold px-5 py-1.5 rounded-full uppercase italic tracking-widest shadow-lg">
                Più Richiesto
              </span>
            )}
            <h2 className="text-xl font-bold mb-4 text-gray-100 uppercase tracking-tighter">
              {p.nome}
            </h2>
            <div className="text-5xl font-black mb-6 text-white tracking-tighter">
              {p.prezzo}
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-10 italic">
              "{p.desc}"
            </p>
            <button
              onClick={() => handlePrenota(p.nome, tabAttiva === "corsi")}
              className="mt-auto w-full py-4 bg-white text-black font-extrabold rounded-2xl hover:bg-purple-600 hover:text-white transition-all duration-300 uppercase text-xs tracking-widest shadow-xl"
            >
              Prenota Ora
            </button>
          </div>
        ))}
      </div>

      {userData?.nome && !chatAperta && !formAperto && (
        <div className="mt-16 bg-zinc-900/80 border border-purple-500/50 p-8 rounded-[2.5rem] shadow-2xl">
          <p className="text-purple-400 text-[10px] uppercase tracking-widest mb-2">
            Sessione Attiva
          </p>
          <h4 className="font-bold mb-6 italic text-xl">
            Bentornato {userData.nome}! ✨
          </h4>
          <button
            onClick={() => setChatAperta(true)}
            className="bg-white text-black px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-purple-600 hover:text-white transition-all"
          >
            Apri la tua Chat
          </button>
        </div>
      )}

      <footer className="mt-28 text-[10px] text-zinc-500 tracking-[0.6em] uppercase text-center w-full">
        © 2026 Anastasia • Consulti & Corsi di Cartomanzia
      </footer>

      {formAperto && (
        <PrenotaForm
          piano={userData?.piano}
          onSubmit={handleFormSubmit}
          onClose={handleCloseForm}
        />
      )}
      {chatAperta && !isCorso && (
        <Chat 
          userData={userData} 
          onClose={() => setChatAperta(false)} 
          chatId={chatId}
        />
      )}
      {chatAperta && isCorso && (
        <>
          {showPrivateChatInCourse ? (
            <Chat 
              userData={userData} 
              onClose={() => setChatAperta(false)} 
              chatId={chatId}
              isFromCourse={true}
              onToggleGroup={() => setShowPrivateChatInCourse(false)}
            />
          ) : (
            <GroupChat 
              userData={userData} 
              onClose={() => setChatAperta(false)} 
              chatId={chatId}
              onTogglePrivate={() => setShowPrivateChatInCourse(true)}
            />
          )}
        </>
      )}
      </div>
    </div>
  );
}

export default App;

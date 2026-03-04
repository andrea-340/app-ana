import React, { useState, useEffect } from "react";
import Chat from "./components/Chat";
import PrenotaForm from "./components/PrenotaForm";

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
    nome: "Sentiero dell'Amore",
    prezzo: "20€",
    desc: "Puoi fare fino a 10 domande specifiche con le relative tempistiche, svolta tramite video dedicato.",
    popolare: true,
  },
  {
    nome: "Destino Illuminato",
    prezzo: "35€",
    desc: "Consulto completo: 20 domande con stese, tempistiche e Arcani Maggiori/Minori. Scelta tra chiamata o video.",
  },
];

function App() {
  const [formAperto, setFormAperto] = useState(false);
  const [chatAperta, setChatAperta] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("user_data_anastasia");
    if (saved) setUserData(JSON.parse(saved));
  }, []);

  const handlePrenota = (piano) => {
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

    // --- NUOVA NOTIFICA ISTANTANEA TELEGRAM (Zero Ritardi) ---
    // Inserisci qui il tuo Token e Chat ID di Telegram
    const BOT_TOKEN = "IL_TUO_TOKEN_TELEGRAM";
    const CHAT_ID = "IL_TUO_ID_TELEGRAM";

    const testoNotifica =
      `🔮 *NUOVA PRENOTAZIONE* 🔮\n\n` +
      `👤 *Nome:* ${data.nome} ${data.cognome}\n` +
      `📱 *WhatsApp:* ${data.telefono}\n` +
      `💎 *Piano:* ${data.piano}\n\n` +
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
    <div className="magic-bg w-full flex flex-col items-center justify-start py-12 px-6 text-white text-center font-sans">
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
      <p className="text-purple-400 text-xs tracking-[0.4em] uppercase font-light mb-8 text-center">
        {CONFIG.sottotitolo}
      </p>

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
            Scegli il piano, clicca su "Prenota Ora" e scrivimi in chat per
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

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-8 mx-auto">
        {Piani.map((p, i) => (
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
              onClick={() => handlePrenota(p.nome)}
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
        © 2026 Anastasia • Video Consulti Personalizzati
      </footer>

      {formAperto && (
        <PrenotaForm
          piano={userData?.piano}
          onSubmit={handleFormSubmit}
          onClose={handleCloseForm}
        />
      )}
      {chatAperta && (
        <Chat userData={userData} onClose={() => setChatAperta(false)} />
      )}
    </div>
  );
}

export default App;

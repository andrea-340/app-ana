import React from "react";

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
  const vaiSuInstagram = () => {
    window.open(CONFIG.instagram, "_blank");
  };

  return (
    <div className="magic-bg w-full flex flex-col items-center justify-start py-12 px-6 text-white text-center font-sans">
      {/* IMMAGINE PROFILO */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-purple-600 blur-[45px] opacity-40 animate-pulse"></div>
        <img
          src={CONFIG.foto}
          alt="Anastasia"
          className="w-32 h-32 rounded-full border-2 border-purple-400/50 relative z-10 object-cover shadow-2xl"
          onError={(e) => {
            e.target.src = "https://via.placeholder.com/150";
          }}
        />
      </div>

      {/* INTESTAZIONE */}
      <h1 className="text-5xl font-bold tracking-tighter mb-2 italic uppercase drop-shadow-lg">
        {CONFIG.nome}
      </h1>
      <p className="text-purple-400 text-xs tracking-[0.4em] uppercase font-light mb-8 text-center">
        {CONFIG.sottotitolo}
      </p>

      {/* BOX ISTRUZIONI - FIDUCIA E VERIDICITÀ */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-3xl p-6 mb-12 max-w-lg shadow-xl mx-auto">
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
            Scegli il piano, clicca su "Prenota Ora" e scrivimi su Instagram
            quale hai scelto per iniziare!
          </span>
          <br />
          <br />
          Fisseremo l'appuntamento in tempi brevissimi.
        </p>
      </div>

      {/* SOCIAL LOGOS */}
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

      {/* GRIGLIA PIANI */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-8 mx-auto">
        {Piani.map((p, i) => (
          <div
            key={i}
            className={`relative bg-zinc-900/40 backdrop-blur-xl border ${p.popolare ? "border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.2)] scale-105" : "border-white/10"} p-10 rounded-[2.5rem] flex flex-col items-center transition-all duration-500 hover:-translate-y-4`}
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
              onClick={vaiSuInstagram}
              className="mt-auto w-full py-4 bg-white text-black font-extrabold rounded-2xl hover:bg-purple-600 hover:text-white transition-all duration-300 uppercase text-xs tracking-widest shadow-xl"
            >
              Prenota Ora
            </button>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <footer className="mt-28 text-[10px] text-zinc-500 tracking-[0.6em] uppercase text-center w-full">
        © 2026 Anastasia • Video Consulti Personalizzati
      </footer>
    </div>
  );
}

export default App;

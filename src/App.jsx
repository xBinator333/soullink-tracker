import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { ref, push, set } from "firebase/database";
import { db } from "./firebase.js";
import { LOCATIONS, GYM_CAPS, BADGE_COLORS, getEvoChain, C } from "./data.js";
import { fetchGermanPokemonNames } from "./pokemon.js";
import { useFirebaseSync } from "./useFirebaseSync.js";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700;900&family=Share+Tech+Mono&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:${C.bg};color:${C.text};font-family:'Exo 2',sans-serif}
  ::-webkit-scrollbar{width:3px;height:3px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
  @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
  @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
  .fade{animation:fadeIn .18s ease forwards}
  .mono{font-family:'Share Tech Mono',monospace}
  input{background:${C.lift};border:1px solid ${C.border};border-radius:7px;
    padding:8px 11px;color:${C.text};font-family:'Exo 2',sans-serif;font-size:13px;
    outline:none;transition:border-color .15s;width:100%}
  input:focus{border-color:${C.p1}66}
  input::placeholder{color:${C.dim}}
`;

// ============================================================
// Sub-Components (Sprite, PokemonSearch, EncCard, Modals)
// ============================================================

function Sprite({ slug, size = 52, dead = false }) {
  const [err, setErr] = useState(false);
  if (!slug || err) return (
    <div style={{ width: size, height: size, borderRadius: 8, background: C.lift,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * .28, color: C.dim, opacity: dead ? .2 : .5, flexShrink: 0 }}>?</div>
  );
  return (
    <img src={`https://www.pkparaiso.com/imagenes/xy/sprites/animados/${slug}.gif`}
      onError={() => setErr(true)} alt=""
      style={{ width: size, height: size, flexShrink: 0, objectFit: "contain",
        filter: dead ? "grayscale(1) opacity(.25)" : "drop-shadow(0 2px 6px #0009)",
        transition: "filter .3s" }} />
  );
}

function PokemonSearch({ pokemonList, value, onChange }) {
  const [q, setQ] = useState(value?.name || "");
  const [open, setOpen] = useState(false);
  const refEl = useRef(null);
  useEffect(() => {
    const h = e => { if (refEl.current && !refEl.current.contains(e.target)) setOpen(false) };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const results = useMemo(() => {
    if (q.length < 1) return [];
    const ql = q.toLowerCase();
    return pokemonList.filter(p => p.name.toLowerCase().includes(ql) || String(p.id) === q.trim()).slice(0, 8);
  }, [q, pokemonList]);
  return (
    <div ref={refEl} style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Sprite slug={value?.slug} size={40} />
        <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); onChange(null) }}
          onFocus={() => setOpen(true)} placeholder="Pokémon suchen…" />
      </div>
      {open && results.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
          zIndex: 400, overflow: "hidden", boxShadow: "0 8px 32px #000b",
          maxHeight: 280, overflowY: "auto" }}>
          {results.map(p => (
            <div key={p.id} onMouseDown={() => { onChange(p); setQ(p.name); setOpen(false) }}
              style={{ display: "flex", alignItems: "center", gap: 10,
                padding: "6px 12px", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = C.lift}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <Sprite slug={p.slug} size={30} />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.name}</span>
              <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: C.dim }}>
                #{String(p.id).padStart(3, "0")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EncCard({ enc, player, linkStatus, cap, onStatus, onDelete }) {
  const acc = player === "p1" ? C.p1 : C.p2;
  const dead = enc.status === "dead";
  const gone = dead || enc.status === "missed" || enc.status === "burned"
    || enc.status === "fled" || enc.status === "ko";
  const isOver = enc.level && cap && enc.level > cap;
  const leftCol = dead ? C.dead : isOver ? C.warn : gone ? C.dim : acc;
  return (
    <div className="fade" style={{
      background: dead ? `${C.dead}0a` : isOver ? `${C.warn}0a` : C.card,
      border: `1px solid ${dead ? C.dead + "33" : isOver ? C.warn + "44" : gone ? C.border : acc + "28"}`,
      borderLeft: `3px solid ${leftCol}`,
      borderRadius: 8, padding: "9px 11px",
      display: "flex", alignItems: "center", gap: 10,
      position: "relative", transition: "all .2s" }}>
      <Sprite slug={enc.slug} size={44} dead={gone} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: gone ? C.dim : C.text,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {enc.nickname || enc.name || "Unbekannt"}
          </span>
          {enc.nickname && enc.name && <span className="mono" style={{ fontSize: 10, color: C.dim, flexShrink: 0 }}>{enc.name}</span>}
          <div style={{ marginLeft: "auto" }}>
            {enc.level && (
              <span className="mono" style={{ fontSize: 10,
                color: isOver ? C.warn : enc.level === cap ? C.gold : C.sub,
                fontWeight: isOver || enc.level === cap ? 700 : 400 }}>
                Lv {enc.level}{isOver ? " ⚠" : ""}
              </span>
            )}
          </div>
        </div>
        <div className="mono" style={{ fontSize: 10, color: C.dim, marginBottom: 6 }}>
          {enc.locationType === "static" ? "⭐ " : enc.locationType === "gift" ? "🎁 " : ""}
          {enc.route}
        </div>
        {isOver && (
          <div style={{ fontSize: 10, color: C.warn, marginBottom: 5,
            background: `${C.warn}15`, borderRadius: 4, padding: "2px 6px", display: "inline-block" }}>
            Überlevelt – muss in Box (Cap: {cap})
          </div>
        )}
        <div style={{ display: "flex", gap: 3 }}>
          {[
            { k: "team", l: "Team", c: C.ok },
            { k: "box", l: "Box", c: C.p1 },
            { k: "dead", l: "Gefallen", c: C.dead },
          ].map(s => (
            <button key={s.k} onClick={() => onStatus(s.k)} style={{
              fontFamily: "'Exo 2',sans-serif", fontWeight: 600, fontSize: 9,
              padding: "2px 7px", borderRadius: 4, cursor: "pointer",
              border: `1px solid ${enc.status === s.k ? s.c + "66" : "transparent"}`,
              background: enc.status === s.k ? s.c + "22" : C.lift,
              color: enc.status === s.k ? s.c : C.dim }}>{s.l}</button>
          ))}
        </div>
      </div>
      {linkStatus && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%",
            background: linkStatus === "linked" ? C.link : C.warn,
            animation: linkStatus === "linked" ? "pulse 2.5s ease infinite" : "none" }} />
          <span className="mono" style={{ fontSize: 7, color: linkStatus === "linked" ? C.link : C.warn }}>
            {linkStatus === "linked" ? "link" : "!"}
          </span>
        </div>
      )}
      <button onClick={onDelete} style={{
        position: "absolute", top: 4, right: 6, background: "none", border: "none",
        cursor: "pointer", color: C.dim, fontSize: 16, opacity: .3, lineHeight: 1 }}
        onMouseEnter={e => e.currentTarget.style.opacity = 1}
        onMouseLeave={e => e.currentTarget.style.opacity = .3}>×</button>
    </div>
  );
}

function EncModal({ mode, pendingEnc, pokemonList, player, customLocations, usedRoutes, allEnc, partnerEncs, onClose, onStart, onFinish, onAddCustomLocation }) {
  const initialLoc = mode === "finish" && pendingEnc
    ? { name: pendingEnc.route, type: pendingEnc.locationType || "route" }
    : null;
  const [location, setLocation] = useState(initialLoc);
  const [locQ, setLocQ] = useState("");
  const [customLoc, setCustomLoc] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [species, setSpecies] = useState(null);
  const [nick, setNick] = useState("");
  const [lv, setLv] = useState("");
  const [outcome, setOutcome] = useState(null);
  const acc = player === "p1" ? C.p1 : C.p2;
  const allLocations = [...LOCATIONS, ...customLocations];
  const filteredLocs = locQ.length < 1 ? allLocations : allLocations.filter(l => l.name.toLowerCase().includes(locQ.toLowerCase()));
  const warnings = [];
  if (mode === "start" && location && usedRoutes.includes(location.name)) warnings.push(`„${location.name}" bereits verbraucht`);
  if (species) {
    const chain = getEvoChain(species.id);
    const hit = allEnc.find(e => e.speciesId && chain.includes(e.speciesId) && e.id !== pendingEnc?.id);
    if (hit) warnings.push(`${hit.name} (Evo-Linie) bereits auf ${hit.route}`);
  }
  const partnerOnLoc = (mode === "finish" && location)
    ? partnerEncs.find(e => e.route === location.name && e.status !== "pending")
    : null;

  function handleAddCustom() {
    if (!customLoc.trim()) return;
    const newLoc = { name: customLoc.trim(), type: "route", custom: true };
    onAddCustomLocation(newLoc);
    setLocation(newLoc);
    setLocQ(newLoc.name);
    setShowCustom(false);
    if (mode === "start") onStart(newLoc);
  }

  const title = mode === "start" ? "Encounter starten" : "Encounter abschliessen";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.9)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, backdropFilter: "blur(8px)", padding: 16 }}>
      <div style={{ background: C.panel, border: `1px solid ${acc}44`,
        borderRadius: 14, padding: 24, width: 460, maxWidth: "100%",
        boxShadow: `0 0 60px ${acc}14,0 16px 48px #000b`,
        maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: acc, boxShadow: `0 0 8px ${acc}` }} />
          <span style={{ fontWeight: 900, fontSize: 16 }}>{title}</span>
          <span className="mono" style={{ fontSize: 11, color: C.sub }}>· {player === "p1" ? "Spieler 1" : "Spieler 2"}</span>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: C.dim, fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        {mode === "start" && !showCustom && (
          <div className="fade">
            <div className="mono" style={{ fontSize: 10, color: C.sub, marginBottom: 8 }}>WO TAUCHT DAS POKÉMON AUF?</div>
            <input autoFocus value={locQ} onChange={e => setLocQ(e.target.value)} placeholder="Suchen…" style={{ marginBottom: 8 }} />
            <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1, marginBottom: 10 }}>
              {filteredLocs.map(loc => {
                const used = usedRoutes.includes(loc.name);
                const partnerHas = partnerEncs.some(e => e.route === loc.name && e.status !== "pending");
                const icon = loc.type === "static" ? "⭐" : loc.type === "gift" ? "🎁" : "";
                return (
                  <div key={loc.name}
                    onClick={() => { if (!used) { setLocation(loc); onStart(loc); } }}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "7px 10px", borderRadius: 6, cursor: used ? "not-allowed" : "pointer",
                      fontSize: 12, fontWeight: 600, color: used ? C.dim : C.text,
                      opacity: used ? .5 : 1,
                      borderLeft: icon ? `2px solid ${C.gold}55` : "2px solid transparent" }}
                    onMouseEnter={e => { if (!used) e.currentTarget.style.background = C.lift }}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span>{icon && <span style={{ marginRight: 6 }}>{icon}</span>}{loc.name}{loc.custom && <span className="mono" style={{ marginLeft: 6, color: C.sub, fontSize: 9 }}>(eigener)</span>}</span>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      {used && <span className="mono" style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: C.dead + "22", color: C.dead, border: `1px solid ${C.dead}33` }}>verbraucht</span>}
                      {!used && partnerHas && <span className="mono" style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: C.link + "22", color: C.link, border: `1px solid ${C.link}33` }}>Partner ✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setShowCustom(true)} style={{
              width: "100%", padding: "8px", borderRadius: 7,
              background: `${C.warn}12`, border: `1px dashed ${C.warn}55`,
              color: C.warn, fontFamily: "'Exo 2',sans-serif", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>
              + Unbekannter Encounter / eigener Ort
            </button>
          </div>
        )}

        {mode === "start" && showCustom && (
          <div className="fade">
            <div className="mono" style={{ fontSize: 10, color: C.sub, marginBottom: 8 }}>EIGENEN ORT EINGEBEN</div>
            <input autoFocus value={customLoc} onChange={e => setCustomLoc(e.target.value)}
              placeholder="z.B. Versteckte Lichtung Route 3"
              onKeyDown={e => e.key === "Enter" && handleAddCustom()}
              style={{ marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowCustom(false)} style={{ flex: 1, padding: 9, borderRadius: 7,
                background: C.lift, border: `1px solid ${C.border}`, color: C.sub, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Zurück</button>
              <button onClick={handleAddCustom} disabled={!customLoc.trim()} style={{ flex: 2, padding: 9, borderRadius: 7,
                background: customLoc.trim() ? `${acc}22` : C.lift,
                border: `1px solid ${customLoc.trim() ? acc + "55" : "transparent"}`,
                color: customLoc.trim() ? acc : C.dim, fontWeight: 700, fontSize: 12,
                cursor: customLoc.trim() ? "pointer" : "default" }}>Starten →</button>
            </div>
          </div>
        )}

        {mode === "finish" && (
          <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", background: C.lift, borderRadius: 7, padding: "8px 12px", gap: 8 }}>
              {location?.type === "static" && <span style={{ color: C.gold }}>⭐</span>}
              {location?.type === "gift" && <span style={{ color: C.gold }}>🎁</span>}
              <span style={{ fontWeight: 700, fontSize: 13 }}>{location?.name}</span>
              <span className="mono" style={{ fontSize: 9, color: C.sub, marginLeft: "auto" }}>läuft</span>
            </div>
            {partnerOnLoc && (
              <div style={{ background: `${C.link}12`, border: `1px solid ${C.link}33`,
                borderRadius: 7, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                <Sprite slug={partnerOnLoc.slug} size={30} />
                <div>
                  <div className="mono" style={{ fontSize: 9, color: C.link, marginBottom: 2 }}>PARTNER HIER</div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{partnerOnLoc.nickname || partnerOnLoc.name || "Unbekannt"}</div>
                  <div className="mono" style={{ fontSize: 10, color: C.sub }}>
                    {partnerOnLoc.status === "team" ? "Team" : partnerOnLoc.status === "box" ? "Box" : "Grab"}
                  </div>
                </div>
              </div>
            )}
            {warnings.map((w, i) => (
              <div key={i} style={{ background: `${C.warn}10`, border: `1px solid ${C.warn}33`,
                borderRadius: 7, padding: "7px 11px",
                fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: C.warn }}>⚠ {w}</div>
            ))}
            <div>
              <div className="mono" style={{ fontSize: 10, color: C.sub, marginBottom: 7 }}>POKÉMON</div>
              <PokemonSearch pokemonList={pokemonList} value={species} onChange={setSpecies} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 8 }}>
              <div>
                <div className="mono" style={{ fontSize: 10, color: C.sub, marginBottom: 7 }}>SPITZNAME</div>
                <input value={nick} onChange={e => setNick(e.target.value)} placeholder="optional" />
              </div>
              <div>
                <div className="mono" style={{ fontSize: 10, color: C.sub, marginBottom: 7 }}>LEVEL</div>
                <input value={lv} onChange={e => setLv(e.target.value)} type="number" placeholder="?" />
              </div>
            </div>
            <div>
              <div className="mono" style={{ fontSize: 10, color: C.sub, marginBottom: 8 }}>AUSGANG</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {[
                  { k: "caught", l: "Gefangen", icon: "✓", c: C.ok },
                  { k: "fled", l: "Weggerannt", icon: "💨", c: C.dim },
                  { k: "ko", l: "K.O.", icon: "⚔", c: C.dead },
                ].map(o => (
                  <button key={o.k} onClick={() => setOutcome(o.k)} style={{
                    padding: "11px 6px", borderRadius: 9, cursor: "pointer",
                    border: `1px solid ${outcome === o.k ? o.c + "66" : "transparent"}`,
                    background: outcome === o.k ? o.c + "18" : C.lift,
                    color: outcome === o.k ? o.c : C.dim, fontWeight: outcome === o.k ? 700 : 500, fontSize: 11,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 20 }}>{o.icon}</span>
                    <span>{o.l}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onClose} style={{ flex: 1, padding: 9, borderRadius: 7,
                background: C.lift, border: `1px solid ${C.border}`, color: C.sub, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                Später
              </button>
              <button disabled={!outcome}
                onClick={() => outcome && onFinish({ species, nick, level: parseInt(lv) || null, outcome })}
                style={{ flex: 2, padding: 9, borderRadius: 7,
                  background: outcome ? `${acc}22` : C.lift,
                  border: `1px solid ${outcome ? acc + "55" : "transparent"}`,
                  color: outcome ? acc : C.dim, fontWeight: 700, fontSize: 12,
                  cursor: outcome ? "pointer" : "default" }}>Abschliessen →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RunEndModal({ onNewRun, onContinue }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.92)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1100, backdropFilter: "blur(10px)", padding: 16 }}>
      <div style={{ background: C.panel, border: `2px solid ${C.dead}66`,
        borderRadius: 16, padding: 32, width: 440, maxWidth: "100%",
        boxShadow: `0 0 80px ${C.dead}33,0 20px 60px #000`, textAlign: "center",
        animation: "shake .5s ease" }}>
        <div style={{ fontSize: 54, marginBottom: 14 }}>💀</div>
        <div style={{ fontWeight: 900, fontSize: 24, color: C.dead, marginBottom: 8, letterSpacing: 1 }}>RUN BEENDET</div>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 24, lineHeight: 1.5 }}>
          Alle Pokémon beider Spieler sind gefallen.<br />Bereit für einen neuen Versuch?
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onContinue} style={{ flex: 1, padding: 12, borderRadius: 8,
            background: C.lift, border: `1px solid ${C.border}`,
            color: C.sub, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Weiter ansehen</button>
          <button onClick={onNewRun} style={{ flex: 2, padding: 12, borderRadius: 8,
            background: `linear-gradient(135deg,${C.p1}33,${C.p2}33)`,
            border: `1px solid ${C.p1}66`,
            color: C.text, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Neuer Run starten ↻
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Login Screen
// ============================================================

function LoginScreen({ authState, onCreateRoom, onLogin }) {
  const [pw, setPw] = useState("");
  const [player, setPlayer] = useState("p1");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!pw.trim()) return;
    setError("");
    try {
      if (authState === "create_room") {
        setCreating(true);
        await onCreateRoom(pw);
        setCreating(false);
      } else {
        await onLogin(pw, player);
      }
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: "100vh", background: C.bg,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ background: C.panel, border: `1px solid ${C.border}`,
          borderRadius: 16, padding: 32, width: 400, maxWidth: "100%",
          boxShadow: "0 16px 64px #000a" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontWeight: 900, fontSize: 28, letterSpacing: -1, marginBottom: 6 }}>
              <span style={{ color: C.p1 }}>Soul</span><span style={{ color: C.p2 }}>Link</span>
            </div>
            <div className="mono" style={{ fontSize: 11, color: C.dim }}>Schwarz 2 · Nuzlocke Tracker</div>
          </div>

          {authState === "create_room" && (
            <div style={{ background: `${C.ok}12`, border: `1px solid ${C.ok}33`,
              borderRadius: 8, padding: "10px 14px", marginBottom: 18,
              fontSize: 12, color: C.ok, lineHeight: 1.5 }}>
              Erster Start! Lege ein gemeinsames Passwort fest, das ihr beide verwendet.
            </div>
          )}

          <div onKeyDown={e => e.key === "Enter" && handleSubmit(e)}>
            <div className="mono" style={{ fontSize: 10, color: C.sub, marginBottom: 7 }}>PASSWORT</div>
            <input type="password" value={pw} onChange={e => setPw(e.target.value)}
              placeholder="Gemeinsames Passwort" autoFocus
              style={{ marginBottom: 16 }} />

            {authState === "needs_password" && (
              <>
                <div className="mono" style={{ fontSize: 10, color: C.sub, marginBottom: 8 }}>ICH BIN…</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
                  {[
                    { k: "p1", l: "Spieler 1", c: C.p1 },
                    { k: "p2", l: "Spieler 2", c: C.p2 },
                  ].map(s => (
                    <button key={s.k} onClick={() => setPlayer(s.k)} style={{
                      padding: "14px 8px", borderRadius: 10, cursor: "pointer",
                      border: `2px solid ${player === s.k ? s.c : C.border}`,
                      background: player === s.k ? s.c + "18" : C.lift,
                      color: player === s.k ? s.c : C.dim,
                      fontWeight: 700, fontSize: 14,
                      boxShadow: player === s.k ? `0 0 16px ${s.c}22` : "none",
                      transition: "all .15s" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%",
                        background: player === s.k ? s.c : C.dim,
                        margin: "0 auto 8px" }} />
                      {s.l}
                    </button>
                  ))}
                </div>
              </>
            )}

            {error && (
              <div style={{ background: `${C.dead}12`, border: `1px solid ${C.dead}33`,
                borderRadius: 7, padding: "8px 12px", marginBottom: 14,
                fontSize: 12, color: C.dead }}>{error}</div>
            )}

            <button onClick={handleSubmit} disabled={!pw.trim() || creating}
              style={{ width: "100%", padding: 14, borderRadius: 10, cursor: "pointer",
                background: `linear-gradient(135deg,${C.p1}33,${C.p2}33)`,
                border: `1px solid ${C.p1}55`,
                color: C.text, fontWeight: 700, fontSize: 14 }}>
              {creating ? "Wird erstellt…" : authState === "create_room" ? "Raum erstellen" : "Eintreten →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// Main App
// ============================================================

export default function App() {
  const { state: syncState, connected, authState, playerKey, createRoom, login, writeState, pushEncounter } = useFirebaseSync();

  const [tab, setTab] = useState("tracker");
  const [modal, setModal] = useState(null);
  const [editName, setEditName] = useState(null);
  const [pokemonList, setPokemonList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [showRunEnd, setShowRunEnd] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Pokémon-Liste laden
  useEffect(() => {
    fetchGermanPokemonNames(p => setLoadProgress(p))
      .then(list => { setPokemonList(list); setLoading(false) })
      .catch(err => { console.error(err); setLoading(false) });
  }, []);

  // Login-Screen zeigen wenn nicht authentifiziert
  if (authState === "loading") {
    return (
      <>
        <style>{CSS}</style>
        <div style={{ minHeight: "100vh", background: C.bg,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="mono" style={{ color: C.sub, fontSize: 13 }}>Verbinde…</div>
        </div>
      </>
    );
  }

  if (authState === "create_room" || authState === "needs_password") {
    return <LoginScreen authState={authState} onCreateRoom={createRoom} onLogin={login} />;
  }

  // Warten auf erste Daten
  const st = syncState;
  if (!st) {
    return (
      <>
        <style>{CSS}</style>
        <div style={{ minHeight: "100vh", background: C.bg,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="mono" style={{ color: C.sub, fontSize: 13 }}>Lade Daten…</div>
        </div>
      </>
    );
  }

  // Pokémon laden
  if (loading) {
    const pct = Math.round((loadProgress / 649) * 100);
    return (
      <>
        <style>{CSS}</style>
        <div style={{ minHeight: "100vh", background: C.bg,
          display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 18 }}>
          <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: -.5 }}>
            <span style={{ color: C.p1 }}>Soul</span><span style={{ color: C.p2 }}>Link</span>
          </div>
          <div style={{ width: 280, height: 6, background: C.lift, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%",
              background: `linear-gradient(90deg,${C.p1},${C.p2})`, transition: "width .3s" }} />
          </div>
          <div className="mono" style={{ fontSize: 11, color: C.sub }}>
            Lade deutsche Pokémon-Namen… {loadProgress} / 649
          </div>
          <div className="mono" style={{ fontSize: 10, color: C.dim, maxWidth: 340, textAlign: "center" }}>
            (Einmaliger Vorgang – wird im Browser gecacht)
          </div>
        </div>
      </>
    );
  }

  // ============================================================
  // Game Logic (arbeitet auf syncState, schreibt via writeState)
  // ============================================================

  const allEnc = [...st.p1.encounters, ...st.p2.encounters];
  const badgeCount = st.badges.filter(Boolean).length;
  const currentCap = GYM_CAPS[Math.min(badgeCount, GYM_CAPS.length - 1)];
  const capLevel = currentCap?.level || 13;

  const p1Alive = st.p1.encounters.filter(e => e.status === "team" || e.status === "box").length;
  const p2Alive = st.p2.encounters.filter(e => e.status === "team" || e.status === "box").length;
  const p1Pending = st.p1.encounters.filter(e => e.status === "pending").length;
  const p2Pending = st.p2.encounters.filter(e => e.status === "pending").length;
  const totalFinishedEnc = st.p1.encounters.filter(e => e.status !== "pending").length
    + st.p2.encounters.filter(e => e.status !== "pending").length;
  const totalEnc = st.p1.encounters.length + st.p2.encounters.length;
  const runEnded = totalFinishedEnc > 0 && p1Alive === 0 && p2Alive === 0 && p1Pending === 0 && p2Pending === 0;

  // Helper
  function notCaughtStatuses() { return ["missed", "fled", "ko"]; }

  // Encounter starten – nutzt Push-Key statt nextId
  function startEnc(pk, location) {
    const encData = {
      route: location.name, locationType: location.type,
      speciesId: null, name: "", slug: null,
      nickname: "", level: null, status: "pending",
    };
    // Push-Key von Firebase generieren
    const encRef = ref(db, `rooms/default/${pk}/encounters`);
    const newRef = push(encRef);
    const key = newRef.key;
    set(newRef, encData);

    // Lokalen State sofort updaten (optimistisch)
    const newEnc = { ...encData, id: key };
    const newSt = {
      ...st,
      [pk]: { ...st[pk], encounters: [...st[pk].encounters, newEnc] },
    };
    writeState(newSt);
    return key;
  }

  // Encounter abschliessen
  function finishEnc(pk, encId, data) {
    const ok = pk === "p1" ? "p2" : "p1";
    const enc = st[pk].encounters.find(e => e.id === encId);
    if (!enc) return;

    const teamFull = st[pk].encounters.filter(e => e.status === "team").length >= 6;
    const finalStatus = data.outcome === "caught" ? (teamFull ? "box" : "team") : data.outcome;
    const wasNotCaught = notCaughtStatuses().includes(finalStatus);

    const updatedEnc = {
      ...enc,
      speciesId: data.species?.id || null,
      name: data.species?.name || "",
      slug: data.species?.slug || null,
      nickname: data.nick || "",
      level: data.level,
      status: finalStatus,
    };

    // Partner suchen
    const partner = st[ok].encounters.find(e =>
      e.route === enc.route && e.status !== "pending" &&
      !st.links.find(l => l.p1Id === e.id || l.p2Id === e.id)
    );
    const newLink = partner
      ? (pk === "p1" ? { p1Id: encId, p2Id: partner.id } : { p1Id: partner.id, p2Id: encId })
      : null;

    let ns = {
      ...st,
      [pk]: { ...st[pk],
        encounters: st[pk].encounters.map(e => e.id === encId ? updatedEnc : e) },
      links: newLink ? [...st.links, { ...newLink, id: `link_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` }] : st.links,
    };

    // K.O. zählt als Tod
    if (finalStatus === "ko") {
      ns[pk] = { ...ns[pk], totalDeaths: (ns[pk].totalDeaths || 0) + 1 };
    }

    // Soul-Link-Effekte
    if (partner) {
      if (wasNotCaught && (partner.status === "team" || partner.status === "box")) {
        ns[ok] = { ...ns[ok],
          encounters: ns[ok].encounters.map(e => e.id === partner.id ? { ...e, status: "burned" } : e) };
      }
      if ((finalStatus === "team" || finalStatus === "box") && notCaughtStatuses().includes(partner.status)) {
        ns[pk] = { ...ns[pk],
          encounters: ns[pk].encounters.map(e => e.id === encId ? { ...e, status: "burned" } : e) };
      }
    }

    writeState(ns);
  }

  // Pending abbrechen
  function cancelPending(pk, encId) {
    writeState({
      ...st,
      [pk]: { ...st[pk], encounters: st[pk].encounters.filter(e => e.id !== encId) },
    });
  }

  function setStatus(pk, encId, status) {
    const ok = pk === "p1" ? "p2" : "p1";
    if (status === "team") {
      const enc = st[pk].encounters.find(e => e.id === encId);
      if (enc && enc.status !== "team") {
        const teamSize = st[pk].encounters.filter(e => e.status === "team").length;
        if (teamSize >= 6) {
          alert("⚠ Das Team ist voll (6/6)! Setze zuerst ein Pokémon in die Box.");
          return;
        }
      }
    }

    const enc = st[pk].encounters.find(e => e.id === encId);
    const wasNotDead = enc && enc.status !== "dead";
    let ns = { ...st, [pk]: { ...st[pk],
      encounters: st[pk].encounters.map(e => e.id === encId ? { ...e, status } : e) } };
    if (status === "dead" && wasNotDead) {
      ns[pk] = { ...ns[pk], totalDeaths: (ns[pk].totalDeaths || 0) + 1 };
    }
    const link = st.links.find(l => (pk === "p1" ? l.p1Id : l.p2Id) === encId);
    if (link) {
      const pid = pk === "p1" ? link.p2Id : link.p1Id;
      const partnerEnc = st[ok].encounters.find(e => e.id === pid);
      if (status === "dead" && partnerEnc && partnerEnc.status !== "dead") {
        ns[ok] = { ...ns[ok],
          encounters: ns[ok].encounters.map(e => e.id === pid ? { ...e, status: "dead" } : e),
          totalDeaths: (ns[ok].totalDeaths || 0) + 1 };
      } else if (status === "box") {
        ns[ok] = { ...ns[ok], encounters: ns[ok].encounters.map(e =>
          e.id === pid && e.status === "team" ? { ...e, status: "box" } : e) };
      } else if (status === "team") {
        const partnerTeamSize = ns[ok].encounters.filter(e => e.status === "team").length;
        if (partnerTeamSize < 6) {
          ns[ok] = { ...ns[ok], encounters: ns[ok].encounters.map(e =>
            e.id === pid && e.status === "box" ? { ...e, status: "team" } : e) };
        }
      }
    }
    writeState(ns);
  }

  function delEnc(pk, encId) {
    writeState({
      ...st,
      [pk]: { ...st[pk], encounters: st[pk].encounters.filter(e => e.id !== encId) },
      links: st.links.filter(l => l.p1Id !== encId && l.p2Id !== encId),
    });
  }

  function startNewRun() {
    writeState({
      ...st,
      p1: { ...st.p1, encounters: [] },
      p2: { ...st.p2, encounters: [] },
      badges: Array(8).fill(false),
      links: [],
      runNumber: st.runNumber + 1,
      runEndedShown: false,
    });
    setShowRunEnd(false);
  }

  function adjustDeaths(pk, delta) {
    writeState({
      ...st,
      [pk]: { ...st[pk], totalDeaths: Math.max(0, (st[pk].totalDeaths || 0) + delta) },
    });
  }

  function resetDeaths(pk) {
    if (window.confirm(`Tode-Zähler für ${st[pk].name} wirklich zurücksetzen?`))
      writeState({ ...st, [pk]: { ...st[pk], totalDeaths: 0 } });
  }

  function getLinkStatus(pk, enc) {
    const ok = pk === "p1" ? "p2" : "p1";
    const hasLink = !!st.links.find(l => (pk === "p1" ? l.p1Id : l.p2Id) === enc.id);
    if (hasLink) return "linked";
    const partnerHas = st[ok].encounters.find(e => e.route === enc.route && e.status !== "pending");
    if (partnerHas) return "unlinked";
    return null;
  }

  const teamCount = k => st[k].encounters.filter(e => e.status === "team").length;
  const teamOnly = k => st[k].encounters.filter(e => e.status === "team");
  const boxOnly = k => st[k].encounters.filter(e => e.status === "box");
  const grave = k => st[k].encounters.filter(e => ["dead", "burned", "missed", "fled", "ko"].includes(e.status));
  const routesDone = new Set([...st.p1.encounters.map(e => e.route), ...st.p2.encounters.map(e => e.route)]).size;

  const SIDES = [{ k: "p1", acc: C.p1 }, { k: "p2", acc: C.p2 }];

  // Custom Locations (aus Firebase kommen sie als Array mit id-Feld)
  const customLocs = st.customLocations || [];

  // ============================================================
  // Render
  // ============================================================

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: "100vh", background: C.bg }}>
        <header style={{ position: "sticky", top: 0, zIndex: 100,
          background: `${C.panel}f4`, backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", height: 50, padding: "0 16px", gap: 4 }}>
          <div style={{ paddingRight: 16, borderRight: `1px solid ${C.border}`, marginRight: 4 }}>
            <span style={{ fontWeight: 900, fontSize: 17, letterSpacing: -.5 }}>
              <span style={{ color: C.p1 }}>Soul</span><span style={{ color: C.p2 }}>Link</span>
            </span>
            <span className="mono" style={{ fontSize: 9, color: C.dim, marginLeft: 6 }}>Schwarz 2</span>
          </div>
          {[{ k: "tracker", l: "Tracker" }, { k: "box", l: "Box / Grab" }, { k: "links", l: "Soul Links" }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "0 12px", height: "100%", fontWeight: 600, fontSize: 12,
              color: tab === t.k ? C.text : C.dim,
              borderBottom: `2px solid ${tab === t.k ? C.p1 : "transparent"}` }}>{t.l}</button>
          ))}
          <div style={{ flex: 1 }} />

          {/* Connection-Indikator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%",
              background: connected ? C.ok : C.dead,
              boxShadow: `0 0 6px ${connected ? C.ok : C.dead}` }} />
            <span className="mono" style={{ fontSize: 9, color: connected ? C.ok : C.dead }}>
              {connected ? "LIVE" : "···"}
            </span>
          </div>

          {/* Spieler-Anzeige */}
          <div style={{ padding: "4px 10px", borderRadius: 6, marginRight: 8,
            background: `${playerKey === "p1" ? C.p1 : C.p2}14`,
            border: `1px solid ${playerKey === "p1" ? C.p1 : C.p2}33` }}>
            <span className="mono" style={{ fontSize: 10, color: playerKey === "p1" ? C.p1 : C.p2 }}>
              {st[playerKey]?.name || (playerKey === "p1" ? "Spieler 1" : "Spieler 2")}
            </span>
          </div>

          <button onClick={() => setShowStats(true)}
            style={{ padding: "4px 12px", borderRadius: 6,
              background: `${C.link}14`, border: `1px solid ${C.link}33`,
              color: C.link, fontSize: 11, fontWeight: 600, cursor: "pointer", marginRight: 8,
              display: "flex", alignItems: "center", gap: 6 }}>
            <span>↻</span><span className="mono">Run #{st.runNumber}</span>
          </button>
          <span className="mono" style={{ fontSize: 10, color: C.sub, marginRight: 12 }}>{routesDone} Orte</span>
          <div style={{ padding: "4px 12px", borderRadius: 6,
            background: `${C.p1}14`, border: `1px solid ${C.p1}33` }}>
            <span className="mono" style={{ fontSize: 10, color: C.p1 }}>
              CAP · LV {capLevel} · {currentCap?.name}
            </span>
          </div>
        </header>

        <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`,
          padding: "8px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {GYM_CAPS.map((c, i) => {
              const earned = st.badges[i];
              const isCurr = i === badgeCount;
              return (
                <button key={i} onClick={() => {
                  const b = [...st.badges]; b[i] = !b[i];
                  writeState({ ...st, badges: b });
                }} title={`${c.badge} · Cap Lv ${c.level}`}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%",
                    background: earned ? BADGE_COLORS[i] + "cc" : "transparent",
                    border: `2px solid ${earned ? BADGE_COLORS[i] : isCurr ? C.p1 : C.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
                    boxShadow: earned ? `0 0 10px ${BADGE_COLORS[i]}77` : isCurr ? `0 0 8px ${C.p1}44` : "none" }}>
                    {earned ? "★" : isCurr ? "◎" : "○"}
                  </div>
                  <span className="mono" style={{ fontSize: 7,
                    color: earned ? BADGE_COLORS[i] : isCurr ? C.p1 : C.dim }}>
                    {c.badge.replace("-Orden", "")}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ width: 1, height: 36, background: C.border }} />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="mono" style={{ fontSize: 10, color: C.sub }}>Cap:</span>
            <span style={{ fontWeight: 700, fontSize: 13, color: C.p1 }}>≤ {capLevel}</span>
            <span className="mono" style={{ fontSize: 10, color: C.sub }}>· andere ≤ {capLevel - 2}</span>
          </div>
        </div>

        <main style={{ maxWidth: 1000, margin: "0 auto", padding: "18px 16px" }}>
          {tab === "tracker" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
              {SIDES.map(({ k, acc }) => {
                const team = teamOnly(k);
                const pending = st[k].encounters.filter(e => e.status === "pending");
                return (
                  <div key={k} style={{ background: C.panel, border: `1px solid ${C.border}`,
                    borderTop: `2px solid ${acc}`, borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`,
                      display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: acc, boxShadow: `0 0 6px ${acc}` }} />
                      {editName === k ? (
                        <input autoFocus defaultValue={st[k].name}
                          style={{ fontSize: 14, fontWeight: 700, padding: "2px 8px", width: 160 }}
                          onBlur={e => { writeState({ ...st, [k]: { ...st[k], name: e.target.value || st[k].name } }); setEditName(null) }}
                          onKeyDown={e => e.key === "Enter" && e.target.blur()} />
                      ) : (
                        <span onClick={() => setEditName(k)}
                          style={{ fontWeight: 700, fontSize: 14, cursor: "text" }}>{st[k].name}</span>
                      )}
                      <div style={{ flex: 1 }} />
                      <span className="mono" style={{ fontSize: 11, color: C.sub }}>
                        Team {team.length}/6
                      </span>
                    </div>

                    {pending.length > 0 && (
                      <div style={{ background: `${C.warn}0a`, borderBottom: `1px solid ${C.warn}33`,
                        padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                        <div className="mono" style={{ fontSize: 9, color: C.warn, letterSpacing: 1 }}>
                          OFFENE ENCOUNTER · {pending.length}
                        </div>
                        {pending.map(enc => (
                          <div key={enc.id} className="fade" style={{
                            display: "flex", alignItems: "center", gap: 8,
                            background: C.card, border: `1px solid ${C.warn}33`,
                            borderLeft: `3px solid ${C.warn}`,
                            borderRadius: 7, padding: "7px 10px" }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%",
                              background: C.warn, animation: "pulse 1.5s ease infinite" }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: C.text,
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {enc.locationType === "static" ? "⭐ " : enc.locationType === "gift" ? "🎁 " : ""}
                                {enc.route}
                              </div>
                              <div className="mono" style={{ fontSize: 9, color: C.sub }}>läuft – warte auf Abschluss</div>
                            </div>
                            <button onClick={() => setModal({ player: k, mode: "finish", encId: enc.id })}
                              style={{ padding: "4px 10px", borderRadius: 5, cursor: "pointer",
                                background: `${acc}22`, border: `1px solid ${acc}55`,
                                color: acc, fontWeight: 700, fontSize: 10 }}>
                              Abschliessen
                            </button>
                            <button onClick={() => {
                              if (window.confirm(`Encounter auf „${enc.route}" abbrechen? Die Route wird wieder freigegeben.`))
                                cancelPending(k, enc.id);
                            }} style={{ padding: "4px 8px", borderRadius: 5, cursor: "pointer",
                              background: "transparent", border: `1px solid ${C.border}`,
                              color: C.dim, fontSize: 10 }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 5, minHeight: 80 }}>
                      {team.length === 0 ? (
                        <div style={{ border: `1px dashed ${C.border}`, borderRadius: 8,
                          padding: "18px 0", textAlign: "center", fontSize: 12, color: C.dim }}>
                          Noch keine Pokémon im Team
                        </div>
                      ) : team.map(enc => (
                        <EncCard key={enc.id} enc={enc} player={k}
                          linkStatus={getLinkStatus(k, enc)} cap={capLevel}
                          onStatus={s => setStatus(k, enc.id, s)}
                          onDelete={() => delEnc(k, enc.id)} />
                      ))}
                    </div>
                    <div style={{ padding: "7px 14px", borderTop: `1px solid ${C.border}`,
                      display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="mono" style={{ fontSize: 10, color: C.ok }}>Team {team.length}</span>
                      <span className="mono" style={{ fontSize: 10, color: C.p1 }}>Box {boxOnly(k).length}</span>
                      <span className="mono" style={{ fontSize: 10, color: C.dead }}>Grab {grave(k).length}</span>
                      <span className="mono" style={{ fontSize: 10, color: C.dead + "aa" }}>† {st[k].totalDeaths || 0}</span>
                      <div style={{ flex: 1 }} />
                      <button onClick={() => setModal({ player: k, mode: "start" })} style={{
                        padding: "4px 12px", borderRadius: 6, cursor: "pointer",
                        background: `${acc}18`, border: `1px solid ${acc}44`,
                        color: acc, fontWeight: 700, fontSize: 11 }}
                        onMouseEnter={e => e.currentTarget.style.background = `${acc}28`}
                        onMouseLeave={e => e.currentTarget.style.background = `${acc}18`}>
                        + Encounter
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "box" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <div className="mono" style={{ fontSize: 10, color: C.sub, letterSpacing: 2, marginBottom: 10 }}>
                  BOX – AKTIV ABER NICHT IM TEAM
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {SIDES.map(({ k, acc }) => (
                    <div key={k} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: acc }}>{st[k].name}</span>
                        <span className="mono" style={{ fontSize: 11, color: C.sub, marginLeft: 8 }}>{boxOnly(k).length} in Box</span>
                      </div>
                      <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
                        {boxOnly(k).length === 0 ? (
                          <div style={{ color: C.dim, fontSize: 12, padding: "12px 0", textAlign: "center" }}>Box leer</div>
                        ) : boxOnly(k).map(enc => (
                          <EncCard key={enc.id} enc={enc} player={k}
                            linkStatus={getLinkStatus(k, enc)} cap={capLevel}
                            onStatus={s => setStatus(k, enc.id, s)}
                            onDelete={() => delEnc(k, enc.id)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mono" style={{ fontSize: 10, color: C.sub, letterSpacing: 2, marginBottom: 10 }}>
                  GRAB – GEFALLEN / VERBRANNT / NICHT GEFANGEN
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {SIDES.map(({ k, acc }) => (
                    <div key={k} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: acc }}>{st[k].name}</span>
                        <span className="mono" style={{ fontSize: 11, color: C.sub, marginLeft: 8 }}>{grave(k).length} Einträge</span>
                      </div>
                      <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                        {grave(k).length === 0 ? (
                          <div style={{ color: C.dim, fontSize: 12, padding: "12px 0", textAlign: "center" }}>Noch niemand gefallen ✨</div>
                        ) : grave(k).map(enc => {
                          const sc = enc.status === "dead" || enc.status === "ko" ? C.dead : enc.status === "burned" ? C.warn : C.dim;
                          const sl = enc.status === "dead" ? "⚔ Gefallen"
                            : enc.status === "ko" ? "⚔ K.O."
                            : enc.status === "burned" ? "🔥 Verbrannt"
                            : enc.status === "fled" ? "💨 Weggerannt"
                            : "✗ Nicht gefangen";
                          return (
                            <div key={enc.id} style={{ display: "flex", alignItems: "center", gap: 8,
                              background: C.card, border: `1px solid ${C.border}`,
                              borderLeft: `3px solid ${sc}`,
                              borderRadius: 7, padding: "7px 10px", opacity: .65 }}>
                              <Sprite slug={enc.slug} size={36} dead />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 12,
                                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {enc.nickname || enc.name || "Unbekannt"}
                                </div>
                                <div className="mono" style={{ fontSize: 9, color: C.dim }}>{enc.route}</div>
                              </div>
                              <span className="mono" style={{ fontSize: 9, color: sc, flexShrink: 0 }}>{sl}</span>
                              {enc.level && <span className="mono" style={{ fontSize: 9, color: C.dim, flexShrink: 0 }}>Lv {enc.level}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "links" && (
            <div>
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div className="mono" style={{ fontSize: 10, color: C.sub, marginBottom: 12 }}>AKTIVE TEAMS</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {SIDES.map(({ k, acc }) => (
                    <div key={k}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: acc, marginBottom: 8 }}>{st[k].name}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {teamOnly(k).length === 0
                          ? <span className="mono" style={{ fontSize: 10, color: C.dim }}>Leer</span>
                          : teamOnly(k).map(enc => (
                            <div key={enc.id} title={enc.nickname || enc.name} style={{
                              background: C.lift, borderRadius: 6, padding: 5, border: `1px solid ${C.border}`,
                              display: "flex", flexDirection: "column", alignItems: "center" }}>
                              <Sprite slug={enc.slug} size={40} />
                              <div className="mono" style={{ fontSize: 8, color: C.sub, textAlign: "center", marginTop: 2, maxWidth: 60,
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {enc.nickname || enc.name || "?"}
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mono" style={{ fontSize: 10, color: C.sub, marginBottom: 10 }}>
                SOUL-LINK PAARE · {st.links.length}
              </div>
              {st.links.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: C.dim, fontSize: 13 }}>
                  Noch keine Links — gleiche Route bei beiden Spielern eintragen
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {st.links.map((link, i) => {
                    const e1 = st.p1.encounters.find(e => e.id === link.p1Id);
                    const e2 = st.p2.encounters.find(e => e.id === link.p2Id);
                    if (!e1 || !e2) return null;
                    const bothDead = e1.status === "dead" && e2.status === "dead";
                    return (
                      <div key={link.id || i} className="fade" style={{
                        display: "grid", gridTemplateColumns: "1fr 26px 1fr",
                        alignItems: "center", gap: 10,
                        background: bothDead ? `${C.dead}08` : C.panel,
                        border: `1px solid ${bothDead ? C.dead + "33" : C.border}`,
                        borderRadius: 8, padding: "10px 14px", opacity: bothDead ? .45 : 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Sprite slug={e1.slug} size={40} dead={e1.status === "dead"} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13,
                              color: e1.status === "dead" ? C.dim : C.p1 }}>
                              {e1.nickname || e1.name || "Unbekannt"}
                            </div>
                            <div className="mono" style={{ fontSize: 10, color: C.sub }}>{st.p1.name}</div>
                            <div className="mono" style={{ fontSize: 9, color: C.dim }}>{e1.route}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: "center", color: bothDead ? C.dead : C.link, fontSize: 16,
                          animation: bothDead ? "none" : "pulse 3s ease infinite" }}>⬡</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexDirection: "row-reverse" }}>
                          <Sprite slug={e2.slug} size={40} dead={e2.status === "dead"} />
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 700, fontSize: 13,
                              color: e2.status === "dead" ? C.dim : C.p2 }}>
                              {e2.nickname || e2.name || "Unbekannt"}
                            </div>
                            <div className="mono" style={{ fontSize: 10, color: C.sub }}>{st.p2.name}</div>
                            <div className="mono" style={{ fontSize: 9, color: C.dim }}>{e2.route}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>

        {modal && (() => {
          const pk = modal.player;
          const pendingEnc = modal.mode === "finish"
            ? st[pk].encounters.find(e => e.id === modal.encId)
            : null;
          if (modal.mode === "finish" && !pendingEnc) { return null; }
          return (
            <EncModal mode={modal.mode} pendingEnc={pendingEnc}
              pokemonList={pokemonList} player={pk}
              customLocations={customLocs}
              usedRoutes={st[pk].encounters.map(e => e.route)}
              allEnc={allEnc}
              partnerEncs={pk === "p1" ? st.p2.encounters : st.p1.encounters}
              onClose={() => setModal(null)}
              onAddCustomLocation={loc => {
                const newCustom = { ...loc, id: `cl_${Date.now()}` };
                writeState({ ...st, customLocations: [...customLocs, newCustom] });
              }}
              onStart={loc => {
                const newId = startEnc(pk, loc);
                setModal({ player: pk, mode: "finish", encId: newId });
              }}
              onFinish={data => {
                finishEnc(pk, modal.encId, data);
                setModal(null);
              }} />
          );
        })()}

        {showRunEnd && (
          <RunEndModal onContinue={() => setShowRunEnd(false)} onNewRun={startNewRun} />
        )}

        {showStats && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.88)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, backdropFilter: "blur(8px)", padding: 16 }}
            onClick={() => setShowStats(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              background: C.panel, border: `1px solid ${C.border}`,
              borderRadius: 14, padding: 24, width: 460, maxWidth: "100%",
              boxShadow: "0 16px 48px #000c" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <span style={{ fontWeight: 900, fontSize: 16 }}>Statistiken & Run</span>
                <button onClick={() => setShowStats(false)} style={{ marginLeft: "auto",
                  background: "none", border: "none", cursor: "pointer", color: C.dim, fontSize: 22, lineHeight: 1 }}>×</button>
              </div>
              <div style={{ background: C.lift, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
                <div className="mono" style={{ fontSize: 10, color: C.sub, marginBottom: 6 }}>AKTUELLER RUN</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: 900, fontSize: 24, color: C.link }}>#{st.runNumber}</span>
                  <span className="mono" style={{ fontSize: 11, color: C.sub }}>
                    {totalEnc} Encounter · {p1Alive + p2Alive} aktiv
                  </span>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => {
                    if (window.confirm(`Neuen Run starten? Encounter, Orden und Soul-Links werden zurückgesetzt. Tode-Statistiken bleiben erhalten.`))
                      startNewRun();
                  }} style={{ padding: "6px 12px", borderRadius: 7, cursor: "pointer",
                    background: `${C.warn}18`, border: `1px solid ${C.warn}55`,
                    color: C.warn, fontWeight: 600, fontSize: 11 }}>
                    ↻ Neustart
                  </button>
                </div>
              </div>
              <div className="mono" style={{ fontSize: 10, color: C.sub, marginBottom: 8 }}>
                TODE INSGESAMT (RUN-ÜBERGREIFEND)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {SIDES.map(({ k, acc }) => (
                  <div key={k} style={{ background: C.lift, border: `1px solid ${C.border}`,
                    borderLeft: `3px solid ${acc}`, borderRadius: 8, padding: "10px 14px",
                    display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: acc, minWidth: 80 }}>{st[k].name}</span>
                    <button onClick={() => adjustDeaths(k, -1)} style={{
                      width: 26, height: 26, borderRadius: 6, cursor: "pointer",
                      background: C.card, border: `1px solid ${C.border}`,
                      color: C.sub, fontSize: 14, fontWeight: 700 }}>−</button>
                    <span style={{ fontWeight: 900, fontSize: 22, color: C.dead, minWidth: 40, textAlign: "center" }}>
                      {st[k].totalDeaths || 0}
                    </span>
                    <button onClick={() => adjustDeaths(k, 1)} style={{
                      width: 26, height: 26, borderRadius: 6, cursor: "pointer",
                      background: C.card, border: `1px solid ${C.border}`,
                      color: C.sub, fontSize: 14, fontWeight: 700 }}>+</button>
                    <div style={{ flex: 1 }} />
                    <button onClick={() => resetDeaths(k)} style={{
                      padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                      background: "transparent", border: `1px solid ${C.border}`,
                      color: C.sub, fontSize: 10, fontWeight: 600 }}>reset</button>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: C.dim, marginTop: 12, lineHeight: 1.5 }}>
                Der Tode-Zähler wird automatisch erhöht wenn ein Pokémon auf „Gefallen" gesetzt wird. Manuelle Korrektur über +/− möglich.
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

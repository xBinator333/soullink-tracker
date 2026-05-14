import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { ref, push, set } from "firebase/database";
import { db } from "./firebase.js";
import { LOCATIONS, GYM_CAPS, ELITE_CAPS, ALL_CAPS, getEvoChain, C } from "./data.js";
import { fetchGermanPokemonNames, calcCatchRate, catchRateColor } from "./pokemon.js";
import { useFirebaseSync } from "./useFirebaseSync.js";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700;800;900&family=Share+Tech+Mono&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:${C.bg};color:${C.text};font-family:'Exo 2',sans-serif;
    -webkit-font-smoothing:antialiased;letter-spacing:-0.01em}
  ::-webkit-scrollbar{width:6px;height:6px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:${C.border};border-radius:6px}
  ::-webkit-scrollbar-thumb:hover{background:${C.borderHi}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
  @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
  @keyframes glow{0%,100%{box-shadow:0 0 0 3px ${C.p1}33,0 0 14px ${C.p1}55,inset 0 1px 0 ${C.p1}33}50%{box-shadow:0 0 0 4px ${C.p1}66,0 0 24px ${C.p1}99,inset 0 1px 0 ${C.p1}55}}
  @keyframes glowWarn{0%,100%{box-shadow:0 0 0 2px ${C.warn}22,0 0 10px ${C.warn}44}50%{box-shadow:0 0 0 3px ${C.warn}44,0 0 18px ${C.warn}77}}
  .fade{animation:fadeIn .18s ease forwards}
  .mono{font-family:'Share Tech Mono',monospace}
  input{background:${C.lift};border:1px solid ${C.border};border-radius:9px;
    padding:9px 13px;color:${C.text};font-family:'Exo 2',sans-serif;font-size:14px;
    outline:none;transition:border-color .15s, box-shadow .15s;width:100%}
  input:focus{border-color:${C.p1}88;box-shadow:0 0 0 3px ${C.p1}22}
  input::placeholder{color:${C.dim}}
  button{font-family:'Exo 2',sans-serif}
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

function EncCard({ enc, player, linkStatus, cap, onStatus, onDelete, onRevive }) {
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
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {gone && onRevive && (
            <button onClick={onRevive} style={{
              fontFamily: "'Exo 2',sans-serif", fontWeight: 700, fontSize: 9,
              padding: "2px 8px", borderRadius: 4, cursor: "pointer",
              border: `1px solid ${C.ok}66`,
              background: `${C.ok}18`,
              color: C.ok }}>↺ Zurückholen</button>
          )}
          {!gone && [
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

// Grosse Team-Karte für den Tracker – prominenter Sprite, später aufklappbar für Details
function TeamCard({ enc, player, linkStatus, cap, onStatus, onDelete, partnerEnc }) {
  const [expanded, setExpanded] = useState(false);
  const acc = player === "p1" ? C.p1 : C.p2;
  const isOver = enc.level && cap && enc.level > cap;
  const linked = linkStatus === "linked";

  return (
    <div className="fade" style={{
      background: isOver ? `${C.warn}08` : `linear-gradient(135deg, ${C.card} 0%, ${acc}06 100%)`,
      border: `1px solid ${isOver ? C.warn + "44" : acc + "33"}`,
      borderRadius: 12,
      padding: 12,
      position: "relative",
      transition: "all .2s",
      cursor: "pointer",
      boxShadow: linked ? `0 0 0 1px ${C.link}22, 0 4px 16px #0006` : "0 4px 16px #0006",
    }}
      onClick={() => setExpanded(!expanded)}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>

      {/* Soul-Link Indikator oben rechts */}
      {linkStatus && (
        <div style={{ position: "absolute", top: 6, right: 6,
          display: "flex", alignItems: "center", gap: 4,
          background: linked ? `${C.link}22` : `${C.warn}22`,
          border: `1px solid ${linked ? C.link : C.warn}55`,
          borderRadius: 5, padding: "2px 7px",
          zIndex: 2 }}>
          <span style={{ fontSize: 11, color: linked ? C.link : C.warn,
            animation: linked ? "pulse 2.5s ease infinite" : "none" }}>⬡</span>
          <span className="mono" style={{ fontSize: 8, color: linked ? C.link : C.warn, fontWeight: 700 }}>
            {linked ? "LINK" : "OFFEN"}
          </span>
        </div>
      )}

      {/* Hauptbereich: Grosser Sprite + Infos */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          background: `radial-gradient(circle, ${acc}14 0%, transparent 70%)`,
          padding: 4, borderRadius: 12, flexShrink: 0 }}>
          <Sprite slug={enc.slug} size={84} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: C.text,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            marginBottom: 2 }}>
            {enc.nickname || enc.name || "Unbekannt"}
          </div>
          {enc.nickname && enc.name && (
            <div className="mono" style={{ fontSize: 10, color: C.sub, marginBottom: 4 }}>
              {enc.name}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {enc.level && (
              <span className="mono" style={{ fontSize: 13, fontWeight: 700,
                color: isOver ? C.warn : enc.level === cap ? C.gold : acc }}>
                Lv {enc.level}{isOver ? " ⚠" : ""}
              </span>
            )}
            <span className="mono" style={{ fontSize: 9, color: C.dim,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {enc.locationType === "static" ? "⭐ " : enc.locationType === "gift" ? "🎁 " : ""}
              {enc.route}
            </span>
          </div>
        </div>
      </div>

      {isOver && (
        <div style={{ fontSize: 10, color: C.warn, marginTop: 8,
          background: `${C.warn}15`, borderRadius: 4, padding: "3px 8px" }}>
          Überlevelt – muss in Box (Cap: {cap})
        </div>
      )}

      {/* Aufklappbarer Detailbereich + Aktionen */}
      {expanded && (
        <div className="fade" style={{ marginTop: 10, paddingTop: 10,
          borderTop: `1px solid ${C.border}` }}
          onClick={e => e.stopPropagation()}>
          {linked && partnerEnc && (
            <div style={{ display: "flex", alignItems: "center", gap: 8,
              padding: 8, background: `${C.link}0a`, borderRadius: 7,
              border: `1px solid ${C.link}33`, marginBottom: 10 }}>
              <Sprite slug={partnerEnc.slug} size={36} dead={partnerEnc.status === "dead"} />
              <div style={{ minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 9, color: C.link, marginBottom: 2 }}>SOUL-LINK</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {partnerEnc.nickname || partnerEnc.name || "Unbekannt"}
                </div>
              </div>
            </div>
          )}
          <div style={{ fontSize: 10, color: C.dim, marginBottom: 10, fontStyle: "italic" }}>
            Detailinfos (Attacken, Stats) folgen sobald Lua-Anbindung aktiv ist
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => onStatus("box")} style={{
              fontFamily: "'Exo 2',sans-serif", fontWeight: 600, fontSize: 10,
              padding: "4px 10px", borderRadius: 5, cursor: "pointer",
              border: `1px solid ${C.p1}55`, background: `${C.p1}18`, color: C.p1 }}>
              → Box
            </button>
            <button onClick={() => onStatus("dead")} style={{
              fontFamily: "'Exo 2',sans-serif", fontWeight: 600, fontSize: 10,
              padding: "4px 10px", borderRadius: 5, cursor: "pointer",
              border: `1px solid ${C.dead}55`, background: `${C.dead}18`, color: C.dead }}>
              † Gefallen
            </button>
            <div style={{ flex: 1 }} />
            <button onClick={() => {
              if (window.confirm(`„${enc.nickname || enc.name}" wirklich entfernen?`))
                onDelete();
            }} style={{
              fontFamily: "'Exo 2',sans-serif", fontSize: 10,
              padding: "4px 10px", borderRadius: 5, cursor: "pointer",
              border: `1px solid ${C.border}`, background: "transparent", color: C.sub }}>
              Entfernen
            </button>
          </div>
        </div>
      )}
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

            {/* Fangrate-Anzeige */}
            {species?.catchRate != null && (
              <div className="fade" style={{
                background: C.lift, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: "10px 14px" }}>
                <div className="mono" style={{ fontSize: 9, color: C.sub, marginBottom: 8, letterSpacing: 1 }}>
                  FANGRATE BEI 100% HP
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Normball", multi: 1,   sprite: "https://raw.githubusercontent.com/msikma/pokesprite/master/items/ball/poke.png" },
                    { label: "Superball", multi: 1.5, sprite: "https://raw.githubusercontent.com/msikma/pokesprite/master/items/ball/great.png" },
                    { label: "Hyperball", multi: 2,   sprite: "https://raw.githubusercontent.com/msikma/pokesprite/master/items/ball/ultra.png" },
                  ].map(ball => {
                    const pct = calcCatchRate(species.catchRate, ball.multi);
                    const col = catchRateColor(pct);
                    return (
                      <div key={ball.label} style={{
                        textAlign: "center", padding: "8px 4px",
                        background: `${col}12`, borderRadius: 7,
                        border: `1px solid ${col}44` }}>
                        <img src={ball.sprite} alt={ball.label}
                          style={{ width: 32, height: 32, imageRendering: "pixelated", marginBottom: 4 }} />
                        <div style={{ fontWeight: 900, fontSize: 16, color: col }}>{pct}%</div>
                        <div className="mono" style={{ fontSize: 8, color: C.sub, marginTop: 2 }}>{ball.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
  // Falls noch alter "links"-Tab aktiv ist (z.B. nach Update), zurück auf tracker
  useEffect(() => { if (tab === "links") setTab("tracker"); }, [tab]);
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
  const rivalsDone = st.rivalsDone || {};
  const elitesDone = st.elitesDone || {};

  // Aktiver Cap = nächster noch nicht erledigter Eintrag in ALL_CAPS
  const nextCapIdx = ALL_CAPS.findIndex(c => {
    if (c.type === "gym") return !st.badges[c.badgeIdx];
    if (c.type === "rival") return !rivalsDone[c.rivalKey];
    if (c.type === "elite" || c.type === "champ") return !elitesDone[c.eliteIdx];
    return false;
  });
  const currentCapEntry = nextCapIdx >= 0 ? ALL_CAPS[nextCapIdx] : ALL_CAPS[ALL_CAPS.length - 1];
  const capLevel = currentCapEntry.level;
  const currentCap = currentCapEntry;

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
  // WICHTIG: Gefangene Pokémon gehen IMMER in die Box. Der Spieler entscheidet
  // manuell welche 6 ins Team gehören.
  function finishEnc(pk, encId, data) {
    const ok = pk === "p1" ? "p2" : "p1";
    const enc = st[pk].encounters.find(e => e.id === encId);
    if (!enc) return;

    // Gefangen → immer in die Box, K.O./Fled → entsprechender Grab-Status
    const finalStatus = data.outcome === "caught" ? "box" : data.outcome;

    const updatedEnc = {
      ...enc,
      speciesId: data.species?.id || null,
      name: data.species?.name || "",
      slug: data.species?.slug || null,
      nickname: data.nick || "",
      level: data.level,
      status: finalStatus,
    };

    // Partner suchen für Soul-Link Erstellung (intern, auch wenn Tab weg ist)
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

    // K.O. zählt als Tod für die Person die ihn meldet
    if (finalStatus === "ko") {
      ns[pk] = { ...ns[pk], totalDeaths: (ns[pk].totalDeaths || 0) + 1 };
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

    // Team-voll-Check
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
    if (!enc) return;

    let ns = {
      ...st,
      [pk]: { ...st[pk],
        encounters: st[pk].encounters.map(e => e.id === encId ? { ...e, status } : e) },
    };

    // Todescounter NUR bei dem Spieler der "Gefallen" klickt
    const wasAlive = enc.status !== "dead" && enc.status !== "ko";
    if ((status === "dead" || status === "ko") && wasAlive) {
      ns[pk] = { ...ns[pk], totalDeaths: (ns[pk].totalDeaths || 0) + 1 };
    }

    // Soul-Link Partner synchron mitbewegen
    const link = st.links.find(l => (pk === "p1" ? l.p1Id : l.p2Id) === encId);
    if (link) {
      const pid = pk === "p1" ? link.p2Id : link.p1Id;
      const partnerEnc = st[ok].encounters.find(e => e.id === pid);
      if (partnerEnc) {
        if (status === "dead" || status === "ko") {
          // Partner geht AUCH ins Grab – aber KEIN Todescounter-Increment
          if (partnerEnc.status !== "dead" && partnerEnc.status !== "ko") {
            ns[ok] = { ...ns[ok],
              encounters: ns[ok].encounters.map(e =>
                e.id === pid ? { ...e, status: "dead" } : e
              ),
            };
          }
        } else if (status === "box" && partnerEnc.status === "team") {
          // Synchron in Box
          ns[ok] = { ...ns[ok],
            encounters: ns[ok].encounters.map(e =>
              e.id === pid ? { ...e, status: "box" } : e
            ),
          };
        } else if (status === "team" && partnerEnc.status === "box") {
          // Synchron ins Team – nur wenn Platz
          const partnerTeamSize = ns[ok].encounters.filter(e => e.status === "team").length;
          if (partnerTeamSize < 6) {
            ns[ok] = { ...ns[ok],
              encounters: ns[ok].encounters.map(e =>
                e.id === pid ? { ...e, status: "team" } : e
              ),
            };
          }
        }
      }
    }

    writeState(ns);
  }

  // Gefallenes/Verlorenes Pokémon zurückholen – ins TEAM (und Partner mit)
  // Falls Team voll: Box als Fallback, mit Hinweis
  function reviveEnc(pk, encId) {
    const enc = st[pk].encounters.find(e => e.id === encId);
    if (!enc) return;
    const wasDead = enc.status === "dead" || enc.status === "ko";
    const ok = pk === "p1" ? "p2" : "p1";

    // Team-Platz prüfen
    const myTeamSize = st[pk].encounters.filter(e => e.status === "team").length;
    const targetStatus = myTeamSize < 6 ? "team" : "box";

    let ns = { ...st, [pk]: { ...st[pk],
      encounters: st[pk].encounters.map(e => e.id === encId ? { ...e, status: targetStatus } : e) } };

    // Todescounter korrigieren
    if (wasDead) {
      ns[pk] = { ...ns[pk], totalDeaths: Math.max(0, (ns[pk].totalDeaths || 0) - 1) };
    }

    // Soul-Link Partner mitnehmen
    const link = st.links.find(l => (pk === "p1" ? l.p1Id : l.p2Id) === encId);
    if (link) {
      const pid = pk === "p1" ? link.p2Id : link.p1Id;
      const partnerEnc = st[ok].encounters.find(e => e.id === pid);
      if (partnerEnc) {
        const partnerWasDead = partnerEnc.status === "dead" || partnerEnc.status === "ko";
        const partnerTeamSize = ns[ok].encounters.filter(e => e.status === "team").length;
        const partnerTarget = partnerTeamSize < 6 && targetStatus === "team" ? "team" : "box";

        ns[ok] = { ...ns[ok],
          encounters: ns[ok].encounters.map(e =>
            e.id === pid ? { ...e, status: partnerTarget } : e
          ),
        };
        // Partner-Counter wird NICHT korrigiert – beim Tod wurde er ja auch nicht erhöht
      }
    }

    writeState(ns);
    if (targetStatus === "box") {
      setTimeout(() => alert("Team war voll – Pokémon ist in der Box gelandet."), 100);
    }
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
          {[{ k: "tracker", l: "Team" }, { k: "box", l: "Box / Grab" }].map(t => (
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
          <span className="mono" style={{ fontSize: 10, color: C.sub }}>{routesDone} Orte</span>
        </header>

        <div style={{ background: `linear-gradient(180deg, ${C.panel} 0%, ${C.bg} 100%)`,
          borderBottom: `1px solid ${C.border}`,
          padding: "14px 20px", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>

          {/* ORDEN (1-8) + Top 4 + Champ – als einfache Boxen mit Haken */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {ALL_CAPS.filter(c => c.type === "gym" || c.type === "elite" || c.type === "champ").map((c, i) => {
              const isGym = c.type === "gym";
              const isChamp = c.type === "champ";
              const done = isGym ? st.badges[c.badgeIdx] : elitesDone[c.eliteIdx];
              const isNext = currentCapEntry === c;
              const isClickable = isNext || done;
              const label = isGym ? (c.badgeIdx + 1) : isChamp ? "♕" : "E";

              return (
                <button key={i}
                  onClick={() => {
                    if (!isClickable) return;
                    if (isGym) {
                      const b = [...st.badges]; b[c.badgeIdx] = !b[c.badgeIdx];
                      writeState({ ...st, badges: b });
                    } else {
                      writeState({ ...st, elitesDone: { ...elitesDone, [c.eliteIdx]: !elitesDone[c.eliteIdx] } });
                    }
                  }}
                  title={`${c.name} · Cap Lv ${c.level}`}
                  style={{ background: "none", border: "none",
                    cursor: isClickable ? "pointer" : "default",
                    padding: 0, transition: "transform .15s",
                    position: "relative" }}
                  onMouseEnter={e => { if (isClickable) e.currentTarget.style.transform = "translateY(-2px)" }}
                  onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: done ? `${C.ok}18` : `${C.lift}88`,
                    border: isNext && !done
                      ? `2px solid ${C.p1}`
                      : done ? `1.5px solid ${C.ok}66`
                      : `1px solid ${C.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: isChamp ? 20 : 16, fontWeight: 800,
                    color: done ? C.ok : isNext ? C.p1 : C.dim,
                    boxShadow: isNext && !done
                      ? `0 0 0 3px ${C.p1}33, 0 0 14px ${C.p1}55`
                      : done ? `0 0 10px ${C.ok}22, 0 2px 6px #0006`
                      : "0 2px 6px #0006",
                    transition: "all .25s",
                    animation: isNext && !done ? "glow 2s ease infinite" : "none" }}>
                    {label}
                  </div>
                  {done && (
                    <div style={{ position: "absolute", top: -4, right: -4,
                      width: 18, height: 18, borderRadius: "50%",
                      background: C.ok, color: C.bg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 900,
                      boxShadow: `0 0 8px ${C.ok}88, 0 2px 4px #0008`,
                      border: `2px solid ${C.bg}` }}>
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ width: 1, height: 48, background: C.border }} />

          {/* RIVALEN – Pill-Tags */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="mono" style={{ fontSize: 10, color: C.sub, letterSpacing: 1.5, fontWeight: 600 }}>
              MATISSE
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {ALL_CAPS.filter(c => c.type === "rival").map((c, i) => {
                const done = rivalsDone[c.rivalKey];
                const isNext = currentCapEntry === c;
                const isClickable = isNext || done;
                return (
                  <button key={i}
                    onClick={() => {
                      if (!isClickable) return;
                      writeState({ ...st, rivalsDone: { ...rivalsDone, [c.rivalKey]: !rivalsDone[c.rivalKey] } });
                    }}
                    title={`${c.name} · Cap Lv ${c.level}`}
                    style={{ background: "none", border: "none",
                      cursor: isClickable ? "pointer" : "default",
                      padding: 0, transition: "transform .15s" }}
                    onMouseEnter={e => { if (isClickable) e.currentTarget.style.transform = "translateY(-1px)" }}
                    onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                    <div style={{
                      padding: "5px 12px", borderRadius: 999,
                      fontSize: 11, fontWeight: 600,
                      background: done ? `${C.ok}18`
                        : isNext ? `${C.warn}14` : `${C.lift}88`,
                      border: done ? `1.5px solid ${C.ok}66`
                        : isNext ? `1.5px solid ${C.warn}`
                        : `1px solid ${C.border}`,
                      color: done ? C.ok : isNext ? C.warn : C.dim,
                      boxShadow: isNext && !done ? `0 0 0 2px ${C.warn}22, 0 0 12px ${C.warn}44`
                        : done ? `0 2px 8px ${C.ok}22` : "none",
                      animation: isNext && !done ? "glowWarn 2s ease infinite" : "none",
                      whiteSpace: "nowrap",
                      display: "flex", alignItems: "center", gap: 4 }}>
                      {done && <span style={{ fontSize: 10 }}>✓</span>}
                      <span>Lv {c.level}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ width: 1, height: 48, background: C.border }} />

          {/* Aktueller Cap */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div className="mono" style={{ fontSize: 10, color: C.sub, letterSpacing: 1.5, fontWeight: 600 }}>
              {currentCap.type === "rival" ? "CAP · RIVALE"
                : currentCap.type === "gym" ? "CAP · ARENA"
                : currentCap.type === "champ" ? "CAP · CHAMP"
                : "CAP · TOP 4"}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 32, color: C.text,
                lineHeight: 1, letterSpacing: -1 }}>
                {capLevel}
              </span>
              <span style={{ fontSize: 14, color: C.dim, fontWeight: 500 }}>/</span>
              <span style={{ fontSize: 18, color: C.sub, fontWeight: 600 }}>
                {capLevel - 2}
              </span>
            </div>
            <div style={{ fontSize: 11, color: C.sub, fontWeight: 500 }}>{currentCap.name}</div>
          </div>
        </div>

        <main style={{ maxWidth: 1000, margin: "0 auto", padding: "18px 16px" }}>
          {tab === "tracker" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
              {SIDES.map(({ k, acc }) => {
                const team = teamOnly(k);
                const pending = st[k].encounters.filter(e => e.status === "pending");
                const ok = k === "p1" ? "p2" : "p1";
                return (
                  <div key={k} style={{ background: `linear-gradient(180deg, ${C.panel} 0%, ${C.bg}cc 100%)`,
                    border: `1px solid ${C.border}`,
                    borderTop: `2px solid ${acc}`,
                    borderRadius: 14, overflow: "hidden",
                    boxShadow: `0 8px 24px #0006` }}>
                    {/* Header */}
                    <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`,
                      display: "flex", alignItems: "center", gap: 10,
                      background: `${acc}08`, backdropFilter: "blur(8px)" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%",
                        background: acc, boxShadow: `0 0 12px ${acc}` }} />
                      {editName === k ? (
                        <input autoFocus defaultValue={st[k].name}
                          style={{ fontSize: 16, fontWeight: 700, padding: "3px 10px", width: 170 }}
                          onBlur={e => { writeState({ ...st, [k]: { ...st[k], name: e.target.value || st[k].name } }); setEditName(null) }}
                          onKeyDown={e => e.key === "Enter" && e.target.blur()} />
                      ) : (
                        <span onClick={() => setEditName(k)}
                          style={{ fontWeight: 800, fontSize: 18, cursor: "text", color: acc,
                            letterSpacing: -0.3 }}>{st[k].name}</span>
                      )}
                      {/* Eleganter Todeszähler */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6,
                        background: `linear-gradient(135deg, ${C.dead}22, ${C.dead}08)`,
                        border: `1px solid ${C.dead}33`,
                        borderRadius: 999, padding: "3px 11px",
                        boxShadow: `0 0 12px ${C.dead}15` }}>
                        <span style={{ fontSize: 11, color: C.dead, opacity: 0.8 }}>†</span>
                        <span style={{ fontWeight: 700, fontSize: 13, color: C.dead, lineHeight: 1 }}>
                          {st[k].totalDeaths || 0}
                        </span>
                      </div>
                      <div style={{ flex: 1 }} />
                      <span style={{ fontSize: 12, color: C.sub, fontWeight: 600,
                        background: C.lift, padding: "4px 12px", borderRadius: 999,
                        border: `1px solid ${C.border}` }}>
                        {team.length}/6
                      </span>
                    </div>

                    {/* Pending Encounters */}
                    {pending.length > 0 && (
                      <div style={{ background: `${C.warn}0a`, borderBottom: `1px solid ${C.warn}33`,
                        padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
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

                    {/* Team-Bereich: grosse Karten */}
                    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, minHeight: 120 }}>
                      {team.length === 0 ? (
                        <div style={{ border: `1px dashed ${C.border}`, borderRadius: 10,
                          padding: "32px 0", textAlign: "center", fontSize: 12, color: C.dim }}>
                          Noch keine Pokémon im Team<br />
                          <span className="mono" style={{ fontSize: 10, color: C.dim }}>
                            Encounter starten und gefangene Pokémon aus der Box ins Team setzen
                          </span>
                        </div>
                      ) : team.map(enc => {
                        const linkInfo = st.links.find(l => (k === "p1" ? l.p1Id : l.p2Id) === enc.id);
                        const partnerId = linkInfo ? (k === "p1" ? linkInfo.p2Id : linkInfo.p1Id) : null;
                        const partnerEnc = partnerId ? st[ok].encounters.find(e => e.id === partnerId) : null;
                        return (
                          <TeamCard key={enc.id} enc={enc} player={k}
                            linkStatus={getLinkStatus(k, enc)} cap={capLevel}
                            partnerEnc={partnerEnc}
                            onStatus={s => setStatus(k, enc.id, s)}
                            onDelete={() => delEnc(k, enc.id)} />
                        );
                      })}
                    </div>

                    {/* Footer mit Zählern + Encounter Button */}
                    <div style={{ padding: "9px 14px", borderTop: `1px solid ${C.border}`,
                      background: `${C.bg}88`,
                      display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <span className="mono" style={{ fontSize: 10, color: C.p1 }}>📦 Box {boxOnly(k).length}</span>
                      <span className="mono" style={{ fontSize: 10, color: C.dead }}>⚔ Grab {grave(k).length}</span>
                      <div style={{ flex: 1 }} />
                      <button onClick={() => setModal({ player: k, mode: "start" })} style={{
                        padding: "6px 14px", borderRadius: 6, cursor: "pointer",
                        background: `${acc}22`, border: `1px solid ${acc}66`,
                        color: acc, fontWeight: 700, fontSize: 11 }}
                        onMouseEnter={e => e.currentTarget.style.background = `${acc}33`}
                        onMouseLeave={e => e.currentTarget.style.background = `${acc}22`}>
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
                            onDelete={() => delEnc(k, enc.id)}
                            onRevive={() => reviveEnc(k, enc.id)} />
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
                              borderRadius: 7, padding: "7px 10px" }}>
                              <Sprite slug={enc.slug} size={36} dead />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 12, color: C.sub,
                                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {enc.nickname || enc.name || "Unbekannt"}
                                </div>
                                <div className="mono" style={{ fontSize: 9, color: C.dim }}>{enc.route}</div>
                              </div>
                              <span className="mono" style={{ fontSize: 9, color: sc, flexShrink: 0 }}>{sl}</span>
                              {enc.level && <span className="mono" style={{ fontSize: 9, color: C.dim, flexShrink: 0 }}>Lv {enc.level}</span>}
                              <button onClick={() => {
                                if (window.confirm(`„${enc.nickname || enc.name}" aus dem Grab zurückholen? Geht in die Box und der Todescounter wird korrigiert.`))
                                  reviveEnc(k, enc.id);
                              }} title="Zurückholen"
                                style={{ padding: "3px 8px", borderRadius: 5, cursor: "pointer",
                                  background: `${C.ok}18`, border: `1px solid ${C.ok}55`,
                                  color: C.ok, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>↺</button>
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

          {/* Soul-Links Tab entfernt – Links werden intern weiterhin geführt für die Anzeige in den TeamCards */}
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
              borderRadius: 14, padding: 24, width: 520, maxWidth: "100%",
              maxHeight: "90vh", overflowY: "auto",
              boxShadow: "0 16px 48px #000c" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <span style={{ fontWeight: 900, fontSize: 16 }}>Statistiken & Run</span>
                <button onClick={() => setShowStats(false)} style={{ marginLeft: "auto",
                  background: "none", border: "none", cursor: "pointer", color: C.dim, fontSize: 22, lineHeight: 1 }}>×</button>
              </div>

              {/* Run Counter mit manueller Korrektur */}
              <div style={{ background: C.lift, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
                <div className="mono" style={{ fontSize: 10, color: C.sub, marginBottom: 8 }}>AKTUELLER RUN</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => {
                    if ((st.runNumber || 1) > 1)
                      writeState({ ...st, runNumber: st.runNumber - 1 });
                  }} disabled={(st.runNumber || 1) <= 1}
                    style={{ width: 28, height: 28, borderRadius: 6,
                      cursor: (st.runNumber || 1) > 1 ? "pointer" : "not-allowed",
                      background: C.card, border: `1px solid ${C.border}`,
                      color: C.sub, fontSize: 14, fontWeight: 700,
                      opacity: (st.runNumber || 1) > 1 ? 1 : .3 }}>−</button>
                  <span style={{ fontWeight: 900, fontSize: 24, color: C.link, minWidth: 60, textAlign: "center" }}>
                    #{st.runNumber}
                  </span>
                  <button onClick={() => writeState({ ...st, runNumber: (st.runNumber || 1) + 1 })}
                    style={{ width: 28, height: 28, borderRadius: 6, cursor: "pointer",
                      background: C.card, border: `1px solid ${C.border}`,
                      color: C.sub, fontSize: 14, fontWeight: 700 }}>+</button>
                  <span className="mono" style={{ fontSize: 11, color: C.sub, marginLeft: 6 }}>
                    {totalEnc} Encounter · {p1Alive + p2Alive} aktiv
                  </span>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => {
                    if (window.confirm(`Neuen Run starten? Encounter, Orden und Soul-Links werden zurückgesetzt. Tode-Statistiken bleiben erhalten.`))
                      startNewRun();
                  }} style={{ padding: "6px 12px", borderRadius: 7, cursor: "pointer",
                    background: `${C.warn}18`, border: `1px solid ${C.warn}55`,
                    color: C.warn, fontWeight: 600, fontSize: 11 }}>
                    ↻ Neuer Run
                  </button>
                </div>
                <div style={{ fontSize: 9, color: C.dim, marginTop: 8, lineHeight: 1.4 }}>
                  Run-Nummer manuell anpassen mit +/−. „Neuer Run" startet automatisch frisch.
                </div>
              </div>

              {/* Chronologische Cap-Liste */}
              <div className="mono" style={{ fontSize: 10, color: C.sub, marginBottom: 8 }}>
                LEVEL CAPS – CHRONOLOGISCH
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {ALL_CAPS.map((c, i) => {
                  const isGym = c.type === "gym";
                  const earned = isGym ? st.badges[c.badgeIdx]
                    : c.type === "rival" ? rivalsDone[c.rivalKey]
                    : elitesDone[c.eliteIdx];
                  const isChamp = c.type === "champ";
                  const isElite = c.type === "elite";
                  const isRival = c.type === "rival";
                  const col = isChamp ? C.gold
                    : isElite ? C.link
                    : isRival ? C.warn
                    : C.p1;
                  const symbol = isGym ? String(c.badgeIdx + 1)
                    : isChamp ? "♕"
                    : isRival ? "⚔"
                    : "E";
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      background: earned ? `${C.ok}10` : C.lift,
                      border: `1px solid ${earned ? C.ok + "44" : C.border}`,
                      borderLeft: `3px solid ${earned ? C.ok : C.border}`,
                      borderRadius: 6, padding: "6px 10px",
                      opacity: earned ? 1 : 0.75 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 5,
                        background: earned ? `${C.ok}22` : `${col}18`,
                        border: `1px solid ${earned ? C.ok + "55" : col + "44"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 800,
                        color: earned ? C.ok : col }}>
                        {earned ? "✓" : symbol}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700,
                        color: earned ? C.text : C.sub }}>{c.name}</span>
                      <span className="mono" style={{ marginLeft: "auto", fontSize: 11,
                        fontWeight: 700, color: col }}>Lv {c.level}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

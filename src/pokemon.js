const POKEMON_CACHE_KEY = "soullink-pokemon-de-v4"; // v4 = mit evoFamily + evolvesTo
const OLD_CACHE_KEYS = ["soullink-pokemon-de", "soullink-pokemon-de-v2", "soullink-pokemon-de-v3"];

// Alte Cache-Versionen aufräumen
function cleanOldCaches() {
  try {
    for (const k of OLD_CACHE_KEYS) localStorage.removeItem(k);
  } catch (e) {}
}

export async function fetchGermanPokemonNames(onProgress) {
  // Cache check
  try {
    const cached = localStorage.getItem(POKEMON_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      if (Array.isArray(data) && data.length === 649 && data[0].evoFamily) {
        return data;
      }
    }
  } catch (e) {}

  cleanOldCaches();

  // ============================================================
  // Phase 1: Species-Daten (Name, Slug, CatchRate, ChainUrl)
  // ============================================================
  const result = [];
  const BATCH = 20;

  // Erstmal alle Pokémon laden, ohne exakte Total-Zahl der Chains zu kennen.
  // Wir nehmen eine grobe Schätzung von 220 Chains für die Progress-Anzeige.
  const ESTIMATED_CHAINS = 220;

  for (let start = 1; start <= 649; start += BATCH) {
    const batch = [];
    for (let i = start; i < Math.min(start + BATCH, 650); i++) {
      batch.push(
        fetch(`https://pokeapi.co/api/v2/pokemon-species/${i}/`)
          .then(r => r.json())
          .then(data => {
            const deName = data.names.find(n => n.language.name === "de");
            const enName = data.names.find(n => n.language.name === "en");
            return {
              id: i,
              name: deName?.name || enName?.name || `#${i}`,
              slug: data.name,
              catchRate: data.capture_rate ?? 45,
              chainUrl: data.evolution_chain?.url || null,
              evoFamily: [i],
              evolvesTo: [],
            };
          })
          .catch(() => ({
            id: i, name: `#${i}`, slug: "", catchRate: 45,
            chainUrl: null, evoFamily: [i], evolvesTo: [],
          }))
      );
    }
    const batchResults = await Promise.all(batch);
    result.push(...batchResults);
    if (onProgress) onProgress(result.length, 649 + ESTIMATED_CHAINS);
  }
  result.sort((a, b) => a.id - b.id);

  // ============================================================
  // Phase 2: Evolution Chains
  // ============================================================
  const uniqueChainUrls = [...new Set(result.map(p => p.chainUrl).filter(Boolean))];
  const slugToId = new Map(result.map(p => [p.slug, p.id]));
  const TOTAL = 649 + uniqueChainUrls.length;

  // Baum rekursiv durchlaufen, Familie + direkte Evolutionen sammeln
  function walkChain(node, familyOut, directOut) {
    const id = slugToId.get(node.species.name);
    if (id) {
      familyOut.push(id);
      const nextIds = (node.evolves_to || [])
        .map(child => slugToId.get(child.species.name))
        .filter(Boolean);
      directOut.set(id, nextIds);
    }
    for (const child of node.evolves_to || []) {
      walkChain(child, familyOut, directOut);
    }
  }

  let chainsLoaded = 0;
  for (let i = 0; i < uniqueChainUrls.length; i += BATCH) {
    const slice = uniqueChainUrls.slice(i, i + BATCH);
    const chains = await Promise.all(
      slice.map(url => fetch(url).then(r => r.json()).catch(() => null))
    );

    for (const chainData of chains) {
      if (!chainData?.chain) continue;
      const family = [];
      const direct = new Map();
      walkChain(chainData.chain, family, direct);

      // Familie auf alle Mitglieder verteilen
      for (const id of family) {
        const sp = result.find(p => p.id === id);
        if (sp) {
          sp.evoFamily = [...family]; // Kopie, damit nicht shared
          sp.evolvesTo = direct.get(id) || [];
        }
      }
    }
    chainsLoaded += slice.length;
    if (onProgress) onProgress(649 + chainsLoaded, TOTAL);
  }

  // chainUrl ist nur zur Laufzeit gebraucht – aus Cache rausnehmen
  for (const p of result) delete p.chainUrl;

  try {
    localStorage.setItem(POKEMON_CACHE_KEY, JSON.stringify(result));
  } catch (e) {}

  return result;
}

// ============================================================
// Fangwahrscheinlichkeit bei vollen HP
// ============================================================
export function calcCatchRate(catchRate, ballMultiplier = 1) {
  const a = (catchRate * ballMultiplier) / 3;
  const aClamped = Math.min(a, 255);
  const chance = 1 - Math.pow(1 - aClamped / 255, 4);
  return Math.round(chance * 100);
}

export function catchRateColor(pct) {
  if (pct >= 70) return "#4ade80";
  if (pct >= 35) return "#fbbf24";
  return "#f87171";
}

// ============================================================
// Helpers für Dupes-Clause und Evolutionen
// ============================================================

// Familie (Set aller Species-IDs in der gleichen Evo-Linie)
export function getFamilyIds(pokemonList, speciesId) {
  if (!speciesId) return new Set();
  const sp = pokemonList.find(p => p.id === speciesId);
  return new Set(sp?.evoFamily || [speciesId]);
}

// Direkte nächste Evolutionen (kann 0, 1 oder mehr sein - z.B. Evoli)
export function getDirectEvolutions(pokemonList, speciesId) {
  if (!speciesId) return [];
  const sp = pokemonList.find(p => p.id === speciesId);
  if (!sp?.evolvesTo) return [];
  return sp.evolvesTo
    .map(evoId => pokemonList.find(p => p.id === evoId))
    .filter(Boolean);
}

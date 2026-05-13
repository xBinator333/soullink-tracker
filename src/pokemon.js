const POKEMON_CACHE_KEY = "soullink-pokemon-de-v3"; // v3 = mit catchRate

export async function fetchGermanPokemonNames(onProgress) {
  try {
    const cached = localStorage.getItem(POKEMON_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      if (Array.isArray(data) && data.length === 649) return data;
    }
  } catch (e) {}
  const result = [];
  const BATCH = 20;
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
            };
          })
          .catch(() => ({ id: i, name: `#${i}`, slug: "", catchRate: 45 }))
      );
    }
    const batchResults = await Promise.all(batch);
    result.push(...batchResults);
    if (onProgress) onProgress(result.length);
  }
  result.sort((a, b) => a.id - b.id);
  try { localStorage.setItem(POKEMON_CACHE_KEY, JSON.stringify(result)); } catch (e) {}
  return result;
}

// Fangwahrscheinlichkeit bei vollen HP berechnen
// Formel Gen 5: CatchValue = (3*MaxHP - 2*HP) * Rate * BallBonus / (3*MaxHP)
// Bei vollen HP vereinfacht: Rate * BallBonus / 3
// Dann: catchChance = 1 - (1 - catchValue/255)^4 → als %
export function calcCatchRate(catchRate, ballMultiplier = 1) {
  const a = (catchRate * ballMultiplier) / 3;
  const aClamped = Math.min(a, 255);
  const chance = 1 - Math.pow(1 - aClamped / 255, 4);
  return Math.round(chance * 100);
}

export function catchRateColor(pct) {
  if (pct >= 70) return "#4ade80"; // grün
  if (pct >= 35) return "#fbbf24"; // gelb
  return "#f87171";                // rot
}

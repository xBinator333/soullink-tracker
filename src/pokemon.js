const POKEMON_CACHE_KEY = "soullink-pokemon-de-v2";

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
            return { id: i, name: deName?.name || enName?.name || `#${i}`, slug: data.name };
          })
          .catch(() => ({ id: i, name: `#${i}`, slug: "" }))
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

export const LOCATIONS = [
  // ANFANG (vor 1. Orden)
  {name:"Starter (Bell)",type:"gift"},
  {name:"Eventura City",type:"route"},
  {name:"Route 19",type:"route"},
  {name:"Route 20",type:"route"},
  {name:"Dausing",type:"route"},
  {name:"Dausing-Hof",type:"route"},
  // → 1. Orden Cheren
  {name:"Route 20 (Nord)",type:"route"},
  {name:"Vapydro-Komplex",type:"route"},
  {name:"Vapydro City",type:"route"},
  // → 2. Orden Mica
  {name:"Lostlorn-Wald",type:"route"},
  {name:"Route 2",type:"route"},
  {name:"Stratos City",type:"route"},
  {name:"Stratos-Kanalisation",type:"route"},
  // → 3. Orden Artie
  {name:"Route 4",type:"route"},
  {name:"Wüstenresort",type:"route"},
  {name:"Alter Palast",type:"route"},
  {name:"Rayono City",type:"route"},
  // → 4. Orden Kamilla
  {name:"Route 16",type:"route"},
  {name:"Liberty-Garten",type:"route"},
  {name:"Marea-Zugbrücke",type:"route"},
  {name:"Marea City",type:"route"},
  // → 5. Orden Turner
  {name:"Verlassener Hof",type:"route"},
  {name:"Route 6",type:"route"},
  {name:"Grundwassersenke",type:"route"},
  {name:"Himmelspfeilbrücke",type:"route"},
  {name:"Panaero City",type:"route"},
  // → 6. Orden Géraldine
  {name:"Route 7",type:"route"},
  {name:"Wendelberg",type:"route"},
  {name:"Tessera",type:"route"},
  {name:"Wunderbrücke",type:"route"},
  {name:"Ondula",type:"route"},
  {name:"Route 13",type:"route"},
  {name:"Janusberg",type:"route"},
  {name:"Monsentiero",type:"route"},
  {name:"Route 14",type:"route"},
  {name:"Drachenstiege",type:"route"},
  {name:"Twindrake City",type:"route"},
  // → 7. Orden Lysander
  {name:"Route 9",type:"route"},
  {name:"Zylinderbrücke",type:"route"},
  {name:"Strandgrotte",type:"route"},
  {name:"Abidaya City",type:"route"},
  // → 8. Orden Benson
  {name:"Route 22",type:"route"},
  {name:"Riesengrotte",type:"route"},
  {name:"Route 23",type:"route"},
  {name:"Siegesstraße",type:"route"},
  // → Top 4 / Champ
  // Post-Game
  {name:"Route 1",type:"route"},
  {name:"Route 3",type:"route"},
  {name:"Route 5",type:"route"},
  {name:"Route 8",type:"route"},
  {name:"Route 11",type:"route"},
  {name:"Route 12",type:"route"},
  {name:"Dorfbrücke",type:"route"},
  {name:"Route 15",type:"route"},
  {name:"Route 17",type:"route"},
  {name:"Route 18",type:"route"},
  {name:"Route 21",type:"route"},
  {name:"Nevaio City",type:"route"},
  {name:"Septerna City",type:"route"},
  {name:"Himmelsturm",type:"route"},
  {name:"Elektrolithhöhle",type:"route"},
  {name:"Alter Fluchtweg",type:"route"},
  {name:"P2-Labor",type:"route"},
  {name:"Beschwörungshöhle",type:"route"},
  {name:"Kontaktwald",type:"route"},
  // STATIC
  {name:"Fossil-Pokémon",type:"static"},
  {name:"Zorua",type:"static"},
  {name:"Cobalion (Wendelberg)",type:"static"},
  {name:"Terrakion (Siegesstraße)",type:"static"},
  {name:"Virizion (Kontaktwald)",type:"static"},
  {name:"Zekrom (Riesengrotte)",type:"static"},
  {name:"Kyurem (Riesengrotte)",type:"static"},
  {name:"Boreos/Voltolos (wandernd)",type:"static"},
];


// Arenaleiter mit Cap-Levels
export const GYM_CAPS = [
  {name:"Cheren",    level:13},
  {name:"Mica",      level:18},
  {name:"Artie",     level:24},
  {name:"Kamilla",   level:30},
  {name:"Turner",    level:33},
  {name:"Géraldine", level:39},
  {name:"Lysander",  level:48},
  {name:"Benson",    level:51},
];

// Top 4 + Champ
export const ELITE_CAPS = [
  {name:"Anissa",        level:56},
  {name:"Astor",         level:56},
  {name:"Kattlea",       level:57},
  {name:"Eugen",         level:58},
  {name:"Lilia (Champ)", level:59},
];

// Alle Caps in chronologischer Reihenfolge
// type: "gym" | "rival" | "elite" | "champ"
export const ALL_CAPS = [
  {name:"Matisse (Dausing-Hof)",          level:8,  type:"rival", rivalKey:"r0"},
  {name:"Cheren",                          level:13, type:"gym",   badgeIdx:0},
  {name:"Mica",                            level:18, type:"gym",   badgeIdx:1},
  {name:"Matisse (Stratos-Kanalisation)",  level:20, type:"rival", rivalKey:"r1"},
  {name:"Artie",                           level:24, type:"gym",   badgeIdx:2},
  {name:"Kamilla",                         level:30, type:"gym",   badgeIdx:3},
  {name:"Turner",                          level:33, type:"gym",   badgeIdx:4},
  {name:"Géraldine",                       level:39, type:"gym",   badgeIdx:5},
  {name:"Matisse (Ondula)",                level:41, type:"rival", rivalKey:"r2"},
  {name:"Matisse (Tessera)",               level:43, type:"rival", rivalKey:"r3"},
  {name:"Lysander",                        level:48, type:"gym",   badgeIdx:6},
  {name:"Benson",                          level:51, type:"gym",   badgeIdx:7},
  {name:"Matisse (Siegesstraße)",          level:57, type:"rival", rivalKey:"r4"},
  {name:"Anissa",                          level:56, type:"elite", eliteIdx:0},
  {name:"Astor",                           level:56, type:"elite", eliteIdx:1},
  {name:"Kattlea",                         level:57, type:"elite", eliteIdx:2},
  {name:"Eugen",                           level:58, type:"elite", eliteIdx:3},
  {name:"Lilia (Champ)",                   level:59, type:"champ", eliteIdx:4},
];

// HINWEIS: EVO_CHAINS und getEvoChain wurden entfernt.
// Evolutionsdaten kommen jetzt direkt von der PokéAPI über pokemon.js
// (jedes Pokémon im pokemonList hat .evoFamily und .evolvesTo).
// Helpers: getFamilyIds() und getDirectEvolutions() aus pokemon.js.

export const C = {
  bg:"#080b11",panel:"#0f1319",card:"#151b26",lift:"#1c2436",
  border:"#252d3d",borderHi:"#3d4f6e",text:"#dde6f0",sub:"#6b7fa0",dim:"#3d4d63",
  p1:"#38bdf8",p2:"#f472b6",link:"#a78bfa",
  ok:"#4ade80",warn:"#fbbf24",dead:"#f87171",gold:"#fbbf24",
};

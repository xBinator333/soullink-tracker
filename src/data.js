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

import badge1 from "./assets/badges/badge1.png";
import badge2 from "./assets/badges/badge2.png";
import badge3 from "./assets/badges/badge3.png";
import badge4 from "./assets/badges/badge4.png";
import badge5 from "./assets/badges/badge5.png";
import badge6 from "./assets/badges/badge6.png";
import badge7 from "./assets/badges/badge7.png";
import badge8 from "./assets/badges/badge8.png";

export const GYM_CAPS = [
  {name:"Cheren",    level:13, sprite:badge1, color:"#c9b574"},
  {name:"Mica",      level:18, sprite:badge2, color:"#b14ec3"},
  {name:"Artie",     level:24, sprite:badge3, color:"#7fd35c"},
  {name:"Kamilla",   level:30, sprite:badge4, color:"#f7d44a"},
  {name:"Turner",    level:33, sprite:badge5, color:"#c89968"},
  {name:"Géraldine", level:39, sprite:badge6, color:"#5fbce0"},
  {name:"Lysander",  level:48, sprite:badge7, color:"#8b7fd6"},
  {name:"Benson",    level:51, sprite:badge8, color:"#4fb5ff"},
];
// (keine echten Badges, daher icon statt sprite)
export const ELITE_CAPS = [
  {name:"Anissa",        level:56, icon:"👻", color:"#a78bfa"}, // Geist
  {name:"Astor",         level:56, icon:"🎴", color:"#f59e0b"}, // Unlicht
  {name:"Kattlea",       level:57, icon:"🔮", color:"#ec4899"}, // Psycho
  {name:"Eugen",         level:58, icon:"🥊", color:"#dc2626"}, // Kampf
  {name:"Lilia (Champ)", level:59, icon:"👑", color:"#fbbf24"}, // Champ
];

// Alle Caps chronologisch – type: "gym" | "rival" | "elite" | "champ"
export const ALL_CAPS = [
  {name:"Matisse (Dausing-Hof)",         level:8,  type:"rival", icon:"⚔", rivalKey:"r0"},
  {name:"Cheren",                         level:13, type:"gym",   badgeIdx:0},
  {name:"Mica",                           level:18, type:"gym",   badgeIdx:1},
  {name:"Matisse (Stratos-Kanalisation)", level:20, type:"rival", icon:"⚔", rivalKey:"r1"},
  {name:"Artie",                          level:24, type:"gym",   badgeIdx:2},
  {name:"Kamilla",                        level:30, type:"gym",   badgeIdx:3},
  {name:"Turner",                         level:33, type:"gym",   badgeIdx:4},
  {name:"Géraldine",                      level:39, type:"gym",   badgeIdx:5},
  {name:"Matisse (Ondula)",               level:41, type:"rival", icon:"⚔", rivalKey:"r2"},
  {name:"Matisse (Tessera)",              level:43, type:"rival", icon:"⚔", rivalKey:"r3"},
  {name:"Lysander",                       level:48, type:"gym",   badgeIdx:6},
  {name:"Benson",                         level:51, type:"gym",   badgeIdx:7},
  {name:"Matisse (Siegesstraße)",         level:57, type:"rival", icon:"⚔", rivalKey:"r4"},
  {name:"Anissa",                         level:56, type:"elite", eliteIdx:0, icon:"👻"},
  {name:"Astor",                          level:56, type:"elite", eliteIdx:1, icon:"🎴"},
  {name:"Kattlea",                        level:57, type:"elite", eliteIdx:2, icon:"🔮"},
  {name:"Eugen",                          level:58, type:"elite", eliteIdx:3, icon:"🥊"},
  {name:"Lilia (Champ)",                  level:59, type:"champ", eliteIdx:4, icon:"👑"},
];

export const BADGE_COLORS = ["#a8d8ea","#9b5de5","#00bbf9","#fee440","#8B4513","#0dcaf0","#9467bd","#0a9396"];

export const EVO_CHAINS = [
  [1,2,3],[4,5,6],[7,8,9],[10,11,12],[13,14,15],[16,17,18],[19,20],[21,22],
  [23,24],[25,26],[27,28],[29,30,31],[32,33,34],[35,36],[37,38],[39,40],
  [41,42,169],[43,44,45],[46,47],[48,49],[50,51],[52,53],[54,55],[56,57],
  [58,59],[60,61,62,186],[63,64,65],[66,67,68],[69,70,71],[72,73],[74,75,76],
  [77,78],[79,80,199],[81,82,462],[84,85],[86,87],[88,89],[90,91],[92,93,94],
  [96,97],[98,99],[100,101],[102,103],[104,105],[109,110],[111,112,464],
  [116,117,230],[118,119],[120,121],[129,130],[133,134],[133,135],[133,136],
  [133,196],[133,197],[133,470],[133,471],[138,139],[140,141],[147,148,149],
  [152,153,154],[155,156,157],[158,159,160],[161,162],[163,164],[165,166],
  [167,168],[170,171],[172,25],[173,35],[174,39],[175,176,468],[177,178],
  [179,180,181],[183,184],[187,188,189],[190,424],[191,192],[193,469],
  [194,195],[204,205],[207,472],[209,210],[216,217],[218,219],[220,221,473],
  [223,224],[228,229],[231,232],[246,247,248],[252,253,254],[255,256,257],
  [258,259,260],[261,262],[263,264],[265,266,267],[265,268,269],
  [270,271,272],[273,274,275],[276,277],[278,279,280],[281,282,283],
  [285,286,287],[288,289,290],[291,292,293],[294,295],[296,297],
  [299,476],[300,301],[303,304,305,306],[307,308],[309,310],[316,317],
  [318,319],[320,321],[322,323],[325,326],[328,329,330],[331,332],
  [333,334],[339,340],[341,342],[343,344],[345,346],[347,348],[349,350],
  [353,354],[355,356,477],[359,478],[361,362],[363,364,365],[369,370,371],
  [372,373,374],[385,386,387],[388,389,390],[391,392,393],[394,395,396],
  [397,398],[399,400],[401,402],[403,404,405],[406,407],[408,409],
  [410,411],[412,413,414],[415,416],[418,419],[420,421],[422,423],
  [425,426],[427,428],[431,432,433],[434,435],[436,437],[441,442,443],
  [444,529],[445,446],[447,448],[449,450],[451,452],[454,455],[456,457],
  [458,459],
  [495,496,497],[498,499,500],[501,502,503],[504,505],[506,507,508],
  [509,510],[511,512],[513,514],[515,516],[517,518],[519,520,521],
  [522,523],[524,525,526],[527,528],[529,530],[532,533,534],[535,536,537],
  [540,541,542],[543,544,545],[546,547],[548,549],[551,552,553],[554,555],
  [557,558],[559,560],[562,563],[564,565],[566,567,568],[570,571],
  [574,575,576],[577,578,579],[580,581],[582,583,584],[585,586],
  [588,589],[590,591],[592,593],[595,596],[597,598],[599,600,601],
  [602,603,604],[605,606],[607,608,609],[610,611,612],[613,614],
  [616,617],[619,620],[622,623],[624,625],[627,628],[629,630],
  [633,634,635],[636,637],
];

export function getEvoChain(id) {
  for (const c of EVO_CHAINS) if (c.includes(id)) return c;
  return [id];
}

export const C = {
  bg:"#080b11",panel:"#0f1319",card:"#151b26",lift:"#1c2436",
  border:"#252d3d",borderHi:"#3d4f6e",text:"#dde6f0",sub:"#6b7fa0",dim:"#3d4d63",
  p1:"#38bdf8",p2:"#f472b6",link:"#a78bfa",
  ok:"#4ade80",warn:"#fbbf24",dead:"#f87171",gold:"#fbbf24",
};

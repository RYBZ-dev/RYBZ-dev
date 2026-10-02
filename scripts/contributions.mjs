// Génère assets/contributions.svg : le calendrier des contributions en grille bleu néon animée
import { writeFileSync, mkdirSync } from "node:fs";

const user = process.env.PROFIL;
const token = process.env.GITHUB_TOKEN;

const query = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
    }
  }
}`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, variables: { login: user } }),
});
const json = await res.json();
if (!json.data) throw new Error(JSON.stringify(json));
const calendar = json.data.user.contributionsCollection.contributionCalendar;

const NIVEAUX = {
  NONE: "#161b22",
  FIRST_QUARTILE: "#0b3a6e",
  SECOND_QUARTILE: "#1561c4",
  THIRD_QUARTILE: "#2f8cff",
  FOURTH_QUARTILE: "#8cc8ff",
};
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

const CASE = 11, ECART = 3, PAS = CASE + ECART;
const GAUCHE = 24, HAUT = 64;
const semaines = calendar.weeks;
const largeur = GAUCHE * 2 + semaines.length * PAS - ECART;
const hauteur = HAUT + 7 * PAS + 24;

let cases = "";
let mois = "";
let moisPrecedent = -1;
semaines.forEach((semaine, x) => {
  const premier = new Date(semaine.contributionDays[0].date);
  // le nom du mois s'affiche sur la 1re semaine qui commence dans ce mois (pas sur une semaine à cheval en bord de grille)
  if (premier.getUTCMonth() !== moisPrecedent && premier.getUTCDate() <= 7 && x < semaines.length - 2) {
    moisPrecedent = premier.getUTCMonth();
    mois += `<text x="${GAUCHE + x * PAS}" y="${HAUT - 10}" class="mois">${MOIS[moisPrecedent]}</text>`;
  }
  semaine.contributionDays.forEach((jour) => {
    const y = new Date(jour.date).getUTCDay();
    const actif = jour.contributionLevel !== "NONE";
    cases += `<rect x="${GAUCHE + x * PAS}" y="${HAUT + y * PAS}" width="${CASE}" height="${CASE}" rx="3" fill="${NIVEAUX[jour.contributionLevel]}"${actif ? ' filter="url(#lueur)"' : ""} style="animation-delay:${(x * 0.025).toFixed(3)}s"><title>${jour.contributionCount} le ${jour.date}</title></rect>`;
  });
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${largeur}" height="${hauteur}" viewBox="0 0 ${largeur} ${hauteur}">
<defs>
  <filter id="lueur" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="1.6" result="flou"/>
    <feMerge><feMergeNode in="flou"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <linearGradient id="balayage" x1="0" x2="1">
    <stop offset="0" stop-color="#4fa3ff" stop-opacity="0"/>
    <stop offset="0.5" stop-color="#4fa3ff" stop-opacity="0.18"/>
    <stop offset="1" stop-color="#4fa3ff" stop-opacity="0"/>
  </linearGradient>
  <clipPath id="grille"><rect x="${GAUCHE}" y="${HAUT}" width="${largeur - GAUCHE * 2}" height="${7 * PAS}"/></clipPath>
</defs>
<style>
  text { font-family: -apple-system, "Segoe UI", Inter, Helvetica, Arial, sans-serif; }
  .total { fill: #e6edf3; font-size: 18px; font-weight: 600; }
  .sous { fill: #7d8590; font-size: 12px; }
  .mois { fill: #7d8590; font-size: 10px; }
  rect[style] { opacity: 0; animation: apparition .5s ease-out forwards; }
  @keyframes apparition { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  .scan { animation: scan 6s ease-in-out 1.6s infinite; }
  @keyframes scan { from { transform: translateX(-160px); } to { transform: translateX(${largeur}px); } }
</style>
<rect width="100%" height="100%" rx="12" fill="#0d1117" stroke="#21262d"/>
<text x="${GAUCHE}" y="32" class="total">${calendar.totalContributions} contributions</text>
<text x="${largeur - GAUCHE}" y="32" class="sous" text-anchor="end">sur les 12 derniers mois</text>
${mois}
${cases}
<g clip-path="url(#grille)"><rect class="scan" x="0" y="${HAUT}" width="160" height="${7 * PAS}" fill="url(#balayage)"/></g>
</svg>
`;

mkdirSync("assets", { recursive: true });
writeFileSync("assets/contributions.svg", svg);
console.log(`assets/contributions.svg : ${calendar.totalContributions} contributions`);

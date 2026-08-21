// Regenerates assets/xp-bar.svg from the user's live GitHub contribution count.
// Level = contributions // 25, XP = contributions % 25 (matches the original hand-authored bar).

import { writeFile } from "node:fs/promises";

const login = process.env.GH_LOGIN;
const token = process.env.GH_TOKEN;

if (!login || !token) {
  throw new Error("GH_LOGIN and GH_TOKEN env vars are required");
}

const now = new Date();
const from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString();
const to = now.toISOString();

const query = `
  query($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
        }
      }
    }
  }
`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": `${login}-xp-bar`,
  },
  body: JSON.stringify({ query, variables: { login, from, to } }),
});

if (!res.ok) {
  throw new Error(`GraphQL request failed: ${res.status} ${await res.text()}`);
}

const json = await res.json();
if (json.errors) {
  throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
}

const totalContributions =
  json.data.user.contributionsCollection.contributionCalendar.totalContributions;

const XP_PER_LEVEL = 25;
const level = Math.floor(totalContributions / XP_PER_LEVEL);
const xp = totalContributions % XP_PER_LEVEL;
const nextLevel = level + 1;

const TRACK_X = 24;
const TRACK_WIDTH = 652;
const fillWidth = Math.round((TRACK_WIDTH * xp) / XP_PER_LEVEL);

const svg = `<svg width="700" height="110" viewBox="0 0 700 110" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fill" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <clipPath id="fillClip">
      <rect x="${TRACK_X}" y="62" width="${fillWidth}" height="14" rx="7"/>
    </clipPath>
  </defs>

  <rect x="0.5" y="0.5" width="699" height="109" rx="14" fill="#0a0a0f" stroke="#1f1f2e" stroke-width="1"/>

  <text x="24" y="42" font-family="Consolas,'Cascadia Code',monospace" font-size="26" font-weight="700" fill="#f5f5f7">
    LEVEL ${level}
    <animate attributeName="fill" values="#f5f5f7;#c9b8ff;#f5f5f7" dur="3.2s" repeatCount="indefinite"/>
  </text>
  <text x="676" y="42" font-family="Consolas,'Cascadia Code',monospace" font-size="14" font-weight="600" fill="#a78bfa" text-anchor="end">${xp} / ${XP_PER_LEVEL} XP TO LEVEL ${nextLevel}</text>

  <rect x="${TRACK_X}" y="62" width="${TRACK_WIDTH}" height="14" rx="7" fill="#1c1c28"/>

  <rect x="${TRACK_X}" y="62" width="${fillWidth}" height="14" rx="7" fill="#8b5cf6" opacity="0.5" filter="url(#glow)">
    <animate attributeName="width" from="0" to="${fillWidth}" dur="1.1s" calcMode="spline" keySplines="0.2 0.8 0.2 1"/>
    <animate attributeName="opacity" values="0.35;0.6;0.35" dur="2.4s" begin="1.1s" repeatCount="indefinite"/>
  </rect>

  <rect x="${TRACK_X}" y="62" width="${fillWidth}" height="14" rx="7" fill="url(#fill)">
    <animate attributeName="width" from="0" to="${fillWidth}" dur="1.1s" calcMode="spline" keySplines="0.2 0.8 0.2 1"/>
  </rect>

  <g clip-path="url(#fillClip)">
    <rect x="-10" y="62" width="24" height="14" fill="url(#shine)">
      <animateTransform attributeName="transform" type="translate" values="0,0;190,0" dur="2.4s" begin="1.1s" repeatCount="indefinite"/>
    </rect>
  </g>

  <text x="24" y="96" font-family="Consolas,'Cascadia Code',monospace" font-size="12" fill="#8a8a99">${totalContributions} contributions logged this year</text>
</svg>
`;

await writeFile(new URL("../assets/xp-bar.svg", import.meta.url), svg);
console.log(`xp-bar.svg updated: level ${level}, ${xp}/${XP_PER_LEVEL} XP, ${totalContributions} contributions`);

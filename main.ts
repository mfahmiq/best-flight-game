// main.ts — hands the Skymail entry in (Node 22, standard library only).
//
// The game is plain static files under game/ (index.html plus ES modules,
// no library, no network request), and this program copies game/ and
// screenshots/ from beside this file to /output and writes
// /output/dossier.json with the vendored make.fun library, exactly as the
// kit's starter does. It runs twice and both runs write the same bytes.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Serve the game locally with any static server over game/, for example:
//   python3 -m http.server 8091 --directory game
// then open http://localhost:8091 — pick a sortie with 1/2/3, Enter to fly.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root is the directory this file lives in.
const here = fileURLToPath(new URL('.', import.meta.url));
// The grader hands us a writable /output; locally the env var stands in.
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps are the scorer's own (see the kit's gate.json): only
// text_max_bytes shapes the dossier's bytes; the others refuse an entry
// the scorer would refuse anyway (more than 4 screenshots or one over
// 256 KiB; more than 993 files in game/ or 48 MiB of game files in all,
// or a path under game/ over 1000 bytes). Nothing here depends on the
// clock, the environment or the order files are read, so the two runs
// the grader does write byte-identical output.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

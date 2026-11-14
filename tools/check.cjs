// Vérifications sans navigateur, à lancer avant chaque publication :  node tools/check.cjs
// - tous les fichiers du jeu sont dans la liste du service worker (sinon le jeu hors ligne serait incomplet)
// - chaque import pointe vers un fichier et un export qui existent
// - la syntaxe de chaque module est valide
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..'); let bad = 0;
const fail = (m) => { bad++; console.log('KO ', m); };
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const core = [...sw.matchAll(/'((?:js|css|icons)\/[^']+|index\.html|manifest\.webmanifest)'/g)].map((m) => m[1]);
const files = fs.readdirSync(path.join(root, 'js')).filter((f) => f.endsWith('.js'));
for (const f of files) if (!core.includes('js/' + f)) fail(`js/${f} absent de la liste CORE de sw.js`);
for (const f of core) if (!fs.existsSync(path.join(root, f))) fail(`${f} est dans sw.js mais n'existe pas`);
const src = Object.fromEntries(files.map((f) => [f, fs.readFileSync(path.join(root, 'js', f), 'utf8')]));
const exportsOf = (s) => new Set([...s.matchAll(/export\s+(?:async\s+)?(?:const|let|function\*?|class)\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]));
for (const [f, s] of Object.entries(src)) {
  try { execFileSync(process.execPath, ['--check', path.join(root, 'js', f)], { stdio: 'pipe' }); } catch (e) { fail(`syntaxe : js/${f}\n${e.stderr}`); }
  for (const m of s.matchAll(/import\s*\{([^}]+)\}\s*from\s*'\.\/([\w-]+\.js)'/g)) {
    if (!src[m[2]]) { fail(`${f} importe ${m[2]} qui n'existe pas`); continue; }
    const ex = exportsOf(src[m[2]]);
    for (const n of m[1].split(',').map((x) => x.trim().split(/\s+as\s+/)[0]).filter(Boolean)) if (!ex.has(n)) fail(`${f} importe « ${n} » absent de ${m[2]}`);
  }
}
const v = (sw.match(/VERSION = '([^']+)'/) || [])[1];
console.log(bad ? `${bad} problème(s)` : `OK : ${files.length} modules, ${core.length} fichiers en cache, version ${v}`);
process.exit(bad ? 1 : 0);

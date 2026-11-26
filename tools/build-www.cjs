// Copie le jeu (le même code que la version web GitHub Pages) dans www/, le dossier que Capacitor emballe dans les
// apps Android et iOS. Aucune transformation : pas de build, les fichiers sont copiés tels quels.
//   node tools/build-www.cjs        (ou : npm run www)       : production, mode admin désactivé
//   node tools/build-www.cjs --test (ou : npm run www:test)  : build de test, mode admin disponible
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'www');
const ITEMS = ['index.html', 'privacy.html', 'manifest.webmanifest', 'css', 'js', 'icons'];
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
let n = 0;
const copy = (src, dst) => {
  const st = fs.statSync(src);
  if (st.isDirectory()) { fs.mkdirSync(dst, { recursive: true }); for (const f of fs.readdirSync(src)) copy(path.join(src, f), path.join(dst, f)); }
  else { fs.copyFileSync(src, dst); n++; }
};
for (const it of ITEMS) if (fs.existsSync(path.join(root, it))) copy(path.join(root, it), path.join(out, it));
// Mode admin : coupé dans le build de production (stores). Build de test : node tools/build-www.cjs --test
const test = process.argv.includes('--test') || process.env.ADMIN === '1';
if (!test) {
  const cf = path.join(out, 'js', 'config.js'), src = fs.readFileSync(cf, 'utf8');
  if (!/export const ADMIN_ENABLED = true;/.test(src)) throw new Error('ADMIN_ENABLED introuvable dans js/config.js');
  fs.writeFileSync(cf, src.replace('export const ADMIN_ENABLED = true;', 'export const ADMIN_ENABLED = false;'));
}
console.log(`www/ prêt : ${n} fichiers copiés (${ITEMS.join(', ')}) · mode admin ${test ? 'ACTIF (build de test)' : 'désactivé (production)'}`);

// Copie le jeu (le même code que la version web GitHub Pages) dans www/, le dossier que Capacitor emballe dans les
// apps Android et iOS. Aucune transformation : pas de build, les fichiers sont copiés tels quels.
//   node tools/build-www.cjs        (ou : npm run www)
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
console.log(`www/ prêt : ${n} fichiers copiés (${ITEMS.join(', ')})`);

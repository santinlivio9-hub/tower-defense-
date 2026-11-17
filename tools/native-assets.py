# Icônes et écrans de démarrage des apps Android et iOS, dérivés de store/icon-1024.png et store/icon-maskable-1024.png
# (générés par : NODE_PATH=$(npm root -g) node tools/make-icons.mjs --store). Nécessite Python 3 + Pillow.
#   python3 tools/native-assets.py
from PIL import Image, ImageDraw
import os
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
BG = (28, 16, 54)   # #1c1036, fond du jeu
full = Image.open(os.path.join(R, 'store/icon-1024.png')).convert('RGBA')
mask = Image.open(os.path.join(R, 'store/icon-maskable-1024.png')).convert('RGBA')
res = os.path.join(R, 'android/app/src/main/res')
def flat(im):   # sans canal alpha (exigé par l'App Store)
    b = Image.new('RGB', im.size, BG); b.paste(im, (0, 0), im); return b
# --- Android : icône classique, ronde, et premier plan de l'icône adaptative
for d, s in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    ic = full.resize((s, s), Image.LANCZOS); ic.save(f'{res}/mipmap-{d}/ic_launcher.png')
    m = Image.new('L', (s * 4, s * 4), 0); ImageDraw.Draw(m).ellipse((0, 0, s * 4 - 1, s * 4 - 1), fill=255); m = m.resize((s, s), Image.LANCZOS)
    rd = Image.new('RGBA', (s, s), (0, 0, 0, 0)); rd.paste(ic, (0, 0), m); rd.save(f'{res}/mipmap-{d}/ic_launcher_round.png')
    fg = int(s * 2.25); mask.resize((fg, fg), Image.LANCZOS).save(f'{res}/mipmap-{d}/ic_launcher_foreground.png')
with open(f'{res}/values/ic_launcher_background.xml', 'w') as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#1C1036</color>\n</resources>\n')
# --- écrans de démarrage : fond du jeu, icône arrondie au centre
def splash(w, h):
    im = Image.new('RGB', (w, h), BG); s = int(min(w, h) * 0.34)
    ic = full.resize((s, s), Image.LANCZOS); m = Image.new('L', (s * 2, s * 2), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, s * 2 - 1, s * 2 - 1), radius=int(s * 0.44), fill=255); m = m.resize((s, s), Image.LANCZOS)
    im.paste(ic, ((w - s) // 2, (h - s) // 2), m); return im
for d in os.listdir(res):
    p = os.path.join(res, d, 'splash.png')
    if d.startswith('drawable') and os.path.exists(p):
        w, h = Image.open(p).size; splash(w, h).save(p)
# --- iOS : icône 1024 sans alpha, écran de démarrage 2732
ios = os.path.join(R, 'ios/App/App/Assets.xcassets')
flat(full).save(f'{ios}/AppIcon.appiconset/AppIcon-512@2x.png')
sp = splash(2732, 2732)
for n in ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']: sp.save(f'{ios}/Splash.imageset/{n}')
print('Icônes et écrans de démarrage Android + iOS générés')

from PIL import Image, ImageDraw, ImageFont
import sys, os

def make_icon(size, path):
    img = Image.new('RGBA', (size, size), (0,0,0,0))
    d = ImageDraw.Draw(img)
    r = int(size*0.22)
    d.rounded_rectangle([0,0,size-1,size-1], radius=r, fill=(34,197,94,255))
    font = None
    for fp in [r'C:\Windows\Fonts\msyh.ttc', r'C:\Windows\Fonts\msyhbd.ttc']:
        if os.path.exists(fp):
            try:
                font = ImageFont.truetype(fp, int(size*0.60))
                break
            except Exception:
                font = None
    if font is None:
        font = ImageFont.load_default()
    txt = '签'
    bb = d.textbbox((0,0), txt, font=font)
    w, h = bb[2]-bb[0], bb[3]-bb[1]
    d.text(((size-w)/2 - bb[0], (size-h)/2 - bb[1]), txt, font=font, fill=(255,255,255,255))
    img.save(path)
    print('saved', path)

out = sys.argv[1] if len(sys.argv) > 1 else '.'
os.makedirs(out, exist_ok=True)
for name, sz in [('icon-192.png',192),('icon-512.png',512),('apple-touch-icon.png',180)]:
    make_icon(sz, os.path.join(out, name))
print('ALL_DONE')
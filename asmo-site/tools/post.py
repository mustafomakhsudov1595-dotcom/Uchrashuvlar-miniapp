from PIL import Image
import glob,os
fs=sorted(glob.glob('../assets/renders/raw/*.png'))
bb=None
for f in fs:
    im=Image.open(f); a=im.getchannel('A').point(lambda v:255 if v>8 else 0).getbbox()
    bb=a if bb is None else (min(bb[0],a[0]),min(bb[1],a[1]),max(bb[2],a[2]),max(bb[3],a[3]))
pad=20; box=(max(bb[0]-pad,0),max(bb[1]-pad,0),min(bb[2]+pad,1400),min(bb[3]+pad,1400)); print(box)
for f in fs:
    im=Image.open(f).crop(box); im=im.resize((int(im.width*.72),int(im.height*.72)),Image.LANCZOS)
    im.save('../assets/renders/'+os.path.basename(f).replace('.png','.webp'),quality=88)
print('post ok',im.size)

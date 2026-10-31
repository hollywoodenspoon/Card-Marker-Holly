from PIL import Image
W=H=48
PAL={
 'skin':((246,206,164),(226,168,122),(184,124,88)),
 'hair':((122,90,64),(90,64,46),(60,42,32)),
 'shirt':((170,170,180),(140,140,150),(104,104,114)),
 'shorts':((112,112,122),(88,88,98),(64,64,74)),
}
OUT=(43,34,40); EYE=(43,34,40)
def ell(cx,cy,rx,ry):
  return {(x,y) for x in range(W) for y in range(H) if ((x-cx)/rx)**2+((y-cy)/ry)**2<=1.0}
def rect(x0,y0,x1,y1,cut=0):
  s={(x,y) for x in range(x0,x1+1) for y in range(y0,y1+1)}
  if cut:
    for (x,y) in [(x0,y0),(x1,y0)]: s.discard((x,y))
  return s
def shift(s,dx,dy): return {(x+dx,y+dy) for x,y in s}
def render(parts, eyes=(), extra=()):
  owner={}; col={}
  for name,mat,mask in parts:
    l,m,d=PAL[mat]
    xs=[p[0] for p in mask]; x0,x1=min(xs),max(xs)
    for (x,y) in mask:
      if not(0<=x<W and 0<=y<H): continue
      t=(x-x0)/max(1,x1-x0)
      c=m
      if t>0.68: c=d
      if (x-1,y-1) not in mask or (x-1,y) not in mask and t<0.5: c=l if t<0.6 else c
      if (x+1,y+1) not in mask and t>0.4: c=d
      # interior separation from parts behind
      for n in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
        if n in owner and owner[n]!=name and n not in mask: c=d
      owner[(x,y)]=name; col[(x,y)]=c
  for (x,y,c) in extra: col[(x,y)]=c; owner[(x,y)]='x'
  for (x,y) in eyes: col[(x,y)]=EYE
  im=Image.new('RGBA',(W,H),(0,0,0,0)); px=im.load()
  for p,c in col.items(): px[p]=c+(255,)
  for x in range(W):
    for y in range(H):
      if (x,y) in col: continue
      if any(n in col for n in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]): px[x,y]=OUT+(255,)
  return im

def view(v, breathe):
  b=1 if breathe else 0
  up=lambda s: shift(s,0,b)
  P=[]
  if v=='front':
    legs=[('legL','skin',rect(19,36,21,42)),('legR','skin',rect(26,36,28,42)),
          ('footL','skin',rect(18,43,21,44)),('footR','skin',rect(26,43,29,44))]
    shorts=('shorts','shorts',rect(18,31,29,37)-rect(23,36,24,37))
    torso=('torso','shirt',up(rect(17,22,30,31,cut=1)))
    armL=[('slvL','shirt',up(rect(14,22,16,26))),('armL','skin',up(rect(14,27,16,33)))]
    armR=[('slvR','shirt',up(rect(31,22,33,26))),('armR','skin',up(rect(31,27,33,33)))]
    neck=('neck','skin',up(rect(22,19,25,21)))
    head=up(ell(23.5,14,7,6.5))
    hair=up({p for p in ell(23.5,13.2,7.6,7) if p[1]<=11 or (p[1]<=15 and (p[0]<=17 or p[0]>=30))})
    P=legs+[shorts]+armL+armR+[torso,neck,('head','skin',head),('hair','hair',hair)]
    eyes=[(20,15+b),(20,16+b),(27,15+b),(27,16+b)]
  elif v=='front34':
    legs=[('legR','skin',rect(25,36,27,42)),('footR','skin',rect(25,43,28,44)),
          ('legL','skin',rect(19,36,21,42)),('footL','skin',rect(17,43,21,44))]
    shorts=('shorts','shorts',rect(18,31,28,37)-rect(22,36,23,37))
    torso=('torso','shirt',up(rect(18,22,29,31,cut=1)))
    armB=[('slvB','shirt',up(rect(16,22,17,26))),('armB','skin',up(rect(16,27,17,32)))]
    armF=[('slvF','shirt',up(rect(29,22,31,26))),('armF','skin',up(rect(29,27,31,33)))]
    neck=('neck','skin',up(rect(21,19,24,21)))
    head=up(ell(22.5,14,7,6.5))
    hair=up({p for p in ell(23.3,13.2,7.6,7) if p[1]<=11 or (p[1]<=17 and p[0]>=26) or (p[1]<=14 and p[0]<=17)})
    P=armB+legs+[shorts,torso]+armF+[neck,('head','skin',head),('hair','hair',hair)]
    eyes=[(18,15+b),(18,16+b),(24,15+b),(24,16+b)]
  elif v=='side':
    legs=[('legB','skin',rect(23,36,25,42)),('footB','skin',rect(21,43,25,44)),
          ('legF','skin',rect(21,36,23,42)),('footF','skin',rect(19,43,23,44))]
    shorts=('shorts','shorts',rect(20,31,26,37))
    torso=('torso','shirt',up(rect(20,22,27,31,cut=1)))
    arm=[('slv','shirt',up(rect(22,22,25,26))),('arm','skin',up(rect(22,27,24,33)))]
    neck=('neck','skin',up(rect(22,19,25,21)))
    head=up(ell(23,14,6.5,6.5))
    hair=up({p for p in ell(24,13.2,7,7) if p[1]<=11 or p[0]>=24 and p[1]<=18})
    P=legs+[shorts,torso]+[neck,('head','skin',head),('hair','hair',hair)]+arm
    eyes=[(19,15+b),(19,16+b)]
  elif v=='back34':
    legs=[('legL','skin',rect(19,36,21,42)),('footL','skin',rect(18,43,21,44)),
          ('legR','skin',rect(25,36,27,42)),('footR','skin',rect(25,43,28,44))]
    shorts=('shorts','shorts',rect(18,31,28,37)-rect(22,36,23,37))
    torso=('torso','shirt',up(rect(18,22,29,31,cut=1)))
    armF=[('slvF','shirt',up(rect(16,22,18,26))),('armF','skin',up(rect(16,27,18,33)))]
    armB=[('slvB','shirt',up(rect(29,22,30,26))),('armB','skin',up(rect(29,27,30,32)))]
    neck=('neck','skin',up(rect(22,19,25,21)))
    head=up(ell(23.5,14,7,6.5))
    hair=up({p for p in ell(23.5,13.6,7.6,7) if not (p[0]<=18 and p[1]>=15)})
    P=legs+[shorts]+armB+[torso,neck,('head','skin',head),('hair','hair',hair)]+armF
    eyes=[]
  else:
    legs=[('legL','skin',rect(19,36,21,42)),('legR','skin',rect(26,36,28,42)),
          ('footL','skin',rect(19,43,21,44)),('footR','skin',rect(26,43,28,44))]
    shorts=('shorts','shorts',rect(18,31,29,37)-rect(23,36,24,37))
    torso=('torso','shirt',up(rect(17,22,30,31,cut=1)))
    armL=[('slvL','shirt',up(rect(14,22,16,26))),('armL','skin',up(rect(14,27,16,33)))]
    armR=[('slvR','shirt',up(rect(31,22,33,26))),('armR','skin',up(rect(31,27,33,33)))]
    neck=('neck','skin',up(rect(22,19,25,21)))
    head=up(ell(23.5,14,7,6.5))
    hair=up(ell(23.5,13.6,7.6,7))
    P=legs+[shorts]+armL+armR+[torso,neck,('head','skin',head),('hair','hair',hair)]
    eyes=[]
  return render(P,eyes)

VIEWS=['front','front34','side','back34','back']
sheet=Image.new('RGBA',(W*2,H*5),(0,0,0,0))
for r,v in enumerate(VIEWS):
  for f in range(2):
    sheet.paste(view(v,f==1),(f*W,r*H))
sheet.save('art/sprites/base-template.png')
big=sheet.resize((sheet.width*6,sheet.height*6),Image.NEAREST)
bg=Image.new('RGBA',big.size,(70,74,84,255)); bg.alpha_composite(big); bg.save('art/sprites/base-template-preview.png')

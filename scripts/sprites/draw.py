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

def trap(y0,y1,top,bot,cx):
  # rows from y0..y1, width tapering from top to bot, centred on cx
  out=set()
  for y in range(y0,y1+1):
    t=(y-y0)/max(1,y1-y0); w=top+(bot-top)*t
    for x in range(round(cx-w/2),round(cx+w/2)): out.add((x,y))
  return out

def view(v, breathe):
  """RO-like proportions: a big round head (~45% of the height), a small tapered body,
  slim arms, short legs and chunky feet. Feet on row 44."""
  b=1 if breathe else 0
  up=lambda s: shift(s,0,b)
  hx={'front':24,'front34':23,'side':23,'back34':24,'back':24}[v]
  head=up(ell(hx,17,8.5,8))
  if v=='front':
    hair=up({p for p in ell(24,15.6,9.3,8.8) if p[1]<=13 or (p[1]<=15 and (p[0]+p[1])%3) or (p[1]<=21 and (p[0]<=17 or p[0]>=31))})
    torso=up(trap(25,32,11,9,24.5)); neck=up(rect(23,24,25,25))
    arms=[('armL','skin',up(trap(26,32,2,2,17.5)|rect(16,32,18,33))),('armR','skin',up(trap(26,32,2,2,31.5)|rect(30,32,32,33))),
          ('slvL','shirt',up(rect(17,25,19,28))),('slvR','shirt',up(rect(29,25,31,28)))]
    legs=[('legL','skin',rect(20,37,22,41)),('legR','skin',rect(26,37,28,41)),
          ('footL','skin',rect(19,42,22,43)),('footR','skin',rect(26,42,29,43))]
    shorts=('shorts','shorts',rect(19,32,29,37)-rect(23,36,25,37))
    P=legs+[shorts,('torso','shirt',torso)]+arms+[('neck','skin',neck),('head','skin',head),('hair','hair',hair)]
    eyes=[(x,y+b) for x in (20,21,27,28) for y in (18,19,20)]
  elif v=='front34':
    hair=up({p for p in ell(24,15.6,9.3,8.8) if p[1]<=13 or (p[1]<=15 and (p[0]+p[1])%3) or (p[1]<=22 and p[0]>=28) or (p[1]<=18 and p[0]<=16)})
    torso=up(trap(25,32,10,8,24)); neck=up(rect(22,24,24,25))
    armB=[('slvB','shirt',up(rect(18,25,19,28))),('armB','skin',up(trap(27,32,2,2,18.5)|rect(18,32,19,33)))]
    armF=[('slvF','shirt',up(rect(28,25,30,28))),('armF','skin',up(trap(26,32,2,2,29.5)|rect(28,32,30,33)))]
    legs=[('legR','skin',rect(25,37,27,41)),('footR','skin',rect(25,42,28,43)),
          ('legL','skin',rect(20,37,22,41)),('footL','skin',rect(18,42,22,43))]
    shorts=('shorts','shorts',rect(19,32,28,37)-rect(23,36,24,37))
    P=armB+legs+[shorts,('torso','shirt',torso)]+armF+[('neck','skin',neck),('head','skin',head),('hair','hair',hair)]
    eyes=[(x,y+b) for x in (18,19,24,25) for y in (18,19,20)]
  elif v=='side':
    hair=up({p for p in ell(24,15.6,9,8.8) if p[1]<=13 or p[0]>=23 and p[1]<=23})
    torso=up(trap(25,32,7,6,24)); neck=up(rect(22,24,24,25))
    arm=[('slv','shirt',up(rect(23,25,25,28))),('arm','skin',up(rect(23,29,24,33)))]
    legs=[('legB','skin',rect(23,37,25,41)),('footB','skin',rect(21,42,25,43)),
          ('legF','skin',rect(21,37,23,41)),('footF','skin',rect(18,42,23,43))]
    shorts=('shorts','shorts',rect(20,32,27,37))
    P=legs+[shorts,('torso','shirt',torso),('neck','skin',neck),('head','skin',head),('hair','hair',hair)]+arm
    eyes=[(x,y+b) for x in (16,17) for y in (18,19,20)]
  elif v=='back34':
    hair=up({p for p in ell(24.3,16,9.3,9) if not (p[0]<=17 and p[1]>=17)})
    torso=up(trap(25,32,10,8,24.5)); neck=up(rect(23,24,25,25))
    armF=[('slvF','shirt',up(rect(18,25,20,28))),('armF','skin',up(trap(26,32,2,2,18.5)|rect(17,32,19,33)))]
    armB=[('slvB','shirt',up(rect(29,25,30,28))),('armB','skin',up(trap(27,32,2,2,29.5)|rect(29,32,30,33)))]
    legs=[('legL','skin',rect(20,37,22,41)),('footL','skin',rect(19,42,22,43)),
          ('legR','skin',rect(25,37,27,41)),('footR','skin',rect(25,42,28,43))]
    shorts=('shorts','shorts',rect(19,32,28,37)-rect(23,36,24,37))
    P=legs+[shorts]+armB+[('torso','shirt',torso),('neck','skin',neck),('head','skin',head),('hair','hair',hair)]+armF
    eyes=[]
  else:
    hair=up(ell(24,16,9.3,9))
    torso=up(trap(25,32,11,9,24.5)); neck=up(rect(23,24,25,25))
    arms=[('armL','skin',up(trap(26,32,2,2,17.5)|rect(16,32,18,33))),('armR','skin',up(trap(26,32,2,2,31.5)|rect(30,32,32,33))),
          ('slvL','shirt',up(rect(17,25,19,28))),('slvR','shirt',up(rect(29,25,31,28)))]
    legs=[('legL','skin',rect(20,37,22,41)),('legR','skin',rect(26,37,28,41)),
          ('footL','skin',rect(20,42,22,43)),('footR','skin',rect(26,42,28,43))]
    shorts=('shorts','shorts',rect(19,32,29,37)-rect(23,36,25,37))
    P=legs+[shorts,('torso','shirt',torso)]+arms+[('neck','skin',neck),('head','skin',head),('hair','hair',hair)]
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

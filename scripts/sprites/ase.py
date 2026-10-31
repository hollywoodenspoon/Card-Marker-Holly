import struct, zlib, sys

from PIL import Image
def s(x): b=x.encode(); return struct.pack('<H',len(b))+b
def chunk(t,data): return struct.pack('<IH',len(data)+6,t)+data
def write(path, layers, frames, tags, w, h, ms=400):
  # layers: [name]; frames: list of {layer_index: Image}
  out=b''
  for fi,cels in enumerate(frames):
    ch=[]
    if fi==0:
      for name in layers:
        ch.append(chunk(0x2004, struct.pack('<HHHHHHB3x',3,0,0,0,0,0,255)+s(name)))
      td=struct.pack('<H8x',len(tags))
      for name,a,b,rgb in tags:
        td+=struct.pack('<HHBH6x3Bx',a,b,0,0,*rgb)+s(name)
      ch.append(chunk(0x2018,td))
    for li,img in cels.items():
      raw=img.convert('RGBA').tobytes()
      ch.append(chunk(0x2005, struct.pack('<HhhBHh5xHH',li,0,0,255,2,0,img.width,img.height)+zlib.compress(raw)))
    body=b''.join(ch)
    out+=struct.pack('<IHHH2xI',len(body)+16,0xF1FA,min(len(ch),0xFFFF),ms,len(ch))+body
  hdr=struct.pack('<IHHHHHIH II B3x H BB hh HH 84x'.replace(' ',''),
     128+len(out),0xA5E0,len(frames),w,h,32,1,100,0,0,0,0,1,1,0,0,w,h)
  assert len(hdr)==128,len(hdr)
  open(path,'wb').write(hdr+out)
def read(path):
  d=open(path,'rb').read()
  size,magic,nf,w,h,depth=struct.unpack_from('<IHHHHH',d,0)
  assert magic==0xA5E0 and size==len(d)
  p=128; info=[]
  for i in range(nf):
    fs,fm,_,ms,n=struct.unpack_from('<IHHH2xI',d,p); assert fm==0xF1FA
    q=p+16; kinds=[]
    for _ in range(n):
      cs,ct=struct.unpack_from('<IH',d,q)
      if ct==0x2005:
        li,x,y,op,typ,z,cw,chh=struct.unpack_from('<HhhBHh5xHH',d,q+6)
        raw=zlib.decompress(d[q+6+20:q+cs]); assert len(raw)==cw*chh*4
      kinds.append(hex(ct)); q+=cs
    assert q==p+fs; p+=fs; info.append(kinds)
  return nf,w,h,info

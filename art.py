"""Original code-authored pixel artwork. No original game artwork is sampled.

The atlas addresses are the original renderer's public animation layout. All
collision, timing, movement and puzzle data remain the engine's responsibility.
"""
from pathlib import Path
import json, math
R=Path(__file__).resolve().parent
P=['#fff4d8','#20211e','#e8dec1','#d6cfb6','#f36b35','#59635b','#a52d22','#665f50','#efbd55','#9cb9a8','#c4bca5','#315e4d','#ffd585','#a87425','#c5ccb6','#fff9eb']
class Pixels:
    def __init__(self,w,h,c=0):self.w=w;self.h=h;self.p=[c]*(w*h)
    def dot(self,x,y,c):
        x,y=round(x),round(y)
        if 0<=x<self.w and 0<=y<self.h:self.p[y*self.w+x]=c
    def rect(self,x,y,w,h,c):
        for yy in range(round(y),round(y+h)):
            for xx in range(round(x),round(x+w)):self.dot(xx,yy,c)
    def ellipse(self,x,y,w,h,c):
        if w<=0 or h<=0:return
        for yy in range(math.floor(y),math.ceil(y+h)):
            for xx in range(math.floor(x),math.ceil(x+w)):
                if ((xx+.5-x-w/2)/(w/2))**2+((yy+.5-y-h/2)/(h/2))**2<=1:self.dot(xx,yy,c)
    def line(self,x,y,xx,yy,c):
        n=max(abs(round(xx-x)),abs(round(yy-y)),1)
        for i in range(n+1):self.dot(x+(xx-x)*i/n,y+(yy-y)*i/n,c)
    def paste(self,a,x,y):
        for yy in range(a.h):
            for xx in range(a.w):self.dot(xx+x,yy+y,a.p[yy*a.w+xx])
    def svg(self,path,scale=1):
        # Rectangles deliberately retain the pixel grid at arbitrary scale.
        rows=[]
        for y in range(self.h):
            x=0
            while x<self.w:
                c=self.p[y*self.w+x];end=x+1
                while end<self.w and self.p[y*self.w+end]==c:end+=1
                rows.append(f'<path fill="{P[c]}" d="M{x} {y}h{end-x}v1H{x}z"/>');x=end
        path.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w*scale}" height="{self.h*scale}" viewBox="0 0 {self.w} {self.h}" shape-rendering="crispEdges">'+''.join(rows)+'</svg>')
    def dat(self,path):
        out=bytearray(self.w*self.h//2)
        for y in range(self.h):
            for x in range(self.w):
                c=self.p[y*self.w+x]
                for k in range(4):out[y*self.w//2+x//8+k*self.w//8]|=((c>>k)&1)<<(7-x%8)
        path.write_bytes(out)

def claus(p,x=0,y=0,pose=0,look=1):
    # The web presentation draws the official Claus asset at the engine position.
    # The vacated sprite area remains the same empty terrain color.
    return

def tile(kind,pose=0):
    p=Pixels(16,16)
    if kind==0:return p
    if kind==3:claus(p,pose=pose);return p
    if kind in (2,25):
        # Quiet removable terrain: a small circuit corner leaves the route legible.
        p.rect(0,0,16,16,2)
        p.line(0,15,15,15,3);p.line(15,0,15,15,3)
        p.line(5,6,8,6,10);p.line(8,6,8,10,10);p.dot(10,10,10)
        if kind==25 and pose%4>0:
            p.rect(5,5,7,5,1);p.dot(7,7,4);p.dot(10,7,4)
        return p
    if kind==1:
        # An ink-cut stone, with broad faces instead of metallic highlights.
        for y,left,right in [(2,5,10),(3,3,12),(4,2,13),(5,1,14),(6,1,14),(7,1,14),(8,1,14),(9,2,13),(10,2,13),(11,3,12),(12,4,11),(13,5,10)]:p.rect(left,y,right-left+1,1,1)
        p.rect(4,4,8,5,14);p.rect(3,5,10,3,14)
        p.line(4,9,11,9,5);p.line(5,10,10,10,5);p.line(6,11,9,11,5)
        p.line(5,4,10,4,15);p.dot(4,5,15);return p
    if kind==4:
        # Four-point spark, generous silhouette at the native 16 pixel scale.
        for y in range(1,15):
            half=min(y-1,14-y)
            half=max(0,half-1) if y<5 or y>10 else half
            p.rect(7-half,y,half*2+1,1,1)
            if half>0:p.rect(8-half,y,half*2-1,1,8 if y<8 else 4)
        p.line(7,3,4,7,15);p.line(7,4,10,7,12);p.dot(7,8,15);return p
    if kind in (6,28,29,30,32,33,34,35,36,37):
        # Structural blocks: no pseudo-metal vents competing with puzzle pieces.
        p.rect(0,0,16,16,1);p.rect(1,1,14,14,5);p.rect(2,2,12,12,1)
        p.line(3,3,12,3,5);p.line(3,3,3,12,5)
        p.line(12,4,12,12,7);p.line(4,12,12,12,7)
        if kind%3==0:p.dot(7,7,5);p.dot(8,8,5)
        elif kind%3==1:p.rect(6,6,4,4,5)
        else:p.line(5,10,10,5,5)
        return p
    if kind in (5,26,27,38,39):
        p.rect(0,0,16,16,2);p.rect(1,1,14,14,1);p.rect(3,3,10,10,2)
        p.rect(5,5,6,6,5);p.rect(7,7,2,2,4)
        for i in (4,7,10):p.rect(i,0,1,3,7);p.rect(i,13,1,3,7);p.rect(0,i,3,1,7);p.rect(13,i,3,1,7)
        return p
    if kind==7:
        p.rect(2,1,12,15,1);p.rect(4,3,8,13,11)
        p.line(5,8,10,8,0);p.line(8,6,10,8,0);p.line(10,8,8,10,0)
        p.rect(3,0,10,2,8);p.dot(11,4,9);return p
    if kind in (8,18,20):
        c={8:4,18:13,20:6}[kind]
        p.rect(2,2,12,12,1);p.rect(3,3,10,10,c);p.rect(5,3,6,4,0);p.rect(5,10,6,3,1)
        p.dot(10,11,0)
        if kind==8:p.line(5,9,8,6,1);p.line(8,6,11,9,1)
        elif kind==18:p.rect(7,7,2,2,0)
        else:p.line(6,7,10,9,0);p.line(6,9,10,7,0)
        return p
    if 9<=kind<=16 or kind in (21,22,23):
        p.rect(0,0,16,16,2);p.rect(1,1,14,14,1);p.rect(3,3,10,10,0)
        if kind in range(13,17):p.rect(1,1,14,2,4)
        dirs={9:[0],10:[1],11:[2],12:[3],13:[0],14:[1],15:[2],16:[3],21:[1,3],22:[0,2],23:[0,1,2,3]}[kind]
        for dr in dirs:
            a=[(10,7,6,4),(7,10,4,6),(5,7,9,4),(7,5,4,9)][dr]
            if dr==0:p.line(5,7,10,7,1);p.line(8,5,10,7,1);p.line(10,7,8,9,1)
            if dr==1:p.line(7,5,7,10,1);p.line(5,8,7,10,1);p.line(7,10,9,8,1)
            if dr==2:p.line(10,7,5,7,1);p.line(7,5,5,7,1);p.line(5,7,7,9,1)
            if dr==3:p.line(7,10,7,5,1);p.line(5,7,7,5,1);p.line(7,5,9,7,1)
        return p
    if kind==19:
        p.rect(1,2,14,11,1);p.rect(3,4,10,7,11)
        for i in range(3):p.rect(5+i*2,8-i,1,2+i,4 if pose%2 else 0)
        p.rect(5,13,6,1,1);p.rect(3,14,10,1,1);return p
    if kind==17:
        for dx,dy in [(-1,-1),(-1,1),(1,-1),(1,1)]:
            p.line(8+dx*2,8+dy,8+dx*6,8+dy*(4+pose%2),1)
        p.ellipse(4,4,8,8,1);p.dot(6,7,4);p.dot(9,7,4);return p
    if kind==24:
        for a in range(8):
            ang=(a+pose/8)*math.pi/4
            p.line(7.5+math.cos(ang)*3,7.5+math.sin(ang)*3,7.5+math.cos(ang)*7,7.5+math.sin(ang)*7,1)
        p.ellipse(4,4,8,8,1);p.ellipse(6,6,4,4,4);return p
    if kind==31:
        for a in range(8):
            ang=a*math.pi/4;p.line(8,8,8+math.cos(ang)*(3+pose%5),8+math.sin(ang)*(3+pose%5),4)
        return p
    return p

def shrink(a,n):
    p=Pixels(16,16);size=max(0,16-n*2)
    for y in range(size):
        for x in range(size):p.dot(x+n,y+n,a.p[min(15,y*16//size)*16+min(15,x*16//size)])
    return p

def build(res):
    meta=json.loads((R/'animation-meta.json').read_text())
    fixed=Pixels(640,16)
    for k in range(40):fixed.paste(tile(k),k*16,0)
    moving=Pixels(320,462)
    def put(p,x,y):moving.paste(p,x,y)
    # General moving object sprites, preserving original frame rectangles.
    for name,kind in [('kZonkSlideLeftAnimationFrameCoordinates',1),('kZonkSlideRightAnimationFrameCoordinates',1),('kInfotronSlideLeftAnimationFrameCoordinates',4),('kInfotronSlideRightAnimationFrameCoordinates',4)]:
        for i,(x,y) in enumerate(meta[name]):
            p=Pixels(32,16);p.paste(tile(kind,i),14-i*2 if 'Left' in name else i*2,0);put(p,x,y)
    for name,kind in [('kSnikSnakAnimationFrameCoordinates',17),('kElectronAnimationFrameCoordinates',24)]:
        for i,(x,y) in enumerate(meta[name]):
            if i<16 or 32<=i<40:p=tile(kind,i)
            else:
                p=Pixels(32,16);p.paste(tile(kind,i),14-(i%8)*2 if i>=40 else (i%8)*2,0)
            put(p,x,y)
    for i,(x,y) in enumerate(meta['kBugFrameCoordinates'][:14]):put(tile(25,i),x,y)
    for name,end in [('kRegularExplosionAnimationFrameCoordinates',0),('kInfotronExplosionAnimationFrameCoordinates',4)]:
        for i,(x,y) in enumerate(meta[name]):
            p=tile(31,7-i) if i<6 else shrink(tile(end),7-i)
            put(p,x,y)
    desc=meta['kMurphyAnimationDescriptors']
    # Portal slices share storage with walking strips: author each strip once.
    skip=set(range(15,23))|{27}
    for idx,(frames,count) in enumerate(meta['kMurphyAnimationFrameCoordinates']):
        if idx in skip:continue
        ds=next((a for a in desc if a[4]==idx),[0,0,2,16,0,0,0,0])
        w,h=ds[2]*8,ds[3]
        unique=list(dict.fromkeys(tuple(p) for p in frames))
        for j,(x,y) in enumerate(unique):
            p=Pixels(w,h);look=-1 if idx in (0,2,4,7,10,13,23,29,32) else 1
            if idx in (0,1,2,3):claus(p,0,2 if idx in (0,1) else 0,j,look)
            elif idx in (4,5,7,8,10,11,23,24):
                left=idx in (4,7,10,23);mx=14-j*2 if left else j*2
                obj={7:2,8:2,10:4,11:4,23:20,24:20}.get(idx)
                if obj is not None:p.paste(shrink(tile(obj),max(0,j-3)),0 if left else 16,0)
                claus(p,mx,0,j,look)
            elif idx in (9,12,25):p=shrink(tile({9:2,12:4,25:20}[idx]),j)
            elif idx==6:
                if j<5:claus(p,pose=j)
                else:p=shrink(tile(3),min(8,j-4))
            elif idx in (13,14,29,31,32,33):
                left=idx in (13,29,32);obj=1 if idx in (13,14) else 18
                offset=(14-j*2 if left else j*2)
                p.paste(tile(obj,j),offset if left else offset+16,0)
                claus(p,offset+16 if left else offset,0,j,look)
            elif idx in (28,30):
                p.paste(tile(18),0,0 if idx==28 else 18);claus(p,0,18 if idx==28 else 0)
            else:claus(p,pose=8 if idx in (26,35,36) and j>0 else j)
            put(p,x,y)
    # Shared portal strip and stationary poses.
    put(Pixels(16,48),304,116);put(tile(3),304,132)
    for x,y,kind in [(0,32,0),(160,64,3),(176,64,3),(192,16,3),(208,16,3),(256,164,20),(256,388,19),(272,388,19),(288,132,3)]:put(tile(kind),x,y)
    for x,y,kind in [(128,64,8),(224,82,1),(240,178,4)]:
        p=Pixels(16,18);p.paste(tile(kind),0,2);put(p,x,y)
    # Border/cursor and HUD symbols.
    border=Pixels(32,16,1);border.rect(1,1,30,14,5);border.rect(2,2,28,12,1);put(border,288,388)
    panel=Pixels(320,24,1);panel.rect(0,0,320,1,4);panel.rect(0,23,320,1,5)
    for name,p in [('FIXED.DAT',fixed),('MOVING.DAT',moving),('PANEL.DAT',panel)]:p.dat(res/name)
    # Fully new full-screen backgrounds, including the engine's fallback menus.
    for name in ['MENU.DAT','BACK.DAT','GFX.DAT','CONTROLS.DAT','TITLE.DAT','TITLE1.DAT','TITLE2.DAT']:
        p=Pixels(320,200)
        for x in range(0,320,16):p.paste(tile(6),x,0);p.paste(tile(6),x,184)
        for y in range(16,184,16):p.paste(tile(6),0,y);p.paste(tile(6),304,y)
        if name.startswith('TITLE'):
            # Scaled original Claus pixel drawing; all artwork authored above.
            mascot=tile(3)
            for y in range(16):
                for x in range(16):p.rect(128+x*4,60+y*4,4,4,mascot.p[y*16+x])
        p.dat(res/name)
        if name=='GFX.DAT':(res/name).write_bytes((res/name).read_bytes()+b'\0')
    R.joinpath('assets').mkdir(exist_ok=True)
    fixed.svg(R/'assets/tiles.svg',3);moving.svg(R/'assets/animations.svg',2);tile(3).svg(R/'assets/claus-pixel.svg',16)
    (R/'palette.json').write_text(json.dumps({'colors':P},indent=2))
    return P

if __name__=='__main__':
    import sys
    build(Path(sys.argv[1]))

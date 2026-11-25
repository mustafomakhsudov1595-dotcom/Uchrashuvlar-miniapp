import numpy as np, wave
SR=48000; DUR=10.05; N=int(SR*DUR); rng=np.random.default_rng(42)
tt=np.arange(N)/SR
L=np.zeros(N); R=np.zeros(N)
def db(x): return 10**(x/20)
def midi(m): return 440*2**((m-69)/12)
def expd(n,tau): return np.exp(-np.arange(n)/SR/tau)
def put(sig,at,g=1.0,pan=0.0):
    i=int(round(at*SR)); n=len(sig)
    if i>=N: return
    j=min(N,i+n); seg=sig[:j-i]*g
    a=(np.clip(pan,-1,1)+1)*np.pi/4; L[i:j]+=seg*np.cos(a); R[i:j]+=seg*np.sin(a)
def lpf(x,fc):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); return np.fft.irfft(X/np.sqrt(1+(f/fc)**4),len(x))
def hpf(x,fc): return x-lpf(x,fc)
def bpf(x,lo,hi): return lpf(hpf(x,lo),hi)
def noise(n): return rng.standard_normal(n)
def sine(f,n): return np.sin(2*np.pi*f*np.arange(n)/SR)
def hit(at,g=1.0,deep=True):
    n=int(1.4*SR); t=np.arange(n)/SR
    f=38+70*np.exp(-t*9); b=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*3.2)
    th=np.tanh(b*3); sat=bpf(th,140,420)*np.exp(-t*7)
    air=hpf(noise(n),3000)*np.exp(-t*9)*.25
    put(b*(1 if deep else .6)+sat*.5+air,at,g)
def whoosh(a,b,g=.3,up=True,pan=(-.8,.8)):
    n=int((b-a)*SR); x=noise(n); k=8; out=np.zeros(n)
    for i in range(k):
        s=int(n*i/k); e=int(n*(i+1)/k); c=(i+.5)/k
        out[s:e]=bpf(x[s:e],400+3000*c,1500+5000*c)
    e=(np.linspace(0,1,n)**2 if up else np.linspace(1,0,n)**2); out*=e
    put(out,a,g,pan=0.0)
def chime(at,m,g=.2,dec=2.2):
    n=int(2.0*SR); t=np.arange(n)/SR; f=midi(m)
    s=np.sin(2*np.pi*f*t)+.5*np.sin(2*np.pi*f*2.756*t)*np.exp(-t*6)+.25*np.sin(2*np.pi*f*5.4*t)*np.exp(-t*10)
    put(s*np.exp(-t*dec),at,g,pan=rng.uniform(-.6,.6))
def sparkle(a,b,rate,g):
    k=int((b-a)*rate)
    for i in range(k):
        tm=a+i/rate+rng.random()*.02; f=3000+rng.random()*6000; n=int(.05*SR)
        put(sine(f,n)*expd(n,.012),tm,g*(.4+rng.random()),pan=rng.uniform(-.9,.9))
def env_gain(t0,t1,v0,v1):
    g=np.ones(N); m=(tt>=t0)&(tt<=t1); g[m]=np.linspace(v0,v1,m.sum()); return g
# --- warm pad bed (Dm9), slow
n=N; pad=np.zeros(n)
for m in (38,45,50,53,57):
    f=midi(m)
    for d in (-.004,0,.004):
        pad+=np.sin(2*np.pi*f*(1+d)*tt)+.35*np.sin(2*np.pi*2*f*(1+d)*tt)
pad=lpf(pad,900)*0.05
# 70 BPM breathing
pad*= (0.75+0.25*np.sin(2*np.pi*(70/60/2)*tt-1.0))
# dynamics around the near-silence 1.8-2.45
dyn=np.ones(N)
dyn*=env_gain(1.2,1.9,1.0,0.0); dyn*=np.where(tt<1.9,1,np.where(tt<2.45,0.0,1))
dyn*=np.minimum(1,np.maximum(0,(tt-2.45)/0.05))*np.where(tt>=2.45,1,1)
dyn=np.where((tt>=1.9)&(tt<2.45),0.0,dyn)
dyn*=env_gain(3.7,4.0,1.0,0.35)*env_gain(4.0,4.2,1.0,1.0)
dyn*=np.where((tt>3.7)&(tt<4.2),1,1)
dyn=np.where((tt>=7.3)&(tt<7.8),dyn*0.4,dyn)
dyn*=np.where(tt>=9.3,np.maximum(0,1-(tt-9.3)/0.7),1)
padg=pad*dyn; L+=padg; R+=np.roll(padg,60)*.97
# --- 0.0 intro: low thump + chocolate swoosh
hit(0.02,.7,False); whoosh(0.05,1.45,.22,True)
# 1.5 cut: small tick
n=int(.05*SR); put(sine(900,n)*expd(n,.01),1.5,.12)
# slow riser into silence-end? silence 1.8-2.45 then BIG hit at 2.5
hit(2.5,1.25); chime(2.5,86,.22); chime(2.53,90,.16); chime(2.58,93,.14); sparkle(2.5,4.1,45,.05)
# 3.7-4.0 dip, then whip 4.17-4.21 + hits 4.2, 4.8
whoosh(3.95,4.19,.28,True); hit(4.2,.95); hit(4.8,.9); chime(4.2,81,.14)
hit(5.8,1.0); sparkle(4.85,6.4,25,.035)
hit(6.8,1.0); chime(6.82,84,.16); chime(6.9,88,.12)
# 7.3-7.8 soft, gentle glass
chime(7.45,76,.08,3.0); chime(7.62,81,.07,3.0)
hit(7.9,.95); whoosh(8.25,8.83,.32,True); sparkle(7.9,8.8,35,.045)
hit(8.83,1.0); chime(8.84,88,.14)
# final pulse 70 BPM (beat .857)
for k,tm in enumerate((9.69,)): hit(tm,.45,False)
# final soft chime tail
chime(8.9,76,.1,1.6)
# master: soft fade at end, tiny head fade
m=np.minimum(1,tt/.01)*np.where(tt>9.3,np.maximum(0,1-(tt-9.3)/0.75),1)
L*=m; R*=m
out=np.tanh(np.stack([L,R])*1.35)
pk=np.max(np.abs(out)); out*=db(-1.5)/pk
rms=20*np.log10(np.sqrt((out**2).mean())+1e-9); print('peak -1.5 dBFS, rms',round(rms,1),'dB')
w=wave.open('sladus_sound_10s.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((out.T*32767).astype(np.int16).tobytes()); w.close()

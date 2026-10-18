/* MIRA Particle Atlas — deterministic, independent Canvas 2D renderer; no network dependency.
   All positions are normalized so the reference composition survives Retina/iPhone scaling. */
(function(root){'use strict';
 const TAU=Math.PI*2;
 function randomSeed(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=t+Math.imul(t^(t>>>7),61|t)^t;return ((t^(t>>>14))>>>0)/4294967296;}}
 const rand=randomSeed(20261017);
 const gauss=()=>Math.sqrt(-2*Math.log(Math.max(1e-6,rand())))*Math.cos(TAU*rand());
 class Atlas{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.pan={x:0,y:0};this.zoom=1;this.mouseDown=null;this.active='rules';this.paused=false;this.lowMotion=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);this.particles=[];this.stars=[];this.links=[];this.semanticEdges=[];this.squares=[];this.time=0;this.fps=0;this.lastTick=0;this.count=0;this.seedCloud();this.handleEvents();this.resize();this.animate=this.animate.bind(this);requestAnimationFrame(this.animate);}
  seedCloud(){
   const mobile=window.innerWidth<520, qty=mobile?3100:6100;
   const hubs=[[.20,.16,.17,.24,0],[.67,.12,.23,.20,0],[.82,.40,.24,.29,0],[.46,.43,.16,.19,1],[.48,.57,.12,.18,1],[.33,.50,.12,.16,1],[.52,.69,.09,.09,2]];
   for(let i=0;i<qty;i++){
     const c=hubs[Math.floor(rand()*hubs.length)];let x=c[0]+gauss()*c[2],y=c[1]+gauss()*c[3];if(x<-.06||x>1.1||y<-.06||y>1.04)continue;
     const filament=rand()<.42;
     if(filament){x=Math.round(x*100)/100 +gauss()*.005;y=Math.round(y*80)/80+gauss()*.006}
     this.particles.push({x,y,r:rand()<.92?.55+rand()*1.1:1.2+rand()*1.65,a:.25+rand()*.69,phase:rand()*TAU,kind:c[4]});
   }
   for(let i=0;i<290;i++)this.stars.push({x:rand(),y:rand(),r:rand()<.92?.4:1.3,a:.15+rand()*.5,p:rand()*TAU});
   for(let i=0;i<31;i++)this.squares.push({x:.1+rand()*.84,y:.12+rand()*.80,size:2+rand()*5,color:rand()<.83?'#f8e55c':'#fe776e'});
   for(let i=0;i<88;i++){
     let a=this.particles[Math.floor(rand()*this.particles.length)];let b=null;
     for(let j=0;j<18;j++){let v=this.particles[Math.floor(rand()*this.particles.length)];if(Math.hypot(v.x-a.x,v.y-a.y)<.07 && Math.hypot(v.x-a.x,v.y-a.y)>.008){b=v;break}}
     if(b)this.links.push([a,b]);
   }
   for(let i=0;i<75;i++){const x=.23+rand()*.39,y=.26+rand()*.53;this.links.push([{x,y},{x:x+(rand()-.5)*.1,y:y+(rand()-.5)*.15}]);}
  }
  handleEvents(){
   this.canvas.addEventListener('pointerdown',e=>{this.mouseDown={x:e.clientX,y:e.clientY,p:{...this.pan}};this.canvas.setPointerCapture(e.pointerId)});
   this.canvas.addEventListener('pointermove',e=>{if(!this.mouseDown)return;this.pan.x=Math.max(-.4,Math.min(.4,this.mouseDown.p.x+(e.clientX-this.mouseDown.x)/this.width));this.pan.y=Math.max(-.38,Math.min(.38,this.mouseDown.p.y+(e.clientY-this.mouseDown.y)/this.height));});
   for(const name of ['pointerup','pointercancel','lostpointercapture'])this.canvas.addEventListener(name,()=>{this.mouseDown=null});
   this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.changeZoom(e.deltaY<0?.12:-.12)},{passive:false});
   window.addEventListener('resize',()=>this.resize());
   document.addEventListener('visibilitychange',()=>{this.lastTick=0;});
  }
  resize(){const r=this.canvas.getBoundingClientRect();this.width=Math.max(r.width,1);this.height=Math.max(r.height,1);const dpr=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.floor(this.width*dpr);this.canvas.height=Math.floor(this.height*dpr);this.ctx.setTransform(dpr,0,0,dpr,0,0);this.draw();}
  setSemanticGraph(report){const positions={role:[.34,.35],objective:[.43,.27],context:[.64,.36],roles:[.33,.57],rules:[.58,.52]};this.semanticEdges=(report?.edges||[]).map(e=>({from:positions[e.from],to:positions[e.to],weight:e.weight}));this.draw();}
  setPhase(id){this.active=id;this.draw();}
  changeZoom(v){this.zoom=Math.max(.7,Math.min(1.85,this.zoom+v));this.draw();}
  center(){this.zoom=1;this.pan={x:0,y:0};this.draw();}
  togglePause(){this.paused=!this.paused;this.draw();return this.paused;}
  project(x,y){return {x:((x-.5)*this.zoom+.5+this.pan.x)*this.width,y:((y-.5)*this.zoom+.5+this.pan.y)*this.height};}
  line(x1,y1,x2,y2,color,weight=1){let a=this.project(x1,y1),b=this.project(x2,y2);const c=this.ctx;c.strokeStyle=color;c.lineWidth=weight;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
  bezier(from,cp,to,color,weight=1){const c=this.ctx,a=this.project(...from),m=this.project(...cp),b=this.project(...to);c.strokeStyle=color;c.lineWidth=weight;c.beginPath();c.moveTo(a.x,a.y);c.quadraticCurveTo(m.x,m.y,b.x,b.y);c.stroke();}
  draw(){if(!this.width)return;let c=this.ctx,W=this.width,H=this.height,t=this.time;
   c.fillStyle='#03050a';c.fillRect(0,0,W,H);
   const clouds=[[.22,.17,.45,'89,101,118',.12],[.79,.25,.37,'86,97,117',.12],[.48,.49,.38,'16,150,127',.21],[.53,.67,.22,'12,170,152',.17]];
   for(const [x,y,r,rgb,a] of clouds){let p=this.project(x,y),radius=r*Math.max(W,H)*this.zoom;let grad=c.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);grad.addColorStop(0,`rgba(${rgb},${a})`);grad.addColorStop(.36,`rgba(${rgb},${a*.5})`);grad.addColorStop(1,`rgba(${rgb},0)`);c.fillStyle=grad;c.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);}
   for(const s of this.stars){let p=this.project(s.x,s.y);c.fillStyle=`rgba(215,229,232,${s.a*(.8+.18*Math.sin(t*.9+s.p))})`;c.fillRect(p.x,p.y,s.r,s.r);}
   c.lineWidth=.48;for(const l of this.links)this.line(l[0].x,l[0].y,l[1].x,l[1].y,'rgba(130,198,189,.095)',.55);
   // Real edges: repeated non-stopword tokens shared between sections (not model neuron activations).
   for(const e of this.semanticEdges){const mid=[(e.from[0]+e.to[0])/2,(e.from[1]+e.to[1])/2-.055];this.bezier(e.from,mid,e.to,`rgba(124,255,215,${Math.min(.58,.22+e.weight*.07)})`,Math.min(2,0.7+e.weight*.22));}
   for(let i=0;i<34;i++){let ang=i*2.399;let dist=.02+.008*(i%10);const a=[.5+.01*Math.cos(ang),.67+.008*Math.sin(ang)],b=[.5+Math.cos(ang)*(.13+dist),.67+Math.sin(ang)*(.13+dist)*.69];this.bezier(a,[.5+Math.cos(ang)*(.07+dist/2),.67+Math.sin(ang)*(.05+dist/2)],b,'rgba(110,238,214,.24)',.6+(i%5===0?.45:0));}
   for(let i=0;i<25;i++){const x=.22+(i%7)*.061,y=.35+Math.floor(i/7)*.086;this.bezier([x,y],[x+.12,y-.03],[.51,.665],'rgba(90,240,196,.10)',.55);}
   this.bezier([.19,.53],[.52,.58],[1.07,.91],'rgba(120,231,215,.24)',1.2);
   this.bezier([.06,.73],[.43,.8],[.51,.66],'rgba(130,215,201,.17)',.65);
   for(const p of this.particles){const q=this.project(p.x+(this.lowMotion?0:Math.sin(t*.32+p.phase)*.0009),p.y+(this.lowMotion?0:Math.cos(t*.3+p.phase)*.0007));let col=p.kind===0?'194,211,216':p.kind===1?'101,238,205':'103,248,224';c.fillStyle=`rgba(${col},${p.a*(.88+.12*Math.sin(t+p.phase))})`;c.fillRect(q.x,q.y,p.r,p.r);}
   for(const sq of this.squares){let p=this.project(sq.x,sq.y);c.globalAlpha=.75+.2*Math.sin(t*1.4+sq.x*30);c.fillStyle=sq.color;c.fillRect(p.x,p.y,sq.size,sq.size)}c.globalAlpha=1;
   const hub=this.project(.51,.67);let glow=c.createRadialGradient(hub.x,hub.y,0,hub.x,hub.y,68*this.zoom);glow.addColorStop(0,'rgba(63,252,201,.25)');glow.addColorStop(.45,'rgba(16,180,144,.06)');glow.addColorStop(1,'rgba(12,150,137,0)');c.fillStyle=glow;c.beginPath();c.arc(hub.x,hub.y,68*this.zoom,0,TAU);c.fill();
   c.strokeStyle='rgba(83,239,209,.54)';c.lineWidth=1; c.beginPath();c.ellipse(hub.x,hub.y,35*this.zoom,43*this.zoom,0,0,TAU);c.stroke();
   for(let i=0;i<20;i++){const angle=i*TAU/20+t*.045;const a=this.project(.51+Math.cos(angle)*.041,.67+Math.sin(angle)*.081);const b=this.project(.51+Math.cos(angle)*(.066+(i%4)*.014),.67+Math.sin(angle)*(.108+(i%4)*.02));c.strokeStyle=`rgba(120,244,210,${.22+(i%4)*.07})`;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.fillStyle='#b6ffee';c.fillRect(b.x-1,b.y-1,2,2)}
   c.save();c.translate(hub.x,hub.y);c.rotate(Math.PI/4+t*.24);c.shadowColor='#ff71a7';c.shadowBlur=15;c.fillStyle='#fa5c9b';let sz=11*this.zoom;c.fillRect(-sz/2,-sz/2,sz,sz);c.restore();
  }
  animate(ms){if(!this.lastTick)this.lastTick=ms;const elapsed=ms-this.lastTick;if(elapsed>=((this.width<600)?34:28)){this.fps=Math.max(1,Math.round(1000/elapsed));this.lastTick=ms;if(!this.paused&&!this.lowMotion&&!document.hidden){this.time+=Math.min(elapsed,65)/1000;this.draw();}this.count++;if(this.count%18===0){let e=document.getElementById('statFPS');if(e)e.textContent=this.paused?'PAUSE':String(this.fps)}}requestAnimationFrame(this.animate);}
 }
 root.MiraVisual=Atlas;
})(window);

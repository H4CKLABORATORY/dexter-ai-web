'use strict';
const el=id=>document.getElementById(id),canvas=el('canvas'),ctx=canvas.getContext('2d',{alpha:false});
const themes=[['#145572','#1b8a91','#64ffe1'],['#42286f','#995ba7','#e69dff'],['#142e51','#316d8d','#8bdcfe']];
const FLOOR=395,keys={left:false,right:false},SAVE='nexus-jump-v1';
let saved={unlocked:0,best:0};
try{const p=JSON.parse(localStorage.getItem(SAVE)||'{}');if(p&&Number.isFinite(p.best))saved.best=Math.max(0,p.best|0);if(p&&Number.isFinite(p.unlocked))saved.unlocked=Math.min(2,Math.max(0,p.unlocked|0))}catch{}
let game=null,last=0,frames=0,lastFps=0;
const r=(x,y,w,h)=>({x,y,w,h}),hit=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const clamp=(x,l,h)=>Math.max(l,Math.min(h,x));
function persist(){try{localStorage.setItem(SAVE,JSON.stringify(saved))}catch{}}
function makeWorld(n){
 const width=2500+n*240;
 const ground=[r(0,FLOOR,530,95),r(600,FLOOR,490,95),r(1160,FLOOR,490,95),r(1720,FLOOR,width-1720,95)];
 const elevated=[r(260,325,130,17),r(435,305,140,17),r(680,325,135,17),r(935,306,115,17),r(1200,330,135,17),r(1415,305,140,17),r(1800,318,150,17),r(2050,315,130,17),r(2260,323,120,17)];
 if(n>0)elevated.push(r(2445,303,145,17));
 const coins=[140,310,480,720,890,1250,1460,1880,2070,2270,2490,2670].filter(x=>x<width-120).map((x,i)=>({x,y:i%3===1?290:356,taken:false}));
 const foes=[340,800,1290,1510,1900,2170].filter(x=>x<width-130).map((x,i)=>({x,y:FLOOR-24,w:27,h:24,min:x-55,max:x+55,v:(i%2?1:-1)*(1+n*.2),alive:true}));
 return {n,width,ground,elevated,coins,foes,score:0,lives:3,cam:0,t:0,active:false,ended:false,result:'',p:{x:68,y:FLOOR-38,w:28,h:38,vy:0,grounded:true,shield:0}};
}
function refresh(){
 el('world').textContent=game.n+1;el('coins').textContent=game.score;el('lives').textContent=game.lives;el('record').textContent=saved.best;
 document.querySelectorAll('[data-world]').forEach(b=>{let n=+b.dataset.world;b.disabled=n>saved.unlocked;b.classList.toggle('active',n===game.n)});
}
function message(title,info,button){el('overlayTitle').textContent=title;el('overlayBody').textContent=info;el('play').textContent=button;el('overlay').hidden=false}
function boot(n){if(n>saved.unlocked)return;game=makeWorld(n);refresh();message('NEXUS JUMP','Mundo '+(n+1)+': llega al portal final y recoge monedas.','▶ Jugar');el('status').textContent='Mundo '+(n+1)+' listo';}
function start(){if(game.ended){let n=game.result==='win'&&game.n<2?game.n+1:game.n;boot(n)}game.active=true;game.ended=false;el('overlay').hidden=true;el('status').textContent='¡Adelante!';}
el('play').onclick=start;
function jump(){if(game?.active&&game.p.grounded){game.p.vy=-12.8;game.p.grounded=false}}
function newRecord(){if(game.score>saved.best){saved.best=game.score;persist()}}
function lose(){
 game.lives--;refresh();
 if(!game.lives){game.ended=true;game.result='lose';game.active=false;newRecord();message('FIN DE PARTIDA','Has recogido '+game.score+' monedas. ¡Inténtalo otra vez!','↻ Reintentar');}
 else{game.p={x:68,y:FLOOR-38,w:28,h:38,vy:0,grounded:true,shield:115};game.cam=0;el('status').textContent='Te queda '+game.lives+' vidas.'}
}
function win(){
 game.active=false;game.ended=true;game.result='win';newRecord();
 if(game.n<2){saved.unlocked=Math.max(saved.unlocked,game.n+1);persist()}
 refresh();message('¡PORTAL ACTIVADO!','Conseguiste '+game.score+' monedas. '+(game.n<2?'Desbloqueaste el siguiente mundo.':'¡Ganaste los tres mundos!'),game.n<2?'▶ Siguiente mundo':'↻ Volver a jugar');
}
function step(dt){
 const g=game;if(!g?.active||g.ended)return;const d=clamp(dt/16.67,0,2),p=g.p,solids=g.ground.concat(g.elevated);g.t+=d;
 if(p.shield>0)p.shield-=d;
 const dx=((keys.right?1:0)-(keys.left?1:0))*3.7*d,oldX=p.x;p.x=clamp(p.x+dx,0,g.width-p.w);
 for(const b of solids)if(hit(p,b)){
  if(dx>0&&oldX+p.w<=b.x+4)p.x=b.x-p.w;
  else if(dx<0&&oldX>=b.x+b.w-4)p.x=b.x+b.w;
 }
 const oldY=p.y;p.vy=clamp(p.vy+.62*d,-18,14);p.y+=p.vy*d;p.grounded=false;
 for(const b of solids)if(hit(p,b)){
  if(p.vy>=0&&oldY+p.h<=b.y+7){p.y=b.y-p.h;p.vy=0;p.grounded=true}
  else if(p.vy<0&&oldY>=b.y+b.h-4){p.y=b.y+b.h;p.vy=0}
 }
 if(p.y>525){lose();return}
 for(const coin of g.coins){if(coin.taken)continue;const x=p.x+p.w/2-coin.x,y=p.y+p.h/2-coin.y;
  if(x*x+y*y<650){coin.taken=true;g.score++;refresh()}}
 for(const e of g.foes){if(!e.alive)continue;e.x+=e.v*d;
  if(e.x<e.min){e.x=e.min;e.v=Math.abs(e.v)}if(e.x>e.max){e.x=e.max;e.v=-Math.abs(e.v)}
  if(hit(p,e)){
   if(p.vy>0&&oldY+p.h<e.y+10){e.alive=false;p.vy=-8.5;g.score+=2;refresh()}
   else if(p.shield<=0){lose();return}
  }
 }
 if(p.x>=g.width-130){win();return}
 g.cam=clamp(p.x-250,0,g.width-800);
}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h)}
function paint(){
 if(!game)return;const g=game,t=themes[g.n],cam=g.cam;const gradient=ctx.createLinearGradient(0,0,0,480);gradient.addColorStop(0,t[0]);gradient.addColorStop(1,t[1]);
 ctx.fillStyle=gradient;ctx.fillRect(0,0,800,480);
 for(let i=0;i<17;i++){let x=((i*195-cam*.13)%1000+1000)%1000-80;ctx.globalAlpha=.19;rect(x,45+(i*53)%190,86,20,'#c6f5ff');ctx.globalAlpha=1}
 ctx.fillStyle='#153a5a88';for(let i=0;i<13;i++){const x=i*270-cam*.40;ctx.beginPath();ctx.moveTo(x-150,410);ctx.quadraticCurveTo(x+20,180+(i%3)*45,x+230,410);ctx.fill()}
 ctx.save();ctx.translate(-cam,0);
 for(const b of g.ground){rect(b.x,b.y,b.w,b.h,'#233755');rect(b.x,b.y,b.w,9,t[2]);for(let x=b.x+20;x<b.x+b.w;x+=60)rect(x,b.y+30,23,11,'#ffffff18')}
 for(const b of g.elevated){rect(b.x,b.y,b.w,b.h,'#254263');rect(b.x,b.y,b.w,6,t[2])}
 for(const c of g.coins){if(c.taken)continue;ctx.beginPath();ctx.arc(c.x,c.y+Math.sin(g.t*.06+c.x)*3,10,0,Math.PI*2);ctx.fillStyle='#ffd365';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#fff5ae';ctx.stroke()}
 for(const e of g.foes){if(!e.alive)continue;rect(e.x,e.y,e.w,e.h,'#f071b2');rect(e.x+6,e.y+7,5,5,'white');rect(e.x+17,e.y+7,5,5,'white')}
 ctx.save();ctx.translate(g.width-90,FLOOR-48);ctx.shadowBlur=20;ctx.shadowColor='#82fffc';ctx.strokeStyle='#8efbff';ctx.lineWidth=8;ctx.beginPath();ctx.ellipse(0,0,22,39,0,0,Math.PI*2);ctx.stroke();ctx.restore();
 const p=g.p;if(p.shield<=0||Math.floor(p.shield/7)%2===0){rect(p.x,p.y,p.w,p.h,'#81ffe9');rect(p.x+5,p.y+5,18,11,'#146079');rect(p.x+9,p.y+8,4,4,'white');rect(p.x+18,p.y+8,4,4,'white');rect(p.x+4,p.y+35,8,5,'#8d8cfc');rect(p.x+17,p.y+35,8,5,'#8d8cfc')}
 ctx.restore();
}
function animate(now){const dt=last?now-last:16.67;last=now;step(dt);paint();frames++;
 if(now-lastFps>1000){el('fps').textContent=Math.round(frames*1000/(now-lastFps))+' FPS';frames=0;lastFps=now}
 requestAnimationFrame(animate);
}
document.querySelectorAll('[data-world]').forEach(b=>b.addEventListener('click',()=>boot(+b.dataset.world)));
document.querySelectorAll('[data-key]').forEach(b=>{
 const key=b.dataset.key;
 b.onpointerdown=e=>{e.preventDefault();if(key==='jump')jump();else keys[key]=true;b.classList.add('pressed');try{b.setPointerCapture(e.pointerId)}catch{}};
 const release=e=>{e.preventDefault();if(key!=='jump')keys[key]=false;b.classList.remove('pressed')};
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,release);
});
document.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp',' ','a','d','w'].includes(e.key))e.preventDefault();
 if(['ArrowLeft','a'].includes(e.key))keys.left=true;if(['ArrowRight','d'].includes(e.key))keys.right=true;
 if(['ArrowUp',' ','w'].includes(e.key)&&!e.repeat)jump()});
document.addEventListener('keyup',e=>{if(['ArrowLeft','a'].includes(e.key))keys.left=false;if(['ArrowRight','d'].includes(e.key))keys.right=false});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.left=false;keys.right=false;if(game?.active){game.active=false;message('PAUSA','La partida se ha pausado mientras estabas fuera de la app.','▶ Continuar')}}});
window.__NEXUS_JUMP_STATUS=()=>({world:game?.n,score:game?.score,lives:game?.lives,active:game?.active,x:game?.p?.x,best:saved.best,unlocked:saved.unlocked});
boot(0);requestAnimationFrame(animate);

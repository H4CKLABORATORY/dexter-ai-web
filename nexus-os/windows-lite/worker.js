'use strict';
// Bounded background CPU test, executed in a Web Worker on the phone.
self.onmessage=event=>{
 const count=Math.min(1500000,Math.max(1000,Number(event.data?.iterations)||800000));
 const started=performance.now();
 let acc=0;
 for(let i=1;i<=count;i++)acc+=Math.sqrt(i%1009)*Math.sin(i%79);
 self.postMessage({ms:Math.round((performance.now()-started)*10)/10,iterations:count,result:Number(acc.toFixed(3))});
};

const clamp=x=>Math.min(1,Math.max(0,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};

export function initPageMotion(){
 const roots=[...document.querySelectorAll('[data-scroll-story]')];
 const reduce=matchMedia('(prefers-reduced-motion:reduce)');
 const compact=matchMedia('(max-height:650px), (max-width:700px) and (max-height:740px)');
 const mobile=matchMedia('(max-width:700px)');
 const data=roots.map(root=>({root,stage:root.querySelector('[data-story-stage]'),panels:[...root.querySelectorAll('[data-story-panel]')],visuals:[...root.querySelectorAll('[data-visual-panel]')],steps:[...root.querySelectorAll('[data-story-step]')],draws:[...root.querySelectorAll('[data-draw]')],start:0,range:1,index:-1})).filter(d=>d.stage&&d.panels.length);
 const parallax=[...document.querySelectorAll('[data-parallax]')];
 let enabled=!reduce.matches&&!compact.matches,frame=0,stopped=false;
 const meter=document.createElement('div');meter.className='cp-scroll-meter';meter.setAttribute('aria-hidden','true');document.body.appendChild(meter);
 for(const d of data){for(const path of d.draws){path.setAttribute('pathLength','1');path.style.strokeDasharray='1';}}
 function reset(d){d.root.classList.remove('is-pinned','motion-active');d.root.dataset.activeScene='0';d.panels.forEach(p=>{p.inert=false;p.removeAttribute('aria-hidden');p.style.removeProperty('opacity');p.style.removeProperty('transform');});d.visuals.forEach((v,i)=>{v.style.opacity=i===0?'1':'0';v.style.removeProperty('transform');});d.draws.forEach(p=>p.style.setProperty('--draw-offset','0'));}
 function measure(){
  if(stopped)return;
  const header=document.querySelector('.header-inner');
  if(header)document.body.style.setProperty('--cp-header',`${header.getBoundingClientRect().height}px`);
  for(const d of data){if(enabled){d.root.classList.add('is-pinned','motion-active');d.start=d.root.getBoundingClientRect().top+scrollY;d.range=Math.max(1,d.root.offsetHeight-d.stage.offsetHeight);}else reset(d);}
  schedule();
 }
 function paint(){
  frame=0;if(stopped)return;
  // Earlier stories can finish loading after this controller. Read the actual
  // document positions before painting so later stories never inherit stale offsets.
  if(enabled)for(const d of data){d.start=d.root.getBoundingClientRect().top+scrollY;d.range=Math.max(1,d.root.offsetHeight-d.stage.offsetHeight);}
  const docRange=Math.max(1,document.documentElement.scrollHeight-innerHeight);
  meter.style.setProperty('--document-progress',String(scrollY/docRange));
  if(!enabled){meter.style.display='none';parallax.forEach(e=>{e.style.removeProperty('transform');e.style.removeProperty('opacity');});return;}
  meter.style.display='';
  for(const d of data){
   const p=clamp((scrollY-d.start)/d.range),seq=p*d.panels.length,index=Math.min(d.panels.length-1,Math.floor(seq));
   d.root.style.setProperty('--scene-progress',p.toFixed(4));
   d.panels.forEach((panel,i)=>{
    const incoming=i===0?1:smooth(i-.12,i+.12,seq),outgoing=i===d.panels.length-1?1:1-smooth(i+.88,i+1.12,seq),opacity=incoming*outgoing;
    const offset=i>seq?28*(1-incoming):-22*(1-outgoing);
    panel.style.opacity=opacity.toFixed(4);panel.style.transform=mobile.matches?`translateY(${offset}px)`:`translateY(calc(-50% + ${offset}px))`;
    panel.inert=i!==index;panel.setAttribute('aria-hidden',String(i!==index));
    const visual=d.visuals[i];if(visual){visual.style.opacity=opacity.toFixed(4);visual.style.transform=`translateY(${offset*.45}px)`;}
   });
   d.draws.forEach(path=>{const start=Number(path.dataset.drawStart)||0,end=Number(path.dataset.drawEnd)||1;path.style.setProperty('--draw-offset',String(1-smooth(start,end,p)));});
   if(index!==d.index){d.index=index;d.root.dataset.activeScene=String(index);d.steps.forEach((button,i)=>{if(i===index)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});}
  }
  for(const el of parallax){const r=el.closest('.cp-hero,.home-horizon')?.getBoundingClientRect()||el.getBoundingClientRect();const amount=Number(el.dataset.parallax)||35;const p=clamp(-r.top/Math.max(1,r.height));el.style.transform=`translateY(${p*amount}px) scale(${1+p*.035})`;}
 }
 function schedule(){if(!frame&&!stopped)frame=requestAnimationFrame(paint);}
 function state(){enabled=!reduce.matches&&!compact.matches;data.forEach(d=>d.index=-1);measure();}
 function moveTo(d,index,behavior='smooth'){if(!enabled)return;window.scrollTo({top:d.start+d.range*((index+.42)/d.panels.length),behavior});}
 function onClick(event){const b=event.target.closest('[data-story-step]');if(!b)return;const d=data.find(d=>d.root.contains(b));if(d)moveTo(d,Math.min(d.panels.length-1,Number(b.dataset.storyStep)||0));}
 function honorHash(){if(!enabled||!location.hash)return;let target;try{target=document.getElementById(decodeURIComponent(location.hash.slice(1)));}catch{return;}if(!target)return;for(const d of data){const i=d.panels.findIndex(panel=>panel===target||panel.contains(target));if(i>=0){moveTo(d,i,'instant');return;}}}
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',measure,{passive:true});window.addEventListener('hashchange',honorHash);document.addEventListener('click',onClick);reduce.addEventListener('change',state);compact.addEventListener('change',state);mobile.addEventListener('change',measure);
 const layoutObserver='ResizeObserver'in window?new ResizeObserver(measure):null;
 layoutObserver?.observe(document.querySelector('main')||document.body);
 measure();requestAnimationFrame(honorHash);document.fonts?.ready.then(()=>{if(!stopped){measure();honorHash();}});
 return()=>{stopped=true;cancelAnimationFrame(frame);layoutObserver?.disconnect();window.removeEventListener('scroll',schedule);window.removeEventListener('resize',measure);window.removeEventListener('hashchange',honorHash);document.removeEventListener('click',onClick);reduce.removeEventListener('change',state);compact.removeEventListener('change',state);mobile.removeEventListener('change',measure);meter.remove();data.forEach(reset);};
}

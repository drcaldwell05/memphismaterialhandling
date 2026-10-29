import { createWarehouseScene } from './warehouse-scene.js';

const clamp=value=>Math.min(1,Math.max(0,value));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>Math.round(a+(b-a)*t);

export async function initWarehouseJourney(root){
  if(!root)return ()=>{};
  const hero=document.querySelector('.flow-hero');
  const heroPhoto=hero?.querySelector('.flow-hero-photo');
  const heroCopy=hero?.querySelector('.flow-hero-copy');
  const stage=root.querySelector('.journey-sticky');
  const model=root.querySelector('.journey-model');
  const chapters=[...root.querySelectorAll('.journey-chapter')];
  const steps=[...root.querySelectorAll('[data-step]')];
  const counter=root.querySelector('.journey-counter');
  const hint=root.querySelector('.journey-hint');
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const mobile=matchMedia('(max-width:700px)');
  const compact=matchMedia('(max-height:650px), (max-width:700px) and (max-height:740px)');
  const names=['The floor plan','The right equipment','One connected system','On the warehouse floor'];
  let scene,frame=0,disposed=false,lastIndex=-1,visible=true,start=0,range=1;
  let motion=!media.matches&&!compact.matches;

  function showStatic(){
    root.classList.remove('is-scroll-ready');
    root.style.removeProperty('--journey-photo');
    root.style.removeProperty('--journey-ink');
    root.style.removeProperty('--journey-muted');
    model.style.opacity='1';
    model.style.transform='none';
    chapters.forEach(chapter=>{chapter.inert=false;chapter.removeAttribute('aria-hidden');chapter.style.removeProperty('opacity');chapter.style.removeProperty('transform');});
    scene?.setProgress(1);
    if(heroPhoto)heroPhoto.style.transform='none';
    if(heroCopy){heroCopy.style.opacity='1';heroCopy.style.transform='none';}
  }
  function measure(){
    if(disposed)return;
    if(motion){root.classList.add('is-scroll-ready');start=root.getBoundingClientRect().top+scrollY;range=Math.max(1,root.offsetHeight-stage.offsetHeight);}
    scene?.resize();
    schedule();
  }
  function update(){
    frame=0;
    if(disposed||!motion)return;
    const hp=hero?clamp(-hero.getBoundingClientRect().top/Math.max(1,hero.offsetHeight)):0;
    if(hero){hero.style.setProperty('--hero-progress',String(hp));}
    if(heroPhoto)heroPhoto.style.transform=`translateY(${hp*74}px) scale(${1.055+hp*.055})`;
    if(heroCopy){heroCopy.style.transform=`translateY(${-hp*85}px)`;heroCopy.style.opacity=String(1-smooth(.15,.95,hp));}

    const p=clamp((scrollY-start)/range);
    const photo=smooth(.76,.96,p);
    const ink=`rgb(${mix(24,246,photo)},${mix(62,245,photo)},${mix(52,240,photo)})`;
    const muted=`rgb(${mix(104,206,photo)},${mix(117,218,photo)},${mix(108,202,photo)})`;
    root.style.setProperty('--journey-progress',p.toFixed(4));
    root.style.setProperty('--journey-photo',photo.toFixed(4));
    root.style.setProperty('--photo-scale',String(1.1-photo*.1));
    root.style.setProperty('--journey-ink',ink);
    root.style.setProperty('--journey-muted',muted);
    model.style.opacity=String(1-smooth(.76,.93,p));
    model.style.transform=`translateX(${-photo*3}%) scale(${1+photo*.08})`;
    if(visible||p===0||p===1)scene?.setProgress(clamp(p/.8));

    const sequence=p*4;
    const index=Math.min(3,Math.floor(sequence));
    chapters.forEach((chapter,i)=>{
      let opacity=0,offset=0;
      const incoming=smooth(i-.12,i+.12,sequence);
      const outgoing=i===3?1:1-smooth(i+.88,i+1.12,sequence);
      opacity=(i===0?1:incoming)*outgoing;
      if(i>sequence)offset=34*(1-incoming);
      else offset=-26*(1-outgoing);
      chapter.style.opacity=opacity.toFixed(4);
      chapter.style.transform=mobile.matches?`translateY(${offset}px)`:`translateY(calc(-50% + ${offset}px))`;
      chapter.inert=i!==index;
      chapter.setAttribute('aria-hidden',String(i!==index));
    });
    if(index!==lastIndex){
      lastIndex=index;
      steps.forEach((button,i)=>{if(i===index)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
      counter.textContent=`0${index+1} / ${names[index]}`;
      hint.innerHTML=index===3?'From a clear plan to a working system <span aria-hidden="true">↓</span>':'Scroll to shape the system <span aria-hidden="true">↓</span>';
    }
  }
  function schedule(){if(!frame&&motion&&!disposed)frame=requestAnimationFrame(update);}
  function goTo(event){
    const button=event.target.closest('[data-step]');
    if(!button||!steps.includes(button)||!motion)return;
    const index=Number(button.dataset.step);
    window.scrollTo({top:start+range*(index===3?.88:(index+.38)/4),behavior:'smooth'});
  }
  function setMotion(){motion=!media.matches&&!compact.matches;lastIndex=-1;if(motion)measure();else{cancelAnimationFrame(frame);frame=0;showStatic();}}
  root.classList.toggle('is-scroll-ready',motion);
  if(motion){chapters.forEach((chapter,i)=>{chapter.style.opacity=i===0?'1':'0';chapter.inert=i!==0;chapter.setAttribute('aria-hidden',String(i!==0));});}
  let observer;
  if('IntersectionObserver'in window){observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();},{rootMargin:'200px'});observer.observe(root);}
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',measure,{passive:true});
  media.addEventListener('change',setMotion);
  compact.addEventListener('change',setMotion);
  mobile.addEventListener('change',measure);
  root.addEventListener('click',goTo);
  measure();
  try{scene=await createWarehouseScene(model);if(disposed){scene?.destroy();return ()=>{};}if(!motion)showStatic();else measure();}catch{model.innerHTML='<img src="assets/warehouse.webp" alt="A Memphis Material Handling warehouse installation" style="width:100%;height:100%;object-fit:cover">';showStatic();}
  document.fonts?.ready.then(()=>{if(!disposed)measure();});
  return()=>{disposed=true;cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',measure);media.removeEventListener('change',setMotion);compact.removeEventListener('change',setMotion);mobile.removeEventListener('change',measure);root.removeEventListener('click',goTo);observer?.disconnect();scene?.destroy();};
}

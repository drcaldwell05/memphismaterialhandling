// A continuous, keyboard-friendly form. Answers stay in memory until sent.
const form = document.getElementById('project-form');
const dialog = document.getElementById('project-review');
const sections = [...document.querySelectorAll('[data-pp-section]')];
const steps = [...document.querySelectorAll('[data-pp-step]')];
const needsInputs = [...form.querySelectorAll('input[name="needs"]')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const fields = ['description','location','timing','name','company','email','phone'];
const needNames = { storage:'More storage', location:'A new space or relocation', flow:'Better product movement', equipment:'New or used equipment', installation:'Equipment installation or rearrangement', clearout:'Surplus equipment or a facility clearout', unsure:'Help finding a starting point' };
const connection = document.querySelector('[data-pp-connection]');
const summary = document.querySelector('[data-pp-summary]');
const sendButton = document.querySelector('[data-pp-send]');
const sendError = document.querySelector('[data-pp-send-error]');
const reconnectButton = document.querySelector('[data-pp-reconnect]');
const verification = document.querySelector('[data-pp-verification]');
const verificationStatus = document.querySelector('[data-pp-verification-status]');
const verificationRetry = document.querySelector('[data-pp-verify-retry]');
let config = { enabled:false };
let sending = false;
let accepted = false;
let attemptId = '';
let attemptedAnswers = '';
let submission = null;
let finalError = false;
let verificationToken = '';
let verificationWidget;
let verificationSiteKey = '';
let verificationSize = '';
let verificationScript;
let lastTrigger;
let restoreReviewFocus = true;
let frame = 0;
let revealObserver;
const visited = new Set([0]);
const value = name => form.elements.namedItem(name)?.value.trim() || '';
const selectedNeeds = () => needsInputs.filter(input => input.checked).map(input => input.value);
const currentAnswers = () => ({ needs:selectedNeeds(), ...Object.fromEntries(fields.map(name => [name,value(name)])), website:value('website') });
const requestUUID = () => crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, digit => (Number(digit)^crypto.getRandomValues(new Uint8Array(1))[0]&15>>Number(digit)/4).toString(16));
function setError(name, message = '') {
  const error = document.getElementById(`project-${name}-error`);
  if (error) error.textContent = message;
  const controls = name === 'needs' ? needsInputs : [form.elements.namedItem(name)].filter(Boolean);
  for (const input of controls) {
    if (message) input.setAttribute('aria-invalid','true');
    else input.removeAttribute('aria-invalid');
  }
}
function errorsFor(data, stage) {
  const errors = {};
  if ((stage === undefined || stage === 0) && data.needs.length === 0) errors.needs = 'Choose at least one option. “I’m not sure” is fine, too.';
  if (stage === undefined || stage === 1) {
    if (data.description.length > 3000) errors.description = 'Keep the project description within 3,000 characters.';
    if (data.location.length > 180) errors.location = 'Keep the location within 180 characters.';
  }
  if (stage === undefined || stage === 2) {
    if (!data.name) errors.name = 'Please enter your name.';
    if (!data.email && !data.phone) errors.email = 'Add an email address or phone number so we can reach you.';
    if (data.email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(data.email)) errors.email = 'Please enter a valid email address.';
    if (data.phone && (!/^[+\d\s().#x-]+$/i.test(data.phone) || data.phone.replace(/\D/g,'').length < 7)) errors.phone = 'Please enter a phone number, including the area code.';
  }
  return errors;
}
function showErrors(errors) {
  for (const [name,message] of Object.entries(errors)) setError(name,message);
  const first = Object.keys(errors)[0];
  const input = first === 'needs' ? needsInputs[0] : form.elements.namedItem(first);
  if (input) {
    input.scrollIntoView({ block:'center', behavior:reduced.matches ? 'instant' : 'smooth' });
    input.focus({ preventScroll:true });
  }
  return Boolean(first);
}
function clearErrors() { ['needs',...fields].forEach(name => setError(name)); }
function moveTo(index, focus = true) {
  const section = sections[index];
  if (!section) return;
  visited.add(index);
  section.classList.add('pp-seen');
  section.scrollIntoView({ behavior:reduced.matches ? 'instant' : 'smooth', block:'start' });
  if (focus) section.querySelector('h2')?.focus({ preventScroll:true });
}
function requestPaint() { if (!frame) frame = requestAnimationFrame(paint); }
function paint() {
  frame = 0;
  const headerHeight = document.querySelector('.header-inner')?.getBoundingClientRect().height || 74;
  document.body.style.setProperty('--pp-header',`${headerHeight}px`);
  const focusLine = headerHeight + (innerWidth <= 700 ? 115 : 130);
  let active = 0;
  sections.forEach((section,index) => { if (section.getBoundingClientRect().top <= focusLine) { active=index; visited.add(index); } });
  const answers = currentAnswers();
  steps.forEach((link,index) => {
    if (index === active) link.setAttribute('aria-current','step');
    else link.removeAttribute('aria-current');
    const complete = visited.has(index) && Object.keys(errorsFor(answers,index)).length === 0;
    link.classList.toggle('is-complete',complete);
    link.querySelector('.pp-step-mark').textContent = complete ? '✓' : String(index+1).padStart(2,'0');
  });
  if (!reduced.matches) {
    const opening = document.querySelector('.pp-opening');
    if (opening) opening.style.setProperty('--pp-opening-progress', Math.min(1, Math.max(0,-opening.getBoundingClientRect().top/opening.offsetHeight)));
  }
}
function setMotion() {
  revealObserver?.disconnect();
  document.body.classList.toggle('pp-motion',!reduced.matches);
  if (reduced.matches || !('IntersectionObserver' in window)) sections.forEach(section => section.classList.add('pp-seen'));
  else {
    revealObserver = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('pp-seen');
        revealObserver.unobserve(entry.target);
      }
    }, { threshold:.07, rootMargin:'0px 0px -25px 0px' });
    sections.forEach(section => {
      if (section.getBoundingClientRect().top < innerHeight) section.classList.add('pp-seen');
      else revealObserver.observe(section);
    });
  }
  requestPaint();
}
function invalidateAttempt() {
  if (submission || finalError) return;
  if (attemptId && attemptedAnswers === JSON.stringify(currentAnswers())) return;
  attemptId = ''; attemptedAnswers = '';
  sendError.hidden = true; sendError.textContent = '';
}
for (const input of needsInputs) input.addEventListener('change',() => {
  if (input.checked && input.value === 'unsure') needsInputs.forEach(other => { if (other !== input) other.checked = false; });
  else if (input.checked) needsInputs.find(other => other.value === 'unsure').checked = false;
  needsInputs.forEach(other => other.closest('.pp-choice').querySelector('.pp-choice-mark').textContent = other.checked ? '✓' : '+');
  setError('needs'); invalidateAttempt(); requestPaint();
});
form.addEventListener('input',event => {
  const name = event.target.name;
  if (!name || name === 'needs') return;
  setError(name);
  if (name === 'email' || name === 'phone') { setError('email'); setError('phone'); }
  invalidateAttempt(); requestPaint();
});
form.addEventListener('change',event => { if (event.target.name === 'timing') { invalidateAttempt(); requestPaint(); } });
document.querySelectorAll('[data-pp-next]').forEach(button => button.addEventListener('click',() => {
  const target = Number(button.dataset.ppNext);
  const errors = errorsFor(currentAnswers(),target-1);
  if (showErrors(errors)) return;
  moveTo(target);
}));
steps.forEach(link => link.addEventListener('click',event => {
  event.preventDefault(); moveTo(Number(link.dataset.ppStep));
}));
function appendReviewGroup(title, paragraphs, index) {
  const group = document.createElement('section');group.className = 'pp-review-group';
  const top = document.createElement('div');const heading = document.createElement('h3');heading.textContent = title;
  const edit = document.createElement('button');edit.type='button';edit.className='pp-review-edit';edit.textContent='Edit';edit.setAttribute('aria-label',`Edit ${title.toLowerCase()}`);
  edit.addEventListener('click',() => { if (sending) return; restoreReviewFocus=false; dialog.close(); moveTo(index); });
  top.append(heading,edit);group.append(top);
  for (const text of paragraphs.filter(Boolean)) { const p=document.createElement('p');p.textContent=text;group.append(p); }
  summary.append(group);
}
function renderReview(data) {
  summary.replaceChildren();
  appendReviewGroup('Your project',[data.needs.map(need => needNames[need]).join(' · '),data.description || 'We can talk through the details together.'],0);
  appendReviewGroup('Project context',[data.location || 'Location to be discussed',data.timing],1);
  appendReviewGroup('How to reach you',[data.name,data.company,data.email,data.phone],2);
}
function updateSendState() {
  sendButton.disabled = sending || finalError || !config.enabled || (!submission && !verificationToken);
  sendButton.querySelector('span:first-child').textContent = sending ? 'Sending your request…' : attemptId ? 'Check submission' : 'Send project request';
  const locked = sending || Boolean(submission) || finalError;
  form.querySelectorAll('input,select,textarea,.pp-next').forEach(control => { control.disabled=locked; });
  form.querySelector('.pp-review-button').disabled=sending;
  dialog.querySelectorAll('.pp-review-edit').forEach(button => { button.disabled=locked; });
  dialog.querySelectorAll('[data-pp-close]').forEach(button => { button.disabled=sending; });
  verification.hidden=Boolean(submission)||finalError||accepted;
  if (submission || finalError) verificationRetry.hidden=true;
  dialog.setAttribute('aria-busy',String(sending));
}
function setSending(state) { sending=state; updateSendState(); }
function verificationProblem(message) {
  verificationToken='';
  verificationStatus.textContent=message;
  verificationRetry.hidden=false;
  updateSendState();
}
function loadVerificationScript() {
  if (window.turnstile) return Promise.resolve();
  if (verificationScript) return verificationScript;
  verificationScript = new Promise((resolve,reject) => {
    let script=document.querySelector('script[data-project-verification]');
    if (!script) {
      script=document.createElement('script');
      script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async=true;script.defer=true;script.dataset.projectVerification='true';
      document.head.append(script);
    }
    const cleanup=()=>{ clearTimeout(timer);script.removeEventListener('load',loaded);script.removeEventListener('error',failed); };
    const loaded=()=>{ cleanup();if(window.turnstile)resolve();else failed(); };
    const failed=()=>{ cleanup();script.remove();verificationScript=undefined;reject(new Error('verification-unavailable')); };
    const timer=setTimeout(failed,15000);
    script.addEventListener('load',loaded);script.addEventListener('error',failed);
    if(window.turnstile)loaded();
  });
  return verificationScript;
}
async function ensureVerification(renew=false) {
  if (!dialog.open || !config.enabled || !config.siteKey || submission || finalError) return;
  verification.hidden=false;
  const size=verification.getBoundingClientRect().width<300?'compact':'flexible';
  if (verificationWidget !== undefined && (renew || verificationSiteKey!==config.siteKey || verificationSize!==size)) {
    window.turnstile?.remove(verificationWidget);verificationWidget=undefined;verificationToken='';
  }
  if (verificationWidget !== undefined) return;
  verificationStatus.textContent='A quick verification before sending.';verificationRetry.hidden=true;
  try {
    await loadVerificationScript();
    if (!dialog.open || verificationWidget!==undefined || !config.enabled || submission || finalError) return;
    verificationSiteKey=config.siteKey;verificationSize=size;
    verificationWidget=window.turnstile.render(verification,{
      sitekey:config.siteKey,action:'project_request',theme:'light',size,
      callback:token=>{ verificationToken=token;verificationStatus.textContent='Verification complete.';verificationRetry.hidden=true;updateSendState(); },
      'expired-callback':()=>verificationProblem('Verification expired. Complete it again before sending.'),
      'error-callback':()=>verificationProblem('Verification could not finish. Try again, or call 901-947-7225.'),
    });
  } catch { verificationProblem('Verification did not load. Try again, or call 901-947-7225.'); }
}
async function loadConfig() {
  config={enabled:false};updateSendState();reconnectButton.hidden=true;
  connection.textContent='Connecting to project requests…';
  try {
    const response=await fetch('/api/project-requests/config',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(12000)});
    const result=response.ok?await response.json():{};
    const siteKey=typeof result.siteKey==='string'&&result.siteKey.length<200?result.siteKey:'';
    config={enabled:result.enabled===true&&Boolean(siteKey),siteKey};
  } catch { config={enabled:false}; }
  if (config.enabled) {
    connection.textContent='';
    if (sendError.dataset.connection==='true') {sendError.hidden=true;sendError.textContent='';}
    void ensureVerification();
  } else {
    connection.textContent='Online sending is unavailable right now. Your answers stay here. You can also call 901-947-7225.';
    reconnectButton.hidden=false;
    verificationStatus.textContent='Online sending is unavailable. You can call 901-947-7225.';
  }
  updateSendState();
}
verificationRetry.addEventListener('click',()=>{void ensureVerification(true);});
form.addEventListener('submit',event => {
  event.preventDefault(); if (accepted || sending) return;
  clearErrors();
  const data = currentAnswers();const errors = errorsFor(data);
  if (showErrors(errors)) return;
  renderReview(data);
  lastTrigger = document.activeElement;
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('h2').focus({ preventScroll:true });
  setSending(false);
  void ensureVerification();
  if (!config.enabled) {
    sendError.textContent = 'Online sending is unavailable right now. Your answers are still here. Try connecting again or call 901-947-7225.';
    sendError.dataset.connection = 'true';sendError.hidden = false;
  }
});
document.querySelectorAll('[data-pp-close]').forEach(button => button.addEventListener('click',() => { if (!sending) dialog.close(); }));
dialog.addEventListener('cancel',event => { if (sending) event.preventDefault(); });
dialog.addEventListener('close',() => { if (!accepted && restoreReviewFocus) lastTrigger?.focus({ preventScroll:true }); restoreReviewFocus=true; });
reconnectButton.addEventListener('click',() => { void loadConfig(); });
sendButton.addEventListener('click',async () => {
  if (sending || accepted || finalError || !config.enabled || (!submission && !verificationToken)) return;
  const data = currentAnswers();
  const fingerprint = JSON.stringify(data);
  if (!attemptId || attemptedAnswers !== fingerprint) { attemptId=requestUUID();attemptedAnswers=fingerprint; }
  submission ??= { ...data, requestId:attemptId, turnstileToken:verificationToken };
  const payload=submission;
  sendError.hidden = true;sendError.textContent='';delete sendError.dataset.connection;
  setSending(true);
  try {
    const response = await fetch('/api/project-requests',{ method:'POST', headers:{ 'Content-Type':'application/json', 'Accept':'application/json' }, credentials:'same-origin', body:JSON.stringify(payload), signal:AbortSignal.timeout(45000) });
    let result;
    try { result = await response.json(); } catch { result = {}; }
    if (response.ok && result.accepted === true) {
      accepted = true;
      dialog.close();
      form.hidden = true;
      const success = document.getElementById('project-success');success.hidden = false;
      if (typeof result.reference === 'string' && result.reference.length < 200) { const reference=document.querySelector('[data-pp-reference]');reference.textContent=`Project reference: ${result.reference}`;reference.hidden=false; }
      steps.forEach(link => { link.classList.add('is-complete');link.querySelector('.pp-step-mark').textContent='✓';link.removeAttribute('aria-current'); });
      document.querySelector('.pp-progress').hidden=true;
      document.querySelector('.pp-guide h2').replaceChildren(document.createTextNode('Thanks for the details.'));
      document.querySelector('.pp-guide-intro').textContent='A clear starting point. A next step together.';
      success.scrollIntoView({ block:'start', behavior:reduced.matches ? 'instant' : 'smooth' });success.focus({ preventScroll:true });
      return;
    }
    if (result.errors && typeof result.errors === 'object' && !Array.isArray(result.errors)) {
      const allowed = Object.fromEntries(Object.entries(result.errors).filter(([name,message]) => ['needs',...fields].includes(name) && typeof message === 'string'));
      if (Object.keys(allowed).length) { submission=null;setSending(false);restoreReviewFocus=false;dialog.close();showErrors(allowed);return; }
    }
    if (typeof result.reference==='string' && result.reference.length<200) {
      sendError.textContent=`${typeof result.error==='string'?result.error:'We could not confirm your request.'} Reference: ${result.reference}`;
    }
    if (result.final === true) {
      finalError=true;
      sendError.textContent=sendError.textContent || (typeof result.error==='string'?result.error:'We could not confirm your request. Please call 901-947-7225.');
      sendError.hidden=false;return;
    }
    if (result.verification === true) {
      submission=null;verificationToken='';
      sendError.textContent='Please complete the verification again. Your answers are still here.';sendError.hidden=false;
      await ensureVerification(true);
      return;
    }
    sendError.textContent = typeof result.error === 'string' ? result.error : 'We couldn’t confirm your submission. Your answers are still here. Select Check submission to try again.';
    sendError.hidden = false;
  } catch {
    sendError.textContent = 'We couldn’t confirm your submission. Your answers are still here. Select Check submission to check again.';sendError.hidden=false;
  } finally { setSending(false); }
});
addEventListener('scroll',requestPaint,{ passive:true });
addEventListener('resize',requestPaint);
addEventListener('resize',()=>{ if(dialog.open&&!submission&&!finalError)void ensureVerification(); });
addEventListener('pageshow',requestPaint);
reduced.addEventListener('change',setMotion);
document.fonts?.ready.then(requestPaint);
if ('ResizeObserver' in window) new ResizeObserver(requestPaint).observe(document.querySelector('main'));
setMotion();
form.querySelector('.pp-review-button').disabled=false;
void loadConfig();

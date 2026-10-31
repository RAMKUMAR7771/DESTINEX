const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const app = { user: null, destinations: [], guides: [], currentPlan: null, plans: [], bookings: [], pendingIntent: null };
const money = value => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value || 0));
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const dateLabel = value => { if (!value) return ''; const d = new Date(`${value}T00:00:00`); return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options, headers: { ...(options.body ? {'Content-Type':'application/json'} : {}), ...(options.headers || {}) } });
  let data = {};
  try { data = await response.json(); } catch { /* report a clear fallback below */ }
  if (!response.ok) throw new Error(data.error || `Could not complete that request (${response.status}).`);
  return data;
}
function notify(message, error = false) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.toggle('error', error); toast.classList.add('show');
  clearTimeout(notify.timer); notify.timer = setTimeout(() => toast.classList.remove('show'), 3200);
}
function setBusy(button, busy, label = 'Working…') {
  if (!button) return;
  if (busy) { button.dataset.originalText = button.innerHTML; button.disabled = true; button.innerHTML = label; }
  else { button.disabled = false; if (button.dataset.originalText) button.innerHTML = button.dataset.originalText; }
}
function modal(content) {
  $('#modal-root').innerHTML = `<div class="modal-backdrop" role="presentation"><section class="modal-card" role="dialog" aria-modal="true">${content}<button class="modal-close" type="button" aria-label="Close dialog">${icon('close')}</button></section></div>`;
  $('.modal-close').addEventListener('click', closeModal);
  $('.modal-backdrop').addEventListener('click', e => { if (e.target.classList.contains('modal-backdrop')) closeModal(); });
  document.addEventListener('keydown', escapeModal, { once: true });
  setTimeout(() => $('.modal-card input, .modal-card select, .modal-card textarea, .modal-card button:not(.modal-close)')?.focus(), 30);
}
function escapeModal(e) { if (e.key === 'Escape') closeModal(); }
function closeModal() { $('#modal-root').innerHTML = ''; }
function openAuth(mode = 'login') {
  app.authMode = mode;
  const signup = mode === 'signup';
  modal(`<div class="eyebrow"><span class="eyebrow-line"></span> ${signup ? 'MAKE ROOM FOR MORE' : 'WELCOME BACK'}</div>
    <h2>${signup ? 'Start your next chapter.' : 'Good to have you back.'}</h2>
    <p>${signup ? 'Create an account to save itineraries and keep your trip details together.' : 'Sign in to pick up where your next trip left off.'}</p>
    <div class="modal-tabs"><button type="button" data-auth-tab="login" class="${signup ? '' : 'active'}">Sign in</button><button type="button" data-auth-tab="signup" class="${signup ? 'active' : ''}">Create account</button></div>
    <form id="auth-form">${signup ? `<label class="field-label">Your name</label><input class="text-input" name="name" autocomplete="name" required minlength="2" maxlength="80" placeholder="How should we call you?"><label class="field-label">I’m joining as</label><span class="select-shell"><select name="role"><option value="traveler">A traveller</option><option value="guide">A local guide</option></select><span>⌄</span></span>` : ''}
      <label class="field-label">Email address</label><input class="text-input" name="email" type="email" autocomplete="email" required placeholder="you@example.com">
      <label class="field-label">Password ${signup ? '(8 characters or more)' : ''}</label><input class="text-input" name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" required ${signup ? 'minlength="8"' : ''} placeholder="••••••••">
      <button class="button button-coral button-wide" type="submit">${signup ? 'Create my account' : 'Sign in'} ${icon('arrow')}</button><div id="auth-error" class="form-error"></div></form>
    ${signup ? '' : `<div class="demo-login"><span>OR TRY A DEMO ACCOUNT</span><div class="demo-buttons"><button type="button" data-demo="traveler">Traveller</button><button type="button" data-demo="guide">Local guide</button><button type="button" data-demo="admin">Admin</button></div></div>`}`);
  $('#auth-form').addEventListener('submit', submitAuth);
  $$('[data-auth-tab]').forEach(button => button.addEventListener('click', () => openAuth(button.dataset.authTab)));
  $$('[data-demo]').forEach(button => button.addEventListener('click', () => signInDemo(button.dataset.demo, button)));
}
async function submitAuth(event) {
  event.preventDefault(); const form = event.currentTarget; const button = $('button[type="submit"]', form); setBusy(button, true);
  try {
    const values = Object.fromEntries(new FormData(form));
    const path = app.authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
    const data = await api(path, { method: 'POST', body: JSON.stringify(values) });
    app.user = data.user; closeModal(); await refreshForUser();
    if (app.pendingIntent === 'guide' && app.user.role === 'guide') { app.pendingIntent = null; document.querySelector('#guide-studio')?.scrollIntoView({ behavior: 'smooth' }); }
    else if (app.pendingIntent === 'booking' && app.user.role === 'traveler') { const guide=app.guides.find(item=>item.id===app.pendingGuideId);app.pendingIntent=null;app.pendingGuideId=null;if(guide)openBooking(guide); }
    notify(app.authMode === 'signup' ? 'Your DESTINEX account is ready.' : `Welcome back, ${data.user.name.split(' ')[0]}.`);
  } catch (error) { const target = $('#auth-error'); if (target) target.textContent = error.message; else notify(error.message, true); }
  finally { setBusy(button, false); }
}
async function signInDemo(role, button) {
  const credentials = { traveler: ['traveler@destinex.demo','travel123!'], guide: ['guide@destinex.demo','guide123!'], admin: ['admin@destinex.demo','admin123!'] }[role];
  setBusy(button, true, 'Signing in…');
  try { const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: credentials[0], password: credentials[1] }) }); app.user = data.user; closeModal(); await refreshForUser(); if(app.pendingIntent==='booking'&&app.user.role==='traveler'){const guide=app.guides.find(item=>item.id===app.pendingGuideId);app.pendingIntent=null;app.pendingGuideId=null;if(guide)openBooking(guide)}else if(app.pendingIntent==='guide'&&app.user.role==='guide'){app.pendingIntent=null;$('#guide-studio').scrollIntoView({behavior:'smooth'})} notify(`Welcome, ${data.user.name.split(' ')[0]}.`); }
  catch (error) { notify(error.message, true); }
  finally { setBusy(button, false); }
}

function renderUser() {
  const menu = $('#user-menu'); const button = $('#auth-open');
  if (!app.user) { menu.classList.add('hidden'); button.classList.remove('hidden'); return; }
  button.classList.add('hidden'); menu.classList.remove('hidden');
  const label = { traveler: 'Traveller', guide: 'Local guide', admin: 'Admin' }[app.user.role];
  menu.innerHTML = `<button class="user-chip" aria-expanded="false"><span class="user-avatar">${esc(app.user.name.trim()[0]?.toUpperCase() || 'D')}</span><span class="user-words"><b>${esc(app.user.name.split(' ')[0])}</b><small>${label}</small></span><span>⌄</span></button><div class="user-dropdown hidden"><button data-account-action="switch">Switch demo account</button><button data-account-action="logout">Sign out</button></div>`;
  $('.user-chip', menu).addEventListener('click', () => { const drop = $('.user-dropdown', menu); drop.classList.toggle('hidden'); $('.user-chip', menu).setAttribute('aria-expanded', String(!drop.classList.contains('hidden'))); });
  $$('[data-account-action]', menu).forEach(item => item.addEventListener('click', async () => {
    if (item.dataset.accountAction === 'switch') { await api('/api/auth/logout', { method: 'POST' }); app.user = null; app.currentPlan = null; app.plans = []; app.bookings = []; renderUser(); closeStudio(); renderBookings(); renderBudgetLocked(); openAuth('login'); }
    else { await api('/api/auth/logout', { method: 'POST' }); app.user = null; app.currentPlan = null; app.plans = []; app.bookings = []; renderUser(); closeStudio(); renderBookings(); renderBudgetLocked(); notify('You’re signed out. Your demo data stays saved.'); }
  }));
}

async function boot() {
  const today = new Date(); $('#expense-date').value = today.toISOString().slice(0, 10);
  try {
    const data = await api('/api/bootstrap'); app.user = data.user; app.destinations = data.destinations; app.guides = data.guides;
    fillDestinations(); fillLanguages(data.languages); renderUser(); $('#payment-note').classList.remove('hidden');
    renderGuides(); if (app.user) await refreshForUser(); else { renderBudgetLocked(); renderBookings(); }
  } catch (error) { notify(`DESTINEX could not load: ${error.message}`, true); }
}
function fillDestinations() {
  const planner = $('#destination'); const guide = $('#guide-destination');
  for (const item of app.destinations) {
    planner.insertAdjacentHTML('beforeend', `<option value="${esc(item.name)}">${esc(item.name)} · ${esc(item.region)}</option>`);
    guide.insertAdjacentHTML('beforeend', `<option value="${esc(item.name)}">${esc(item.name)}</option>`);
  }
}
function fillLanguages(languages = []) { const select = $('#guide-language'); for (const language of languages) select.insertAdjacentHTML('beforeend', `<option value="${esc(language)}">${esc(language)}</option>`); }
async function refreshForUser() {
  renderUser();
  if (!app.user) return;
  if (app.user.role === 'traveler') {
    await Promise.all([loadPlans(), loadBookings()]);
    renderBudget();
  } else {
    await loadBookings(); renderBudgetLocked();
  }
  renderBookings();
  await renderStudio();
}
async function loadPlans() {
  try {
    const { plans } = await api('/api/plans'); app.plans = plans;
    if (!app.currentPlan && plans.length) { const last = plans[0]; app.currentPlan = { ...last.plan, id: last.id }; renderPlan(app.currentPlan); }
  } catch (error) { if (!error.message.includes('sign in')) notify(error.message, true); }
}
async function loadBookings() { try { app.bookings = (await api('/api/bookings')).bookings; } catch { app.bookings = []; } }

$('#auth-open').addEventListener('click', () => openAuth('login'));
$('#dismiss-note').addEventListener('click', () => $('#payment-note').classList.add('hidden'));
$('#mobile-menu').addEventListener('click', () => $('.main-nav').classList.toggle('open'));
$$('.main-nav a').forEach(link => link.addEventListener('click', () => $('.main-nav').classList.remove('open')));
$$('[data-auth]').forEach(button => button.addEventListener('click', () => openAuth('login')));

$('#plan-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!app.user) { openAuth('login'); notify('Sign in to save your itinerary and trip budget.'); return; }
  if (app.user.role !== 'traveler') { notify('Switch to a traveller account to make a trip plan.', true); return; }
  const form = event.currentTarget; const button = $('#plan-submit'); setBusy(button, true, `${icon('spark')} Shaping your plan…`);
  try {
    const values = new FormData(form); const payload = { destination: values.get('destination'), days: Number(values.get('days')), budget: Number(values.get('budget')), interests: values.getAll('interests') };
    const data = await api('/api/plans', { method: 'POST', body: JSON.stringify(payload) });
    app.currentPlan = data.plan; app.plans.unshift({ id: data.plan.id, plan: data.plan }); renderPlan(data.plan); await refreshBudget();
    notify('Your first draft is ready. Make it yours.'); $('#planner-preview').scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) { notify(error.message, true); }
  finally { setBusy(button, false); }
});
function renderPlan(plan) {
  $('#destination').value=plan.destination;$('#plan-form [name="days"]').value=plan.days;$('#plan-form [name="budget"]').value=plan.budget;
  $$('[name="interests"]',$('#plan-form')).forEach(input=>input.checked=(plan.interests||[]).includes(input.value));
  $('#planner-preview .empty-itinerary').classList.add('hidden'); const result = $('#plan-result'); result.classList.remove('hidden');
  result.innerHTML = `<div class="plan-result-head"><div><h3>${esc(plan.destination)}</h3><p>${esc(plan.region)} · ${plan.days} thoughtful day${plan.days === 1 ? '' : 's'}</p></div><div class="plan-total"><small>PLANNING RANGE</small><b>₹${money(plan.budget)}</b></div></div>
    ${plan.itinerary.map(day => `<div class="itinerary-day"><div class="day-index"><small>DAY</small>${String(day.day).padStart(2,'0')}</div><div class="day-content"><h4>${esc(day.title)}</h4>${day.activities.map(activity => `<div class="activity-row"><span class="activity-kind">✳</span><span><b>${esc(activity.time)}</b> · ${esc(activity.name)} <span>— ${esc(activity.detail)}</span></span></div>`).join('')}</div></div>`).join('')}
    <div class="itinerary-footer"><span>Estimated plan total <b>₹${money(plan.estimated_total)}</b> · includes a flex fund of ₹${money(plan.buffer)}</span><button class="button button-dark" id="phrasebook-open" type="button">Local phrases ${icon('globe')}</button></div>
    <p class="form-footnote">${esc(plan.disclaimer)}</p>`;
  $('#phrasebook-open').addEventListener('click', showPhrasebook);
}
function showPhrasebook() {
  modal(`<div class="eyebrow"><span class="eyebrow-line"></span> LITTLE WORDS, BIG WELCOME</div><h2>A few local phrases.</h2><p>A friendly way to begin. Have a guide help with pronunciation and context.</p>
    <div class="phrase-box"><div><small>Hello · Telugu</small><b>Namaskāram</b></div><div><small>Thank you · Telugu</small><b>Dhanyavādālu</b></div><div><small>Hello · Hindi</small><b>Namaste</b></div><div><small>Thank you · Hindi</small><b>Dhanyavaad</b></div><div><small>Please · Telugu</small><b>Dayachēsi</b></div><div><small>How much? · Hindi</small><b>Kitne ka hai?</b></div></div><p>Phrasebook is included in this MVP. Live speech and text translation can be connected to a translation provider.</p>`);
}

$('#guide-destination').addEventListener('change', renderGuides);
$('#guide-language').addEventListener('change', renderGuides);
function renderGuides() {
  const destination = $('#guide-destination').value; const language = $('#guide-language').value;
  const guides = app.guides.filter(g => (!destination || g.place === destination) && (!language || g.languages.includes(language)));
  const grid = $('#guide-list');
  if (!guides.length) { grid.innerHTML = `<div class="studio-empty">No verified local guides match those filters yet. Try another destination or language.</div>`; return; }
  grid.innerHTML = guides.map((guide, i) => `<article class="guide-card"><div class="guide-cover"><span class="guide-cover-tag">${icon('check')} VERIFIED LOCAL</span><span class="guide-cover-label">${esc(guide.place)}</span></div><div class="guide-body"><div class="guide-name-row"><h3>${esc(guide.name)}</h3><span class="guide-rating"><b>★</b> ${Number(guide.rating).toFixed(1)} <span>(${guide.reviews})</span></span></div><p class="guide-intro">${esc(guide.bio)}</p><div class="guide-tags"><span>${esc(guide.specialty || 'Local guide')}</span>${guide.languages.slice(0,2).map(lang => `<span>${esc(lang)}</span>`).join('')}${guide.years ? `<span>${guide.years}+ yrs</span>` : ''}</div><div class="guide-meta"><div class="guide-price"><b>₹${money(guide.rate)}</b><small>per day · transparent price</small></div><button class="button button-outline book-guide" data-book-guide="${guide.id}" type="button">Meet ${esc(guide.name.split(' ')[0])} ${icon('arrow')}</button></div></div></article>`).join('');
  $$('[data-book-guide]', grid).forEach(button => button.addEventListener('click', () => {
    const selected = guides.find(g => g.id === Number(button.dataset.bookGuide));
    if (!app.user) { app.pendingIntent = 'booking'; app.pendingGuideId=selected.id; openAuth('login'); notify('Sign in to send a booking request.'); return; }
    if (app.user.role !== 'traveler') { notify('Switch to a traveller account to book a guide.', true); return; }
    openBooking(selected);
  }));
}
function tomorrow() { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); }
function openBooking(guide) {
  const phrases = guide.languages.includes('Telugu') ? 'Namaskāram · hello &nbsp;·&nbsp; Dhanyavādālu · thank you' : guide.languages.includes('Hindi') ? 'Namaste · hello &nbsp;·&nbsp; Dhanyavaad · thank you' : `${esc(guide.languages[0] || 'English')} guide-led visit`;
  modal(`<div class="eyebrow"><span class="eyebrow-line"></span> A GOOD DAY, WITH A LOCAL</div><h2>Meet ${esc(guide.name)}.</h2><p>${esc(guide.specialty)} · speaks ${guide.languages.map(esc).join(', ')}</p><div class="booking-price-box"><span>Guide day · ${esc(guide.place)}<small style="display:block;margin-top:4px">15% platform commission is included in the booking value.</small></span><b>₹${money(guide.rate)}<small style="display:block;font-size:8px;color:#728076">₹${money(Math.round(guide.rate*.85))} guide payout · ₹${money(Math.round(guide.rate*.15))} platform</small></b></div><form id="booking-form"><label class="field-label">When would you like to go?</label><input class="text-input" name="trip_date" type="date" min="${tomorrow()}" required value="${tomorrow()}"><div class="field-row"><label class="field-wrap"><span class="field-label">Travellers</span><span class="input-shell"><input name="guests" type="number" min="1" max="20" value="2" required></span></label><label class="field-wrap"><span class="field-label">Language hello</span><span class="select-shell"><select name="language">${guide.languages.map(lang=>`<option>${esc(lang)}</option>`).join('')}</select><span>⌄</span></span></label></div><label class="field-label">Anything your guide should know?</label><textarea class="text-input" name="note" rows="3" maxlength="500" placeholder="Interests, accessibility needs, or a question…"></textarea><div class="phrase-box"><div><small>LOCAL PHRASEBOOK</small><b>${phrases}</b></div><div><small>YOUR REQUEST</small><b>Guide confirms availability first.</b></div></div><button class="button button-coral button-wide" type="submit">Send booking request ${icon('arrow')}</button><div id="booking-error" class="form-error"></div></form>`);
  $('#booking-form').addEventListener('submit', async event => {
    event.preventDefault(); const button = $('button[type="submit"]', event.currentTarget); setBusy(button, true);
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget)); values.guide_id = guide.id; values.guests = Number(values.guests);
      await api('/api/bookings', { method: 'POST', body: JSON.stringify(values) }); closeModal(); await loadBookings(); renderBookings(); notify('Request sent. You’ll see the guide’s reply here.'); $('#bookings').scrollIntoView({ behavior: 'smooth' });
    } catch (error) { $('#booking-error').textContent = error.message; }
    finally { setBusy(button, false); }
  });
}

function renderBudgetLocked() {
  $('#budget-content').classList.add('hidden'); $('#budget-lock').classList.remove('hidden');
  if (app.user?.role === 'traveler') { $('#budget-content').classList.remove('hidden'); $('#budget-lock').classList.add('hidden'); }
}
function renderBudget() {
  $('#budget-content').classList.remove('hidden'); $('#budget-lock').classList.toggle('hidden', app.user?.role === 'traveler' && !!app.currentPlan);
  if (!app.currentPlan) { $('#budget-lock').classList.remove('hidden'); $('#budget-total').textContent='—'; $('#budget-destination').textContent='Save an itinerary to open your trip ledger.'; $('#budget-spent').textContent='₹0 spent'; $('#budget-left').textContent='₹0 left'; $('#budget-categories').innerHTML=''; $('#expense-list').innerHTML=''; return; }
  $('#budget-lock').classList.add('hidden'); $('#budget-total').textContent=money(app.currentPlan.budget); $('#budget-destination').textContent=`${app.currentPlan.destination} · ${app.currentPlan.days} day${app.currentPlan.days===1?'':'s'}`;
  $('#budget-categories').innerHTML=(app.currentPlan.budget_breakdown || []).filter(x=>x.label!=='Flex fund').map((x,i)=>`<div><span class="category-dot ${['dot-coral','dot-green','dot-blue','dot-gold'][i]}"></span><span>${esc(x.label)}</span><b>₹${money(x.amount)}</b></div>`).join('');
  refreshBudget();
}
async function refreshBudget() {
  if (!app.user || app.user.role !== 'traveler' || !app.currentPlan) return;
  try {
    const data = await api(`/api/expenses?plan_id=${app.currentPlan.id}`); const budget = data.plan.budget; const left = budget-data.total;
    $('#budget-spent').textContent=`₹${money(data.total)} spent`; $('#budget-left').textContent=`₹${money(Math.max(0,left))} left`;
    $('#budget-spent-bar').style.width=`${Math.min(100,Math.round(data.total/budget*100))}%`;
    $('#budget-spent-bar').style.background=data.total>budget?'#c86657':'';
    $('#expense-list').innerHTML=data.expenses.length ? data.expenses.slice(0,6).map(x=>`<div class="expense-row"><span>${esc(x.title)} · ${dateLabel(x.spent_on)}</span><b>₹${money(x.amount)}</b></div>`).join('') : `<p class="form-footnote">Your real-world expenses will appear here.</p>`;
  } catch (error) { if (!error.message.includes('sign in')) notify(error.message,true); }
}
$('#expense-form').addEventListener('submit', async event => {
  event.preventDefault(); if (!app.user) { openAuth('login'); return; }
  if (!app.currentPlan) { notify('Shape and save a trip first to start its budget ledger.'); $('#planner').scrollIntoView({ behavior:'smooth' }); return; }
  const button=$('button[type="submit"]',event.currentTarget);setBusy(button,true);
  try { const values=Object.fromEntries(new FormData(event.currentTarget)); values.plan_id=app.currentPlan.id; values.amount=Number(values.amount); await api('/api/expenses',{method:'POST',body:JSON.stringify(values)}); event.currentTarget.reset(); $('#expense-date').value=new Date().toISOString().slice(0,10); await refreshBudget(); notify('Expense added to your trip ledger.'); }
  catch(error){notify(error.message,true)} finally{setBusy(button,false)}
});

function renderBookings() {
  const root=$('#bookings-content');
  if (!app.user) { root.innerHTML=`<div class="bookings-empty"><div class="empty-ticket">✳</div><div><b>Your trips will show up here.</b><p>Once you request a local guide, you can follow every update in one place.</p></div><a href="#guides" class="text-link">Explore local guides <span>→</span></a></div>`; return; }
  if (!app.bookings.length) { root.innerHTML=`<div class="bookings-empty"><div class="empty-ticket">✳</div><div><b>${app.user.role==='guide'?'Your guide requests will appear here.':'Your trips will show up here.'}</b><p>${app.user.role==='guide'?'New traveller requests stay here until you respond.':'Find a verified local guide and your trip will appear here.'}</p></div><a href="#guides" class="text-link">${app.user.role==='guide'?'View your profile':'Explore local guides'} <span>→</span></a></div>`; return; }
  root.innerHTML=`<div class="booking-list">${app.bookings.map(b=>bookingCard(b)).join('')}</div>`;
  $$('[data-booking-action]',root).forEach(button=>button.addEventListener('click',()=>bookingAction(Number(button.dataset.id),button.dataset.bookingAction)));
  $$('[data-review-booking]',root).forEach(button=>button.addEventListener('click',()=>openReview(Number(button.dataset.reviewBooking))));
}
function bookingCard(b) {
  const traveler=app.user.role==='traveler';const person=traveler?b.guide_name:(b.traveler_name||'Traveller');const status=b.status;
  let actions='';
  if(traveler&&['pending','confirmed'].includes(status)) actions+=`<button class="button button-outline" data-id="${b.id}" data-booking-action="cancel" type="button">Cancel request</button>`;
  if(traveler&&status==='confirmed'&&b.payment_status==='unpaid')actions+=`<button class="button button-dark" data-id="${b.id}" data-booking-action="pay" type="button">Demo payment · ₹${money(b.amount)}</button>`;
  if(traveler&&status==='completed'&&b.payment_status==='demo_paid'&&!b.reviewed)actions+=`<button class="button button-dark" data-review-booking="${b.id}" type="button">Leave a review</button>`;
  if(!traveler&&status==='pending')actions+=`<button class="button button-outline" data-id="${b.id}" data-booking-action="decline" type="button">Decline</button><button class="button button-dark" data-id="${b.id}" data-booking-action="confirm" type="button">Confirm date</button>`;
  if(!traveler&&status==='confirmed'&&b.payment_status==='demo_paid')actions+=`<button class="button button-dark" data-id="${b.id}" data-booking-action="complete" type="button">Mark trip complete</button>`;
  const payment=b.payment_status==='demo_paid'?'Demo payment recorded':b.payment_status==='refunded'?'Refunded':'Payment after confirmation';
  return `<article class="booking-card"><div class="booking-top"><div><h3>${esc(person)}</h3><p>${esc(b.destination)} · ${dateLabel(b.trip_date)}</p></div><span class="status-pill ${esc(status)}">${esc(status)}</span></div><div class="booking-facts"><span>👥 ${b.guests} traveller${b.guests===1?'':'s'}</span><span><b>₹${money(b.amount)}</b> · ${payment}</span>${b.note?`<span>“${esc(b.note)}”</span>`:''}</div>${actions?`<div class="booking-actions">${actions}</div>`:`<div class="booking-actions"><span class="status-copy">${status==='completed'?'Trip complete · thank you for travelling local.':status==='declined'?'This guide could not take the request.':status==='cancelled'?'This request is cancelled.':status==='confirmed'?'Confirmed · your guide is looking forward to meeting you.':'A review helps travellers choose with confidence.'}</span></div>`}</article>`;
}
async function bookingAction(id, action) {
  try {
    if (action==='pay') {
      const confirmPayment = window.confirm('This is a demo checkout. No payment details are collected and no money will be charged. Record the demo payment?');
      if (!confirmPayment) return;
      const data=await api(`/api/bookings/${id}/pay`,{method:'POST',body:JSON.stringify({})});notify(data.message);
    } else {
      const labels={confirm:'Confirm this guide request?',decline:'Decline this guide request?',cancel:'Cancel this trip request?',complete:'Mark this guided trip complete?'};
      if(!window.confirm(labels[action]))return;
      await api(`/api/bookings/${id}/action`,{method:'POST',body:JSON.stringify({action})});notify(`Booking ${action==='confirm'?'confirmed':action==='complete'?'marked complete':action==='decline'?'declined':'cancelled'}.`);
    }
    await loadBookings();renderBookings();
  } catch(error){notify(error.message,true)}
}
function openReview(bookingId) {
  let rating=5;
  modal(`<div class="eyebrow"><span class="eyebrow-line"></span> A VERIFIED TRIP, A REAL REVIEW</div><h2>How was the day?</h2><p>Your feedback helps travellers find good people and gives local guides useful recognition.</p><div class="star-rating" role="group" aria-label="Rating">${[1,2,3,4,5].map(n=>`<button type="button" data-rating="${n}" aria-label="${n} stars">★</button>`).join('')}</div><form id="review-form"><label class="field-label">A note for the next traveller</label><textarea class="text-input" name="comment" rows="4" maxlength="600" placeholder="What made the day feel special?"></textarea><button class="button button-coral button-wide" type="submit">Share my review ${icon('arrow')}</button></form>`);
  const stars=$$('.star-rating button');const paint=()=>stars.forEach(button=>button.style.opacity=Number(button.dataset.rating)<=rating?'1':'.3');stars.forEach(button=>button.addEventListener('click',()=>{rating=Number(button.dataset.rating);paint()}));paint();
  $('#review-form').addEventListener('submit',async event=>{event.preventDefault();try{await api('/api/reviews',{method:'POST',body:JSON.stringify({booking_id:bookingId,rating,comment:new FormData(event.currentTarget).get('comment')})});closeModal();await loadBookings();renderBookings();notify('Thank you. Your verified review is live.')}catch(error){notify(error.message,true)}});
}

$('#guide-cta').addEventListener('click', () => {
  if (!app.user) { app.pendingIntent='guide'; openAuth('login'); return; }
  if (app.user.role!=='guide') { notify('Sign in with a local guide account to join the guide community.'); return; }
  $('#guide-studio').classList.remove('hidden'); $('#guide-studio').scrollIntoView({behavior:'smooth'});
});
function closeStudio(){ $('#guide-studio').classList.add('hidden'); $('#guide-studio').innerHTML=''; }
async function renderStudio() {
  const studio=$('#guide-studio');
  if (!app.user || !['guide','admin'].includes(app.user.role)) { closeStudio(); return; }
  studio.classList.remove('hidden');
  if (app.user.role==='guide') {
    let profile=null;try{profile=(await api('/api/guide/profile')).guide}catch{}
    studio.innerHTML=`<div class="studio-shell"><div class="studio-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> LOCAL GUIDE STUDIO</div><h2>Your local knowledge, fairly shared.</h2><p>Keep your availability and profile clear. You choose which requests to accept.</p></div><span class="studio-badge">${profile?.status==='verified'?'✓ verified guide':profile?.status==='pending'?'application in review':'guide dashboard'}</span></div>
      ${profile?.status==='verified'?`<div class="studio-grid"><div class="studio-panel"><h3>${esc(profile.name)}</h3><p class="status-copy">${esc(profile.specialty)} · ${esc(profile.place)}<br>${esc(profile.languages.join(', '))}<br>₹${money(profile.rate)} per day · ${profile.years} years guiding<br><br>${esc(profile.bio)}</p><p class="status-copy">Your profile is live in the verified guide directory. New requests appear in the bookings list above.</p></div><div class="studio-panel"><h3>Fair work, on every booking</h3><p class="status-copy">The displayed price is transparent. On a ₹3,000 booking, the guide payout is ₹2,550 and the platform commission is ₹450. A request is only final after you confirm it.</p><button class="button button-outline" id="studio-phrases" type="button">Open the traveller phrasebook ${icon('globe')}</button></div></div>`
      :profile?.status==='pending'?`<div class="studio-panel"><h3>Thanks for introducing yourself.</h3><p class="status-copy">Your profile is in the review queue. An administrator checks each guide before it can be booked. We’ll keep this status here.</p></div>`
      :profile?.status==='rejected'?`<div class="studio-panel"><h3>More details are needed.</h3><p class="status-copy">This application was not approved. Contact the DESTINEX team to review next steps.</p></div>`
      :`<form class="studio-panel" id="guide-apply-form"><h3>Build your guide profile.</h3><p class="status-copy">Tell travellers what you know best. ID checks and a local review happen before your profile goes live.</p><div class="field-row"><label class="field-wrap"><span class="field-label">Your destination</span><span class="select-shell"><select name="place" required>${app.destinations.map(d=>`<option>${esc(d.name)}</option>`).join('')}</select><span>⌄</span></span></label><label class="field-wrap"><span class="field-label">Day rate · ₹</span><span class="input-shell"><input name="rate" type="number" min="500" value="3000" required></span></label></div><div class="field-row"><label class="field-wrap"><span class="field-label">Languages (comma separated)</span><input class="text-input" name="languages" required value="English, Telugu"></label><label class="field-wrap"><span class="field-label">Years guiding</span><span class="input-shell"><input name="years" type="number" min="0" max="60" value="2" required></span></label></div><label class="field-label">What should a traveller know about your style?</label><textarea class="text-input" name="bio" minlength="20" maxlength="600" required placeholder="Share the places, stories or experiences you know best…"></textarea><label class="field-label">Your speciality</label><input class="text-input" name="specialty" maxlength="100" placeholder="e.g. Coast & coffee country"><button class="button button-coral" type="submit">Send for verification ${icon('arrow')}</button><div id="guide-apply-error" class="form-error"></div></form>`}</div>`;
    if ($('#studio-phrases')) $('#studio-phrases').addEventListener('click',showPhrasebook);
    if ($('#guide-apply-form')) $('#guide-apply-form').addEventListener('submit',submitGuideApplication);
  } else {
    let metrics={guides:0,pending:0,bookings:0,volume:0},applications=[];
    try{metrics=(await api('/api/admin/metrics')).metrics;applications=(await api('/api/admin/guide-applications')).applications}catch(error){notify(error.message,true)}
    studio.innerHTML=`<div class="studio-shell"><div class="studio-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> DESTINEX ADMIN</div><h2>Build trust, one guide at a time.</h2><p>Review guide applications and keep marketplace quality visible.</p></div><span class="studio-badge">verification desk</span></div><div class="studio-metrics"><div class="metric-card"><b>${metrics.guides}</b><small>Verified guides</small></div><div class="metric-card"><b>${metrics.pending}</b><small>Applications waiting</small></div><div class="metric-card"><b>${metrics.bookings}</b><small>All bookings</small></div><div class="metric-card"><b>₹${money(metrics.volume)}</b><small>Demo payment volume</small></div></div><div class="studio-panel"><h3>Guide applications · ${applications.length}</h3>${applications.length?applications.map(g=>`<article class="application-card"><h4>${esc(g.name)} · ${esc(g.place)}</h4><p>${esc(g.specialty)} · ${g.years} years · ₹${money(g.rate)}/day · ${g.languages.map(esc).join(', ')}</p><p>${esc(g.bio)}</p><div class="application-actions"><button class="button button-dark" data-review-guide="${g.id}" data-decision="approve" type="button">Approve profile</button><button class="button button-outline" data-review-guide="${g.id}" data-decision="reject" type="button">Decline</button></div></article>`).join(''):`<div class="studio-empty">No guide applications are waiting. New profiles will appear here.</div>`}<p class="status-copy">Verification in this MVP is an administrator decision against the submitted profile. It does not perform government ID, address or background checks.</p></div></div>`;
    $$('[data-review-guide]',studio).forEach(button=>button.addEventListener('click',async()=>{const decision=button.dataset.decision;try{await api(`/api/admin/guides/${button.dataset.reviewGuide}/decision`,{method:'POST',body:JSON.stringify({action:decision})});notify(`Guide profile ${decision==='approve'?'approved':'declined'}.`);await renderStudio();const refreshed=await api('/api/bootstrap');app.guides=refreshed.guides;renderGuides()}catch(error){notify(error.message,true)}}));
  }
}
async function submitGuideApplication(event) {
  event.preventDefault();const button=$('button[type="submit"]',event.currentTarget);setBusy(button,true);
  try{const values=Object.fromEntries(new FormData(event.currentTarget));values.rate=Number(values.rate);values.years=Number(values.years);await api('/api/guide/apply',{method:'POST',body:JSON.stringify(values)});notify('Profile sent for verification.');await renderStudio()}catch(error){const target=$('#guide-apply-error');if(target)target.textContent=error.message;else notify(error.message,true)}finally{setBusy(button,false)}
}

boot();

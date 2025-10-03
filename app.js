const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const LOCALE = 'et-EE';
  const fmt = n => Number.isFinite(+n) ? Number(n).toLocaleString(LOCALE,{minimumFractionDigits:0,maximumFractionDigits:0}) : '—';
  const fmt2 = n => Number.isFinite(+n) ? Number(n).toLocaleString(LOCALE,{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
  const monthKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

// Improve touch responsiveness on mobile devices by registering a passive listener.
// Passive listeners inform the browser that the handler won’t call `preventDefault`,
// enabling better scrolling performance on budget phones.
document.addEventListener('touchstart', ()=>{}, {passive:true});

  const sanitizeCurrencyString = value => String(value||'').replace(/[\s\u00a0€]/g,'').replace(/[^0-9,.-]/g,'');
  function normalizeCurrencyString(value){
    const cleaned = sanitizeCurrencyString(value);
    if(!cleaned) return '';
    const normalized = cleaned.includes(',') && cleaned.includes('.')
      ? cleaned.replace(/(,)(?=.*\.)/g,'').replace(',','.')
      : cleaned.replace(',','.');
    const asNumber = Number(normalized);
    return Number.isFinite(asNumber) ? String(asNumber) : '';
  }
  function formatCurrencyDisplay(value){
    const num = Number(value);
    if(!Number.isFinite(num)) return '';
    return num.toLocaleString(LOCALE,{minimumFractionDigits:0,maximumFractionDigits:2});
  }
  function getCurrencyNumber(input){
    if(!input) return 0;
    if(input.dataset && input.dataset.raw){
      const raw = Number(input.dataset.raw);
      return Number.isFinite(raw) ? raw : 0;
    }
    const normalized = normalizeCurrencyString(input.value);
    return Number(normalized||0) || 0;
  }
  function setCurrencyValue(input, value){
    if(!input) return;
    const normalized = normalizeCurrencyString(value);
    if(normalized===''){
      input.value='';
      delete input.dataset.raw;
      return;
    }
    input.dataset.raw = normalized;
    input.value = formatCurrencyDisplay(normalized);
  }
  function parseOnFocus(event){
    const input = event.target;
    if(!input.classList.contains('currency')) return;
    const raw = input.dataset.raw;
    if(raw){
      input.value = raw;
    } else {
      input.value = normalizeCurrencyString(input.value);
    }
  }
  function formatCurrencyOnBlur(event){
    const input = event.target;
    if(!input.classList.contains('currency')) return;
    const normalized = normalizeCurrencyString(input.value);
    if(normalized){
      input.dataset.raw = normalized;
      input.value = formatCurrencyDisplay(normalized);
    } else {
      input.value='';
      delete input.dataset.raw;
    }
    validateCurrencyInput(input);
  }
  function handleCurrencyInput(event){
    const input = event.target;
    if(!input.classList.contains('currency')) return;
    const normalized = normalizeCurrencyString(input.value);
    if(normalized){
      input.dataset.raw = normalized;
    } else {
      delete input.dataset.raw;
    }
  }
  function bindCurrencyInputs(){
    $$('input.currency').forEach(input => {
      input.addEventListener('focus', parseOnFocus);
      input.addEventListener('blur', formatCurrencyOnBlur);
      input.addEventListener('input', handleCurrencyInput);
      formatCurrencyOnBlur({target:input});
    });
  }
  function setFieldError(input, message){
    if(!input) return;
    const errId = input.getAttribute('aria-errormessage');
    if(!errId) return;
    const errEl = document.getElementById(errId);
    if(!errEl) return;
    if(message){
      input.setAttribute('aria-invalid','true');
      errEl.textContent = message;
      errEl.hidden = false;
    } else {
      input.removeAttribute('aria-invalid');
      errEl.textContent = '';
      errEl.hidden = true;
    }
  }
  function validateCurrencyInput(input){
    if(!input || !input.classList.contains('currency')) return;
    const value = getCurrencyNumber(input);
    setFieldError(input, value < 0 ? 'Peab olema ≥ 0.' : '');
  }
  const debounce = (fn, wait=200) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(()=>fn(...args), wait);
    };
  };

  const todayDate = $('#todayDate');
  const monthBadge = $('#monthBadge');
  const now = new Date();
  if(todayDate) todayDate.textContent = now.toLocaleDateString(LOCALE,{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  const inputs = {
    income: $('#income'),
    loans: $('#loans'),
    mom: $('#mom'),
    momEnd: $('#momEnd'),
    aptSupport: $('#aptSupport'),
    aptSupportEnd: $('#aptSupportEnd'),
    phone: $('#phone'),
    transport: $('#transport'),
    groceries: $('#groceries'),
    otherEss: $('#otherEss'),
    fun: $('#fun'),
    personal: $('#personal'),
    zazaCap: $('#zazaCap'),
    efTarget: $('#efTarget'),
    efNow: $('#efNow'),
    paydays: $('#paydaysInput'),
    pricePerGram: $('#pricePerGram'),
    gramsPerWeek: $('#gramsPerWeek'),
    zazaAuto: $('#zazaAuto'),
    zazaCutPct: $('#zazaCutPct'),
    applyCap: $('#applyCap')
  };

  const kpis = {
    out: $('#kpiOut'),
    left: $('#kpiLeft'),
    alloc: $('#kpiAlloc')
  };

  const summary = $('#liveSummary');
  const pillTargets = {
    budget: $$('[data-pill="budget"]'),
    zaza: $$('[data-pill="zaza"]'),
    spent: $$('[data-pill="spent"]')
  };
  const setPillText = (key, text) => {
    (pillTargets[key] || []).forEach(el => {
      el.textContent = text;
    });
  };
  const zazaProg = $('#zazaProg');
  const archivesList = $('#archivesList');
  const expBreakdown = $('#expBreakdown');
  const CATEGORY_LABELS = {
    'Zaza': 'Kanepi kulu ülempiir',
    'Telefon/Internet': 'Telefon/Internet',
    'Toit': 'Toit',
    'Transport': 'Transport',
    'Meelelahutus': 'Meelelahutus',
    'Riided/Isiklik': 'Riided/Isiklik',
    'Muu': 'Muud esmavajadused'
  };
  const CATEGORY_ORDER = ['Zaza','Telefon/Internet','Toit','Transport','Meelelahutus','Riided/Isiklik','Muu'];
  const SUPPORT_KEYS = ['loans','mom','aptSupport'];
  bindCurrencyInputs();

  const KEY = 'rahakask-v5';
  const KEY_EXP = 'rahakask-v5-expenses';
  const CUR_MONTH = monthKey(new Date());
  let payMarksCache = null;
  let archivesData = [];
  let currentMonthExpenses = [];
  let viewMonth = CUR_MONTH;
  let monthTimeline = [];
  let expSort = {key:'date',dir:'desc'};
  let expFilterTerm = '';


// ===== Extracted from index (19).html =====


  function readState(){ try{ return JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ return {}; } }
  function writeState(obj){ localStorage.setItem(KEY, JSON.stringify(obj)); }
  const defaultPayMarks = () => ({supports:{loans:false,mom:false,aptSupport:false}});
  function getPayMarks(){
    if(payMarksCache) return payMarksCache;
    const state = readState();
    state.payMarks = state.payMarks || {};
    const existing = state.payMarks[viewMonth] || state.payMarks[CUR_MONTH];
    if(existing){
      payMarksCache = {
        supports: Object.assign({loans:false,mom:false,aptSupport:false}, existing.supports||{})
      };
    } else {
      payMarksCache = defaultPayMarks();
    }
    state.payMarks[CUR_MONTH] = state.payMarks[CUR_MONTH] || payMarksCache;
    writeState(state);
    return payMarksCache;
  }
  function savePayMarks(){
    if(!payMarksCache) return;
    const state = readState();
    state.payMarks = state.payMarks || {};
    state.payMarks[CUR_MONTH] = payMarksCache;
    writeState(state);
  }
  function resetPayMarksCache(){ payMarksCache = null; }

  function reflectSupportPaid(key){
    const marks = getPayMarks();
    const paid = !!(marks.supports && marks.supports[key]);
    const btn = document.querySelector(`.payToggle[data-key="${key}"]`);
    if(!btn) return;
    btn.setAttribute('aria-pressed', paid ? 'true' : 'false');
    btn.classList.toggle('is-locked', paid);
    btn.textContent = paid ? 'Makstud ✓' : 'Maksmata';
    btn.title = paid ? 'Makstud — saad muuta järgmisel kuul' : 'Märgi kohustus makstuks';
    btn.toggleAttribute('disabled', paid);
    btn.setAttribute('aria-disabled', paid ? 'true' : 'false');
    const row = btn.closest('.fieldRow');
    if(row) row.classList.toggle('is-paid', paid);
  }
  function lockSupportPaid(key){
    const marks = getPayMarks();
    marks.supports = marks.supports || {loans:false,mom:false,aptSupport:false};
    if(marks.supports[key]) return;
    marks.supports[key] = true;
    savePayMarks();
    reflectSupportPaid(key);
    if(viewMonth === CUR_MONTH) recomputeBudget();
  }
  function initPayToggles(){
    $$('.payToggle').forEach(btn => {
      const key = btn.getAttribute('data-key');
      btn.addEventListener('click',()=>{
        if(viewMonth !== CUR_MONTH) return;
        lockSupportPaid(key);
      });
      reflectSupportPaid(key);
    });
  }

  function parsePaydays(txt){
    if (!txt) return [];
    return String(txt).split(/[ ,;]+/).map(s=>parseInt(s,10)).filter(n=>Number.isInteger(n)&&n>=1&&n<=31).sort((a,b)=>a-b);
  }
  function nextDatesFromDays(dayList, from=new Date(), count=3){
    if (!dayList.length) return [];
    const results=[]; let d=new Date(from); d.setHours(12,0,0,0);
    while(results.length<count){
      for(const dd of dayList){
        const y=d.getFullYear(), m=d.getMonth();
        const last=new Date(y,m+1,0).getDate();
        let cand=new Date(y,m,Math.min(dd,last)); cand.setHours(12,0,0,0);
        if(cand<d){ const nm=new Date(y,m+1,1); const last2=new Date(nm.getFullYear(),nm.getMonth()+1,0).getDate(); cand=new Date(nm.getFullYear(),nm.getMonth(),Math.min(dd,last2)); }
        results.push(cand); if(results.length>=count) break;
      }
      d=new Date(results[results.length-1].getTime()+86400000);
    }
    results.sort((a,b)=>a-b);
    const uniq=[]; for(const dt of results){ if(!uniq.length||(+dt!==+uniq[uniq.length-1])) uniq.push(dt); if(uniq.length===count) break; }
    return uniq.slice(0,count);
  }
  function daysBetween(a,b){
    const A=new Date(a.getFullYear(),a.getMonth(),a.getDate());
    const B=new Date(b.getFullYear(),b.getMonth(),b.getDate());
    return Math.ceil((B-A)/86400000);
  }
  function updatePayInfo(){
    const el=inputs.paydays, info=$('#nextPayInfo');
    if(!el||!info) return;
    const days=parsePaydays(el.value);
    if(!days.length){ info.innerHTML='<em>Lisa palgapäeva päev (nt 5 või 5,20).</em>'; return; }
    const next3=nextDatesFromDays(days,new Date(),3);
    const fmtOpts={day:'2-digit',month:'long',year:'numeric'};
    const today=new Date();
    info.innerHTML = next3.map(d=>`• ${d.toLocaleDateString(LOCALE,fmtOpts)} — <strong>${daysBetween(today,d)} päeva</strong>`).join('<br>');
  }

  const inputValue = ref => {
    if(ref===null||typeof ref==='undefined') return '';
    if(typeof ref === 'number') return ref;
    if(typeof ref === 'string') return ref;
    if(ref && typeof ref === 'object'){
      if(ref.classList && ref.classList.contains('currency')){
        const raw = ref.dataset && typeof ref.dataset.raw !== 'undefined' ? ref.dataset.raw : normalizeCurrencyString(ref.value);
        return raw || '';
      }
      if('value' in ref) return ref.value;
    }
    return ref;
  };
  function isActive(endInput, asOf=new Date()){
    const raw = inputValue(endInput);
    if(!raw) return true;
    const end = new Date(String(raw)+"T23:59:59");
    const ref = new Date(asOf);
    ref.setHours(23,59,59,999);
    return end >= ref;
  }
  function activeAmt(amountInput,endInput,asOf=new Date()){
    const amt = +inputValue(amountInput) || 0;
    return isActive(endInput, asOf) ? amt : 0;
  }
  function monthlyObligations(source=inputs, asOf=new Date()){
    const src = source || {};
    const loans = +inputValue(src.loans) || 0;
    return loans + activeAmt(src.mom, src.momEnd, asOf) + activeAmt(src.aptSupport, src.aptSupportEnd, asOf);
  }
  function supportAmount(key, source=inputs, asOf=new Date()){
    const src = source || {};
    if(key === 'loans') return +inputValue(src.loans) || 0;
    if(key === 'mom') return activeAmt(src.mom, src.momEnd, asOf);
    if(key === 'aptSupport') return activeAmt(src.aptSupport, src.aptSupportEnd, asOf);
    return 0;
  }
  function paidSupportsTotal(asOf=new Date(), marks=getPayMarks(), source=inputs){
    const dataMarks = marks || defaultPayMarks();
    return SUPPORT_KEYS.reduce((sum,key)=>sum + (dataMarks.supports && dataMarks.supports[key] ? supportAmount(key, source, asOf) : 0),0);
  }
  function categoryLimits(source=inputs){
    const src = source || {};
    return {
      'Telefon/Internet': +inputValue(src.phone) || 0,
      'Transport': +inputValue(src.transport) || 0,
      'Toit': +inputValue(src.groceries) || 0,
      'Muu': +inputValue(src.otherEss) || 0,
      'Meelelahutus': +inputValue(src.fun) || 0,
      'Riided/Isiklik': +inputValue(src.personal) || 0,
      'Zaza': +inputValue(src.zazaCap) || 0,
    };
  }
  function sumCategoryLimits(limits){
    return Object.values(limits || {}).reduce((sum,val)=>sum+(+val||0),0);
  }
  function spentForMonth(mk, list){
    const expenses = Array.isArray(list) ? list : readExpenses();
    return expenses.filter(e => String(e.date||'').slice(0,7) === mk).reduce((sum,x)=>sum+(+x.amt||0),0);
  }
  function spentThisMonth(){
    if(Array.isArray(currentMonthExpenses)){
      return currentMonthExpenses.reduce((sum,e)=>sum+(+e.amt||0),0);
    }
    return spentForMonth(CUR_MONTH);
  }


// ===== Extracted from index (19).html =====


  function createVirtualInputs(budget={}){
    const wrap = val => ({ value: typeof val === 'undefined' ? '' : val });
    return {
      income: wrap(budget.income),
      loans: wrap(budget.loans),
      mom: wrap(budget.mom),
      momEnd: wrap(budget.momEnd),
      aptSupport: wrap(budget.aptSupport),
      aptSupportEnd: wrap(budget.aptSupportEnd),
      phone: wrap(budget.phone),
      transport: wrap(budget.transport),
      groceries: wrap(budget.groceries),
      otherEss: wrap(budget.otherEss),
      fun: wrap(budget.fun),
      personal: wrap(budget.personal),
      zazaCap: wrap(budget.zazaCap)
    };
  }
  function updateKpis(out,totalLeft,allocText,className=''){
    if(kpis.out) kpis.out.textContent = `€ ${fmt(out)}`;
    if(kpis.left){
      kpis.left.textContent = totalLeft >= 0 ? `€ ${fmt(totalLeft)}` : `€ -${fmt(Math.abs(totalLeft))}`;
      kpis.left.className = ['val', className].filter(Boolean).join(' ');
    }
    if(kpis.alloc) kpis.alloc.textContent = allocText;
  }
  function updateSummaryContent({income, obligations, paidSupports, spent, limitTotal, plannedLeft, realLeft, obligationsLeft, note}){
    if(!summary) return;
    const realClass = realLeft>0?'good':(realLeft<0?'bad':'');
    summary.innerHTML = `
      <div>Sissetulek: <strong>€ ${fmt(income)}</strong></div>
      <div>Kohustuslikud maksed (planeeritud): <strong>€ ${fmt(obligations)}</strong></div>
      <div>Kohustuslikud maksed (makstud): <strong>€ ${fmt(paidSupports)}</strong> <span class="summaryNote">alles € ${fmt(Math.max(0, obligationsLeft))}</span></div>
      <div>Kulude limiidid: <strong>€ ${fmt(limitTotal)}</strong></div>
      <div>Sel kuul kulud: <strong>€ ${fmt(spent)}</strong></div>
      <div>Plaanijääk: <strong>€ ${fmt(plannedLeft)}</strong></div>
      <div>Reaaljääk: <strong class="${realClass}">€ ${fmt(realLeft)}</strong></div>
      ${note?`<div class="summaryNote">${note}</div>`:''}`;
  }

  function renderExpenseBreakdown(list=currentMonthExpenses, source=inputs, opts={}){
    if(!expBreakdown) return;
    const limits = categoryLimits(source);
    const data = Array.isArray(list) ? list : [];
    const byCat={};
    data.forEach(e=>{
      const cat=(e&&e.cat)||'Muu';
      byCat[cat]=(byCat[cat]||0)+(+e.amt||0);
    });
    const cats=new Set([
      ...Object.keys(byCat),
      ...Object.entries(limits).filter(([,limit])=>limit>0).map(([cat])=>cat)
    ]);
    if(!cats.size){
      expBreakdown.innerHTML='<em>Valitud kuul kulusid pole.</em>';
      return;
    }
    const ordered=[];
    CATEGORY_ORDER.forEach(cat=>{ if(cats.has(cat)){ ordered.push(cat); cats.delete(cat);} });
    Array.from(cats).sort().forEach(cat=>ordered.push(cat));
    const asOf = opts.asOf || new Date();
    const items = ordered.map(cat=>{
      const spent=+byCat[cat]||0;
      const limit=+limits[cat]||0;
      const label=CATEGORY_LABELS[cat]||cat;
      let status='Alles: € '+fmt2(Math.max(0,limit-spent));
      let statusClass='left';
      let ratio = limit ? spent/limit : 0;
      if(limit===0){
        status = spent>0 ? `Kulutatud: € ${fmt2(spent)}` : 'Pole limiiti';
      } else if(spent>limit){
        status = `Ületatud: € ${fmt2(Math.abs(limit-spent))}`;
      } else {
        const pctLeft = limit>0 ? Math.max(0,((limit-spent)/limit)*100) : 0;
        status = `Alles: € ${fmt2(Math.max(0,limit-spent))} (${fmt2(pctLeft)}%)`;
      }
      const percent = limit>0 ? Math.min(100,Math.max(0,(spent/limit)*100)) : (spent>0?100:0);
      return `<div class="item">
        <h4><span>${label}</span><span>€ ${fmt2(spent)}${limit>0?` / € ${fmt2(limit)}`:''}</span></h4>
        <div class="left">${status}</div>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(percent)}" aria-label="${label}"><div style="width:${percent}%"></div></div>
      </div>`;
    });
    expBreakdown.innerHTML=items.join('');
  }

  function refreshZazaLeft(expenses=currentMonthExpenses, capValue=+inputValue(inputs.zazaCap)||0){
    const spent = (expenses||[]).filter(e=>e.cat==='Zaza').reduce((sum,e)=>sum+(+e.amt||0),0);
    const left = Math.max(0, capValue - spent);
    setPillText('zaza', `Zaza alles: € ${fmt2(left)}`);
    const usedPct = capValue>0 ? Math.min(100,(spent/capValue)*100) : (spent>0?100:0);
    if(zazaProg){
      zazaProg.style.width = `${usedPct}%`;
      zazaProg.style.background = usedPct>100?'var(--bad)':(usedPct>90?'var(--warn)':'var(--accent)');
    }
  }

  function recomputeBudget(){
    const income=+inputValue(inputs.income)||0;
    const obligations = monthlyObligations(inputs,new Date());
    const limits = categoryLimits(inputs);
    const limitTotal = sumCategoryLimits(limits);
    const plannedTotal = obligations + limitTotal;
    const plannedLeft = income - plannedTotal;
    const spent = spentThisMonth();
    const paidSupports = paidSupportsTotal(new Date(), getPayMarks(), inputs);
    const realLeft = income - paidSupports - spent;
    const totalOut = obligations + limitTotal;
    const obligationsLeft = Math.max(0, obligations - paidSupports);
    const realClass = realLeft>0?'good':(realLeft<0?'bad':'');
    updateKpis(totalOut, realLeft, `Kohustused € ${fmt(obligations)} | Limiidid € ${fmt(limitTotal)} | Plaanijääk € ${fmt(plannedLeft)}`, realClass);
    updateSummaryContent({income, obligations, paidSupports, spent, limitTotal, plannedLeft, realLeft, obligationsLeft});
    setPillText('budget', `Reaaljääk: € ${fmt(realLeft)}`);
    renderExpenseBreakdown(currentMonthExpenses, inputs, {asOf:new Date()});
    refreshZazaLeft(currentMonthExpenses, +inputValue(inputs.zazaCap)||0);
  }


// ===== Extracted from index (19).html =====


  function withTransition(fn){
    return (...args)=>{
      if(document.startViewTransition){ document.startViewTransition(()=>fn(...args)); }
      else{ fn(...args); }
    };
  }
  function readExpenses(){ try{ return JSON.parse(localStorage.getItem(KEY_EXP)||'[]'); }catch(e){ return []; } }
  function writeExpenses(list){ localStorage.setItem(KEY_EXP, JSON.stringify(list)); }

  const expTblBody=$('#expTbl tbody');
  const expSum=$('#expSum');
  const expFilter=$('#expFilter');
  const prevMonthBtn=$('#prevMonth');
  const nextMonthBtn=$('#nextMonth');

  function formatMonthLabel(mk){
    const [year,month] = mk.split('-').map(Number);
    if(!year||!month) return mk;
    const dt = new Date(year, month-1, 1);
    return dt.toLocaleDateString(LOCALE,{month:'long',year:'numeric'});
  }
  function updateMonthBadge(){
    if(monthBadge) monthBadge.textContent = formatMonthLabel(viewMonth);
  }
  function updateMonthControls(){
    const idx = monthTimeline.indexOf(viewMonth);
    if(prevMonthBtn) prevMonthBtn.toggleAttribute('disabled', idx<=0);
    if(nextMonthBtn) nextMonthBtn.toggleAttribute('disabled', idx>=monthTimeline.length-1);
  }
  function virtualBudgetForMonth(month){
    if(month===CUR_MONTH) return null;
    const entry = archivesData.find(a=>a.month===month);
    return entry && entry.data && entry.data.budget ? createVirtualInputs(entry.data.budget) : createVirtualInputs();
  }
  function renderArchiveSummary(month, expenses, entry){
    const budgetInputs = virtualBudgetForMonth(month);
    if(!budgetInputs){
      recomputeBudget();
      return;
    }
    const asOf = new Date(month+'-01T00:00:00');
    const income = +inputValue(budgetInputs.income)||0;
    const obligations = monthlyObligations(budgetInputs, asOf);
    const limits = categoryLimits(budgetInputs);
    const limitTotal = sumCategoryLimits(limits);
    const plannedTotal = obligations + limitTotal;
    const plannedLeft = income - plannedTotal;
    const spent = (expenses||[]).reduce((sum,e)=>sum+(+e.amt||0),0);
    const paidSupports = obligations; // eeldame, et kuu lõikes tasutud
    const realLeft = income - paidSupports - spent;
    const obligationsLeft = Math.max(0, obligations - paidSupports);
    const alloc = `Kohustused € ${fmt(obligations)} | Limiidid € ${fmt(limitTotal)} | Plaanijääk € ${fmt(plannedLeft)}`;
    updateKpis(obligations+limitTotal, realLeft, alloc, realLeft>0?'good':(realLeft<0?'bad':''));
    updateSummaryContent({income, obligations, paidSupports, spent, limitTotal, plannedLeft, realLeft, obligationsLeft, note:'Arhiivikuul salvestatud seis.'});
    setPillText('budget', `Arhiivikuu jääk: € ${fmt(realLeft)}`);
    const cap = +inputValue(budgetInputs.zazaCap)||0;
    refreshZazaLeft(expenses, cap);
    renderExpenseBreakdown(expenses, budgetInputs, {asOf:asOf});
  }

  function renderExpenses(){
    if(!expTblBody) return;
    const all = readExpenses();
    const isCurrent = viewMonth === CUR_MONTH;
    const archiveEntry = viewMonth!==CUR_MONTH ? archivesData.find(a=>a.month===viewMonth) : null;
    const sourceList = isCurrent ? all.filter(e=>String(e.date||'').slice(0,7)===viewMonth) : (archiveEntry?.expenses||[]);
    if(isCurrent) currentMonthExpenses = sourceList.slice();
    const term = expFilterTerm.trim().toLowerCase();
    let filtered = sourceList;
    if(term){
      filtered = sourceList.filter(e=>[
        e.cat||'',
        e.note||'',
        e.date||''
      ].some(val=>String(val).toLowerCase().includes(term)));
    }
    const sorted = filtered.slice().sort((a,b)=>{
      const dir = expSort.dir==='asc'?1:-1;
      if(expSort.key==='amount'){
        const diff = (+a.amt||0) - (+b.amt||0);
        return diff===0?0:(diff>0?dir:-dir);
      }
      const at = new Date(a.date||'').getTime() || 0;
      const bt = new Date(b.date||'').getTime() || 0;
      return at===bt?0:(at>bt?dir:-dir);
    });
    expTblBody.innerHTML='';
    sorted.forEach(exp => {
      const originalIndex = all.indexOf(exp);
      const tr=document.createElement('tr');
      const when=new Date(exp.date);
      const formattedDate = Number.isFinite(when.getTime()) ? when.toLocaleDateString(LOCALE) : (exp.date||'');
      tr.innerHTML=`<td>${formattedDate}</td><td>${exp.cat||''}</td><td>${exp.note?exp.note.replace(/</g,'&lt;'):''}</td><td class="right">${fmt2(exp.amt)}</td><td>${isCurrent?'<button class="btn ghost icon" data-delete="true" aria-label="Kustuta">✕</button>':''}</td>`;
      if(isCurrent){
        const btn = tr.querySelector('[data-delete]');
        if(btn){
          btn.addEventListener('click',()=>{
            const latest = readExpenses();
            let idx = originalIndex;
            if(idx<0){
              idx = latest.findIndex(item => item && item.date===exp.date && item.cat===exp.cat && item.note===exp.note && +item.amt===+exp.amt);
            }
            if(idx>-1){
              latest.splice(idx,1);
              writeExpenses(latest);
              withTransition(renderExpenses)();
              persist();
            }
          });
        }
      }
      expTblBody.appendChild(tr);
    });
    const total = sorted.reduce((sum,e)=>sum+(+e.amt||0),0);
    if(expSum) expSum.textContent = fmt2(total);
    const monthLabel = formatMonthLabel(viewMonth);
    setPillText('spent', `${isCurrent?'Sel kuul':'Valitud kuu'}: € ${fmt2(total)}`);
    updateSortIndicators();
    if(isCurrent){
      recomputeBudget();
    } else {
      renderArchiveSummary(viewMonth, sorted, archiveEntry||{});
    }
  }
  function updateSortIndicators(){
    $$('[data-sort]').forEach(btn=>{
      const key = btn.getAttribute('data-sort');
      btn.closest('th')?.setAttribute('aria-sort', key===expSort.key ? (expSort.dir==='asc'?'ascending':'descending') : 'none');
    });
  }

  function renderArchives(){
    if(!archivesList) return;
    const list = (archivesData||[]).slice().reverse();
    if(!list.length){ archivesList.innerHTML = '<em>Arhiiv on tühi.</em>'; return; }
    archivesList.innerHTML = list.map(a=>{
      const tot = (a.expenses||[]).reduce((s,x)=>s+(+x.amt||0),0);
      const zaza = (a.expenses||[]).filter(x=>x.cat==='Zaza').reduce((s,x)=>s+(+x.amt||0),0);
      const when = new Date(a.ts).toLocaleString(LOCALE,{dateStyle:'short',timeStyle:'short'});
      return `<div class="archiveItem">
        <div><strong>${a.month}</strong> — arhiveeritud: ${when}</div>
        <div>Kulud kokku: <strong>€ ${fmt2(tot)}</strong>; Zaza: <strong>€ ${fmt2(zaza)}</strong></div>
        <div>Ülejääk EF-i: <strong>€ ${fmt2(a.carryOver||0)}</strong></div>
        <div class="summaryNote">Kirje sisaldab kogu kuu seisu (eelarve ja sätted) ning kõiki kulusid.</div>
      </div>`;
    }).join('');
  }

  function archiveIfMonthRolled(){
    const state = readState();
    const cur = monthKey(new Date());
    const storedMonth = (state.meta && state.meta.month) || null;
    const hadMeta = !!storedMonth;
    const monthChanged = hadMeta && storedMonth !== cur;
    state.archives = state.archives || [];
    state.data = state.data || {};
    if(monthChanged){
      let allExpenses = [];
      try { allExpenses = JSON.parse(localStorage.getItem(KEY_EXP) || '[]'); } catch (e) { allExpenses = []; }
      const prevMonth = storedMonth;
      const prevMonthExpenses = allExpenses.filter(e => String(e.date||'').slice(0,7) === prevMonth);
      const b = (state.data && state.data.budget) || {};
      const income = +b.income || 0;
      const prevAsOf = new Date(prevMonth+'-01T00:00:00');
      const obligations = monthlyObligations(createVirtualInputs(b), prevAsOf);
      const spent = prevMonthExpenses.reduce((s,x)=>s+(+x.amt||0),0);
      let carryOver = income - obligations - spent;
      if (!isFinite(carryOver)) carryOver = 0;
      if (carryOver < 0) carryOver = 0;
      const archiveEntry = {
        month: prevMonth,
        ts: Date.now(),
        data: state.data || {},
        expenses: prevMonthExpenses,
        carryOver: carryOver
      };
      state.archives.push(archiveEntry);
      if (!state.data.budget) state.data.budget = {};
      state.data.budget.efNow = (+state.data.budget.efNow || 0) + carryOver;
      localStorage.removeItem(KEY_EXP);
      state.payMarks = state.payMarks || {};
      if(state.payMarks[prevMonth]) delete state.payMarks[prevMonth];
      state.payMarks[cur] = defaultPayMarks();
      resetPayMarksCache();
    }
    state.meta = { month: cur };
    writeState(state);
  }

  function updateTimeline(){
    monthTimeline = archivesData.map(a=>a.month);
    if(!monthTimeline.includes(CUR_MONTH)) monthTimeline.push(CUR_MONTH);
    monthTimeline.sort();
    if(!monthTimeline.includes(viewMonth)) viewMonth = CUR_MONTH;
    updateMonthBadge();
    updateMonthControls();
  }

  function handleMonthNav(delta){
    const idx = monthTimeline.indexOf(viewMonth);
    const nextIdx = idx + delta;
    if(nextIdx<0 || nextIdx>=monthTimeline.length) return;
    viewMonth = monthTimeline[nextIdx];
    updateMonthBadge();
    updateMonthControls();
    renderExpenses();
  }

  function recomputeZaza(){
    const monthly=(+inputValue(inputs.pricePerGram)||0)*(+inputs.gramsPerWeek.value||0)*4.3;
    if(inputs.zazaAuto) setCurrencyValue(inputs.zazaAuto, monthly);
    return monthly;
  }

  const capMsg=$('#capMsg');
  if(inputs.applyCap){
    inputs.applyCap.addEventListener('click',()=>{
      const monthly=recomputeZaza();
      const cutPct=clamp(+inputs.zazaCutPct.value||0,0,100);
      const newCap=Math.round(monthly*(1-cutPct/100));
      const savings=Math.max(0,Math.round(monthly-newCap));
      setCurrencyValue(inputs.zazaCap, newCap);
      const efNeed=Math.max(0,(+inputValue(inputs.efTarget)||0)-(+inputValue(inputs.efNow)||0));
      if(capMsg) capMsg.textContent=`Ülempiir €${fmt(newCap)}. Sääst €${fmt(savings)} suunatud EF-i (vajadus €${fmt(efNeed)}).`;
      recomputeBudget(); persist();
    });
  }

  const startUrge=$('#startUrge'); const urgeClock=$('#urgeClock'); let urgeTimer=null;
  if(startUrge){ startUrge.addEventListener('click',()=>{ if(urgeTimer){clearInterval(urgeTimer); urgeTimer=null;} let secs=180; if(urgeClock) urgeClock.textContent='03:00';
    urgeTimer=setInterval(()=>{ secs--; if(secs<=0){clearInterval(urgeTimer); urgeTimer=null; if(urgeClock) urgeClock.textContent='Valmis ✓'; return;}
      const m=String(Math.floor(secs/60)).padStart(2,'0'); const s=String(secs%60).padStart(2,'0'); if(urgeClock) urgeClock.textContent=`${m}:${s}`; },1000);
  });}


// ===== Extracted from index (19).html =====


  function collectData(){
    return {
      budget:{
        income:+inputValue(inputs.income)||0,
        loans:+inputValue(inputs.loans)||0,
        mom:+inputValue(inputs.mom)||0,
        momEnd:inputValue(inputs.momEnd)||'',
        aptSupport:+inputValue(inputs.aptSupport)||0,
        aptSupportEnd:inputValue(inputs.aptSupportEnd)||'',
        phone:+inputValue(inputs.phone)||0,
        transport:+inputValue(inputs.transport)||0,
        groceries:+inputValue(inputs.groceries)||0,
        otherEss:+inputValue(inputs.otherEss)||0,
        fun:+inputValue(inputs.fun)||0,
        personal:+inputValue(inputs.personal)||0,
        zazaCap:+inputValue(inputs.zazaCap)||0,
        efTarget:+inputValue(inputs.efTarget)||0,
        efNow:+inputValue(inputs.efNow)||0
      },
      cannabis:{ price:+inputValue(inputs.pricePerGram)||0, grams:+inputs.gramsPerWeek.value||0, cutPct:+inputs.zazaCutPct.value||0 },
      user:{ paydays: (inputs.paydays||{}).value || '' },
      psych:{ impl: ($('#implIntents')||{}).value || '' }
    };
  }
  function applyData(d){
    if(d.budget){
      for(const k in d.budget){
        if(inputs[k]) setCurrencyValue(inputs[k], d.budget[k]);
      }
      if(inputs.momEnd) inputs.momEnd.value = d.budget.momEnd || '';
      if(inputs.aptSupportEnd) inputs.aptSupportEnd.value = d.budget.aptSupportEnd || '';
    }
    if(d.cannabis){
      setCurrencyValue(inputs.pricePerGram, d.cannabis.price||0);
      inputs.gramsPerWeek.value = d.cannabis.grams || 0;
      inputs.zazaCutPct.value = d.cannabis.cutPct || 0;
    }
    if(d.budget && typeof d.budget.zazaCap !== 'undefined'){ setCurrencyValue(inputs.zazaCap, d.budget.zazaCap); }
    if(d.budget && typeof d.budget.efTarget !== 'undefined'){ setCurrencyValue(inputs.efTarget, d.budget.efTarget); }
    if(d.budget && typeof d.budget.efNow !== 'undefined'){ setCurrencyValue(inputs.efNow, d.budget.efNow); }
    if(d.user&&inputs.paydays){ inputs.paydays.value=d.user.paydays||''; }
    if(d.psych&&$('#implIntents')) $('#implIntents').value=d.psych.impl||'';
  }
  function persist(){ const state=readState(); state.data=collectData(); writeState(state); }

  function load(){
    archiveIfMonthRolled();
    const state=readState();
    archivesData = state.archives || [];
    applyData(state.data||{});
    recomputeZaza();
    updateTimeline();
    initPayToggles();
    renderArchives();
    updatePayInfo();
    renderExpenses();
  }

  const filterHandler = debounce(value=>{ expFilterTerm = value; renderExpenses(); },180);
  if(expFilter){
    expFilter.addEventListener('input',e=>filterHandler(e.target.value));
  }
  $$('[data-sort]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const key = btn.getAttribute('data-sort');
      if(expSort.key===key){ expSort.dir = expSort.dir==='asc'?'desc':'asc'; }
      else{ expSort = {key,dir:'desc'}; }
      renderExpenses();
    });
  });
  if(prevMonthBtn) prevMonthBtn.addEventListener('click',()=>handleMonthNav(-1));
  if(nextMonthBtn) nextMonthBtn.addEventListener('click',()=>handleMonthNav(1));

  const expDialog=document.querySelector('#expDialog');
  const btnExpQuick=document.querySelector('#expQuick');
  const btnCloseExpDlg=document.querySelector('#closeExpDlg');
  const btnCancelExp=document.querySelector('#cancelExp');
  const expCat=expDialog?expDialog.querySelector('#expCat'):document.querySelector('#expCat');
  const expAmt=expDialog?expDialog.querySelector('#expAmt'):document.querySelector('#expAmt');
  const expDate=expDialog?expDialog.querySelector('#expDate'):document.querySelector('#expDate');
  const expNote=expDialog?expDialog.querySelector('#expNote'):document.querySelector('#expNote');
  const addExp=expDialog?expDialog.querySelector('#addExp'):document.querySelector('#addExp');

  const sectionButtons = $$('[data-dialog-target]');
  let activeSectionTrigger = null;
  sectionButtons.forEach(btn => {
    const targetId = btn.getAttribute('data-dialog-target');
    if(!targetId) return;
    const dialog = document.getElementById(targetId);
    if(!(dialog && typeof dialog.showModal === 'function')) return;
    dialog.querySelectorAll('[data-dialog-close]').forEach(closeBtn => {
      closeBtn.addEventListener('click', () => dialog.close());
    });
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      dialog.close();
    });
    dialog.addEventListener('close', () => {
      if(activeSectionTrigger){
        activeSectionTrigger.focus();
        activeSectionTrigger = null;
      }
    });
    btn.addEventListener('click', () => {
      activeSectionTrigger = btn;
      if(!dialog.open){
        dialog.showModal();
      }
    });
  });

  function todayISO(){ const d=new Date(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${d.getFullYear()}-${m}-${day}`; }
  if(btnExpQuick && expDialog){
    btnExpQuick.addEventListener('click',()=>{
      if(viewMonth!==CUR_MONTH){
        viewMonth = CUR_MONTH;
        updateMonthBadge();
        updateMonthControls();
        renderExpenses();
      }
      if(expDate) expDate.value=todayISO();
      if(expAmt) { expAmt.value=''; delete expAmt.dataset.raw; setFieldError(expAmt,''); }
      if(expNote) expNote.value='';
      expDialog.showModal();
      requestAnimationFrame(()=>{ expCat && expCat.focus(); });
    });
  }
  [btnCloseExpDlg, btnCancelExp].forEach(b=> b && b.addEventListener('click', ()=> expDialog && expDialog.close()));
  if(expDialog){ expDialog.addEventListener('close', ()=>{ if(btnExpQuick) btnExpQuick.focus(); }); }

  if(addExp){ addExp.addEventListener('click',()=>{
      const amt = +inputValue(expAmt) || 0;
      if(!amt){ setFieldError(expAmt,'Sisesta summa.'); expAmt && expAmt.focus(); return; }
      setFieldError(expAmt,'');
      const e={
        cat: expCat?.value || '',
        amt,
        date: expDate?.value || todayISO(),
        note: expNote?.value?.trim() || ''
      };
      const all=readExpenses();
      all.push(e);
      writeExpenses(all);
      if(expAmt){ expAmt.value=''; delete expAmt.dataset.raw; }
      if(expNote) expNote.value='';
      withTransition(renderExpenses)();
      persist();
      if(expDialog?.open) expDialog.close();
      if(btnExpQuick) btnExpQuick.focus();
  }); }

  document.querySelectorAll('input,select,textarea').forEach(el=>{
    el.addEventListener('input', ()=>{
      if(el===inputs.pricePerGram || el===inputs.gramsPerWeek){ recomputeZaza(); }
      if(['income','loans','mom','momEnd','aptSupport','aptSupportEnd','phone','transport','groceries','otherEss','fun','personal','zazaCap','efTarget','efNow'].includes(el.id)){
        validateCurrencyInput(el);
        recomputeBudget();
      }
      if(el===inputs.paydays){ updatePayInfo(); }
      persist();
    });
    if(el.classList.contains('currency')){
      el.addEventListener('blur',()=>{ validateCurrencyInput(el); });
    }
  });

  document.documentElement.style.setProperty('--app-min-h','100dvh');
  updateMonthBadge();
  load();

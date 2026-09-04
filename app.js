document.getElementById('year').textContent = new Date().getFullYear();

/* ============================================
   PRELOADER
   ============================================ */
(function preloaderInit(){
  const preloader = document.getElementById('preloader');
  const fill = document.getElementById('preloaderFill');
  const pct = document.getElementById('preloaderPct');
  if(!preloader) return;

  let progress = 0;
  const minDuration = 1200; // ms, premium feel even on fast connections
  const startTime = Date.now();

  const tick = () => {
    // ease toward 90% while waiting, then snap to 100 on finish()
    const target = 90;
    progress += (target - progress) * 0.06 + 0.4;
    if (progress > target) progress = target;
    fill.style.width = progress + '%';
    pct.textContent = Math.round(progress) + '%';
    if (progress < target) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  let finished = false;
  function finish(){
    if (finished) return;
    finished = true;
    const elapsed = Date.now() - startTime;
    const wait = Math.max(0, minDuration - elapsed);
    setTimeout(() => {
      progress = 100;
      fill.style.width = '100%';
      pct.textContent = '100%';
      setTimeout(() => {
        preloader.classList.add('is-done');
        document.body.classList.remove('lock-scroll');
        runHeroIntro();
        setTimeout(() => preloader.classList.add('is-hidden'), 1100);
      }, 220);
    }, wait);
  }

  document.body.classList.add('lock-scroll');
  if (document.readyState === 'complete') {
    finish();
  } else {
    window.addEventListener('load', finish);
    // safety net in case 'load' is delayed by slow third-party assets
    setTimeout(finish, 4000);
  }
})();

/* ============================================
   HERO TEXT SPLIT + INTRO
   ============================================ */
function runHeroIntro(){
  document.querySelectorAll('.hero__title-line[data-split]').forEach((line, lineIndex) => {
    const text = line.textContent;
    line.textContent = '';
    text.split('').forEach((ch, i) => {
      const span = document.createElement('span');
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      span.style.transform = 'translateY(110%)';
      span.style.opacity = '0';
      span.style.transition = `transform .7s cubic-bezier(.16,.84,.32,1) ${(lineIndex * 0.25) + i * 0.035}s, opacity .7s ease ${(lineIndex * 0.25) + i * 0.035}s`;
      line.appendChild(span);
    });
  });

  const eyebrow = document.querySelector('.hero__eyebrow span');
  if (eyebrow) {
    eyebrow.style.transform = 'translateY(100%)';
    eyebrow.style.opacity = '0';
    eyebrow.style.transition = 'transform .7s cubic-bezier(.16,.84,.32,1) .05s, opacity .7s ease .05s';
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelectorAll('.hero__title-line[data-split] span').forEach(s => {
        s.style.transform = 'translateY(0)';
        s.style.opacity = '1';
      });
      if (eyebrow) { eyebrow.style.transform = 'translateY(0)'; eyebrow.style.opacity = '1'; }
      document.querySelectorAll('.hero__text .reveal-fade, .hero__visual.reveal-fade').forEach(el => {
        el.classList.add('in-view');
      });
    });
  });
}

/* ============================================
   SCROLL REVEAL (sections below the fold)
   ============================================ */
(function scrollRevealInit(){
  const targets = document.querySelectorAll('.reveal-up');
  if (!('IntersectionObserver' in window) || !targets.length) {
    targets.forEach(t => t.classList.add('in-view'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
  targets.forEach(t => io.observe(t));
})();

/* ============================================
   SCROLL PROGRESS BAR
   ============================================ */
(function scrollProgressInit(){
  const bar = document.getElementById('scrollProgress');
  if (!bar) return;
  const onScroll = () => {
    const h = document.documentElement;
    const scrolled = h.scrollTop;
    const max = h.scrollHeight - h.clientHeight;
    bar.style.width = max > 0 ? (scrolled / max * 100) + '%' : '0%';
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ============================================
   AMBIENT EMBER PARTICLES (hero background)
   ============================================ */
(function particlesInit(){
  const wrap = document.getElementById('heroParticles');
  if (!wrap) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;
  const count = window.innerWidth < 700 ? 10 : 20;
  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    const left = Math.random() * 100;
    const duration = 7 + Math.random() * 8;
    const delay = Math.random() * 10;
    const drift = (Math.random() * 80 - 40) + 'px';
    const size = 2 + Math.random() * 2.5;
    span.style.left = left + '%';
    span.style.width = size + 'px';
    span.style.height = size + 'px';
    span.style.setProperty('--drift', drift);
    span.style.animationDuration = duration + 's';
    span.style.animationDelay = delay + 's';
    wrap.appendChild(span);
  }
})();

/* ============================================
   CURSOR GLOW (desktop only)
   ============================================ */
(function cursorGlowInit(){
  const glow = document.getElementById('cursorGlow');
  if (!glow) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let raf = null;
  window.addEventListener('mousemove', (e) => {
    glow.classList.add('is-active');
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`;
    });
  }, { passive: true });
  document.addEventListener('mouseleave', () => glow.classList.remove('is-active'));
})();

/* ============================================
   3D TILT ON CARDS (desktop only)
   ============================================ */
(function tiltInit(){
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const cards = document.querySelectorAll('.tilt-card');
  cards.forEach(card => {
    let raf = null;
    card.addEventListener('mousemove', (e) => {
      // don't fight the reveal animation
      if (!card.classList.contains('in-view')) return;
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.transform = `perspective(900px) rotateX(${(-y * 3).toFixed(2)}deg) rotateY(${(x * 4).toFixed(2)}deg) translateY(-3px)`;
      });
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(900px) rotateX(0) rotateY(0) translateY(0)';
    });
  });

  // hero trainer image — slightly stronger parallax tilt
  const heroTilt = document.getElementById('heroTilt');
  const heroStage = document.querySelector('.hero__visual');
  if (heroTilt && heroStage) {
    heroStage.addEventListener('mousemove', (e) => {
      const rect = heroStage.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      heroTilt.style.transform = `rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg)`;
    });
    heroStage.addEventListener('mouseleave', () => {
      heroTilt.style.transform = 'rotateX(0) rotateY(0)';
    });
  }
})();

/* ============================================
   MAGNETIC BUTTONS (desktop only)
   ============================================ */
(function magneticInit(){
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.querySelectorAll('.btn-magnetic').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.10}px, ${y * 0.18}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });
})();

/* ============================================
   NAV (burger + mobile drawer)
   ============================================ */
const burger = document.getElementById('burger');
const navMobile = document.getElementById('navMobile');
const navOverlay = document.getElementById('navOverlay');

function closeMobileNav(){
  navMobile.classList.remove('open');
  navOverlay.classList.remove('open');
  burger.classList.remove('is-open');
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-label', 'Open menu');
}
function toggleMobileNav(){
  const isOpen = navMobile.classList.toggle('open');
  navOverlay.classList.toggle('open', isOpen);
  burger.classList.toggle('is-open', isOpen);
  burger.setAttribute('aria-expanded', String(isOpen));
  burger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
}
burger.addEventListener('click', toggleMobileNav);
navOverlay.addEventListener('click', closeMobileNav);
navMobile.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobileNav));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMobileNav(); });

/* ============================================
   NUMBER COUNT-UP HELPER (visual only)
   ============================================ */
function animateCountUp(el, endValue, duration = 700, decimals = 0){
  if (!el) return;
  const startValue = 0;
  const startTime = performance.now();
  function step(now){
    const p = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    const current = startValue + (endValue - startValue) * eased;
    el.textContent = decimals > 0 ? current.toFixed(decimals) : Math.round(current);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = decimals > 0 ? endValue.toFixed(decimals) : Math.round(endValue);
  }
  requestAnimationFrame(step);
}

/* ============================================================
   1. DIET CALCULATOR
   ============================================================ */
const calcForm = document.getElementById('calcForm');
const calcResult = document.getElementById('calcResult');

calcForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(calcForm);
  const gender = fd.get('gender');
  const age = +fd.get('age');
  const height = +fd.get('height');
  const weight = +fd.get('weight');
  const activity = +fd.get('activity');
  const goal = fd.get('goal');

  // Mifflin-St Jeor BMR
  let bmr = 10 * weight + 6.25 * height - 5 * age + (gender === 'male' ? 5 : -161);
  let tdee = bmr * activity;

  let target = tdee;
  if (goal === 'lose') target = tdee - 500;
  if (goal === 'gain') target = tdee + 350;

  // Macro split by goal
  let proteinPerKg = goal === 'gain' ? 2.0 : goal === 'lose' ? 2.2 : 1.8;
  let proteinG = proteinPerKg * weight;
  let proteinKcal = proteinG * 4;

  let fatKcal = target * (goal === 'lose' ? 0.25 : 0.28);
  let fatG = fatKcal / 9;

  let carbKcal = target - proteinKcal - fatKcal;
  let carbG = Math.max(carbKcal, 0) / 4;

  const proteinPct = Math.round((proteinKcal / target) * 100);
  const fatPct = Math.round((fatKcal / target) * 100);
  const carbPct = Math.max(0, 100 - proteinPct - fatPct);

  const water = (weight * 0.035).toFixed(1);
  const fiber = goal === 'lose' ? 32 : 28;
  const goalLabel = goal === 'lose' ? 'Fat loss' : goal === 'gain' ? 'Muscle gain' : 'Maintenance';

  calcResult.innerHTML = `
    <div class="result__kcal">
      <div class="num" id="calcKcalNum">0</div>
      <div class="lbl">kcal a day · ${goalLabel}</div>
    </div>
    <div class="result__macros">
      <div class="macro protein">
        <div class="bar"><i style="width:0%" data-w="${proteinPct}"></i></div>
        <div class="g">${Math.round(proteinG)}g</div>
        <div class="label">Protein · ${proteinPct}%</div>
      </div>
      <div class="macro carb">
        <div class="bar"><i style="width:0%" data-w="${carbPct}"></i></div>
        <div class="g">${Math.round(carbG)}g</div>
        <div class="label">Carbs · ${carbPct}%</div>
      </div>
      <div class="macro fat">
        <div class="bar"><i style="width:0%" data-w="${fatPct}"></i></div>
        <div class="g">${Math.round(fatG)}g</div>
        <div class="label">Fat · ${fatPct}%</div>
      </div>
    </div>
    <div class="result__extra">
      <span>BMR: <strong>${Math.round(bmr)} kcal</strong></span>
      <span>TDEE: <strong>${Math.round(tdee)} kcal</strong></span>
    </div>
    <div class="result__extra">
      <span>Water: <strong>${water} L</strong></span>
      <span>Fibre: <strong>${fiber} g</strong></span>
    </div>
    <p class="result__note">These are estimates. Adjust by 100–200 kcal after two weeks if your weight isn't moving the way you want.</p>
  `;

  animateCountUp(document.getElementById('calcKcalNum'), Math.round(target), 900);
  requestAnimationFrame(() => {
    calcResult.querySelectorAll('.macro .bar i').forEach(bar => {
      bar.style.width = bar.dataset.w + '%';
    });
  });
});
calcForm.dispatchEvent(new Event('submit'));


/* ============================================================
   2. SINGLE FOOD NUTRITION CHECKER
   ============================================================ */
const USDA_API_KEY = "fzjGdwzTlXUAyv694c75YG84fWRcfuyX8EpXUFgT";

let totalCalories = 0;
let totalProtein = 0;
let totalCarbs = 0;
let totalFat = 0;

function setMsg(text){
  const searchMsg = document.getElementById("searchMsg");
  if (searchMsg) searchMsg.textContent = text;
}

function pulseTotals(){
  const totalsBox = document.querySelector('.food-total');
  if (!totalsBox) return;
  totalsBox.classList.add('pulse');
  setTimeout(() => totalsBox.classList.remove('pulse'), 500);
}

function refreshTotals(){
  document.getElementById("totalCalories").textContent = totalCalories.toFixed(1);
  document.getElementById("totalProtein").textContent = totalProtein.toFixed(1);
  document.getElementById("totalCarbs").textContent = totalCarbs.toFixed(1);
  document.getElementById("totalFat").textContent = totalFat.toFixed(1);
  pulseTotals();
}

function refreshEmptyState(){
  const empty = document.getElementById("fcheckEmpty");
  const rows = document.getElementById("foodTableBody").children.length;
  if (empty) empty.classList.toggle('is-hidden', rows > 0);
}
refreshEmptyState();

(function foodCheckerInit(){
  const input = document.getElementById("fcheckInput");
  const qtyInput = document.getElementById("fcheckQty");
  const unitInput = document.getElementById("fcheckUnit");
  const form = document.getElementById("fcheckForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const foodName = input.value.trim();
    const qty = Number(qtyInput.value) || 100;
    const unit = unitInput.value;

    if (!foodName) {
      setMsg("Enter a food name to add it to the list.");
      input.focus();
      return;
    }

    setMsg("Searching…");
    searchWorldwideFood(foodName, qty, unit);
  });
})();

async function searchWorldwideFood(foodName, qty = 100, unit = "g"){
  try {
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(foodName)}&api_key=${USDA_API_KEY}`
    );

    const data = await response.json();

    if (!data.foods || data.foods.length === 0) {
      setMsg(`No nutrition information found for "${foodName}". Try a simpler name, like "rice" or "egg".`);
      return;
    }

    const food = data.foods[0];

    function getNutrient(name, unitName) {
      const nutrient = food.foodNutrients.find(n =>
        n.nutrientName === name && (!unitName || n.unitName === unitName)
      );
      return nutrient ? nutrient.value : 0;
    }

    const factor = unit === "g" ? qty / 100 : qty;

    // USDA returns Energy in both KCAL and KJ — take the kcal entry.
    const calories = (getNutrient("Energy", "KCAL") * factor).toFixed(1);
    const protein  = (getNutrient("Protein") * factor).toFixed(1);
    const carbs    = (getNutrient("Carbohydrate, by difference") * factor).toFixed(1);
    const fat      = (getNutrient("Total lipid (fat)") * factor).toFixed(1);

    const tbody = document.getElementById("foodTableBody");
    const row = document.createElement("tr");
    row.style.animationDelay = (tbody.children.length * 0.05) + 's';

    row.innerHTML = `
      <td>${food.description}</td>
      <td data-label="Qty">${qty} ${unit}</td>
      <td data-label="Calories">${calories}</td>
      <td data-label="Protein">${protein} g</td>
      <td data-label="Carbs">${carbs} g</td>
      <td data-label="Fat">${fat} g</td>
      <td><button class="remove-btn" type="button" aria-label="Remove ${food.description}">×</button></td>
    `;

    tbody.appendChild(row);
    refreshEmptyState();

    totalCalories += Number(calories);
    totalProtein  += Number(protein);
    totalCarbs    += Number(carbs);
    totalFat      += Number(fat);
    refreshTotals();

    row.querySelector(".remove-btn").addEventListener("click", () => {
      totalCalories -= Number(calories);
      totalProtein  -= Number(protein);
      totalCarbs    -= Number(carbs);
      totalFat      -= Number(fat);
      refreshTotals();

      row.style.transition = 'opacity .3s ease, transform .3s ease';
      row.style.opacity = '0';
      row.style.transform = 'translateX(12px)';
      setTimeout(() => { row.remove(); refreshEmptyState(); }, 280);
    });

    document.getElementById("fcheckInput").value = "";
    document.getElementById("fcheckQty").value = 100;
    document.getElementById("fcheckUnit").value = "g";
    setMsg("");

  } catch (error) {
    console.error(error);
    setMsg("Couldn't reach the nutrition database. Check your connection and try again.");
  }
}

/* ============================================================
   3. BMI
   ============================================================ */
const bmiForm = document.getElementById("bmiForm");
const bmiResult = document.getElementById("bmiResult");

if (bmiForm) {
  bmiForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const h = Number(document.getElementById("bmiHeight").value);
    const w = Number(document.getElementById("bmiWeight").value);

    if (!h || !w) {
      return;
    }

    const bmi = w / ((h / 100) ** 2);

    let status = "";
    if (bmi < 18.5) status = "Underweight";
    else if (bmi < 25) status = "Normal";
    else if (bmi < 30) status = "Overweight";
    else status = "Obese";

    bmiResult.innerHTML = `
      <div class="bmi-card">
        <h3>Your BMI</h3>
        <div class="bmi-number" id="bmiNumDisplay">0.0</div>
        <div class="bmi-status">${status}</div>

        <div class="bmi-bar">
          <div class="bmi-indicator" id="bmiIndicator" style="left:0%"></div>
        </div>
        <div class="bmi-scale">
          <span style="left:0%">15</span>
          <span style="left:17.5%">18.5</span>
          <span style="left:50%">25</span>
          <span style="left:75%">30</span>
          <span style="left:100%">35</span>
        </div>

        <p class="bmi-note">BMI doesn't account for muscle mass, so it reads high for a lot of people who lift.</p>
      </div>
    `;

    animateCountUp(document.getElementById('bmiNumDisplay'), bmi, 700, 1);

    const indicator = document.getElementById('bmiIndicator');
    const pct = Math.max(0, Math.min(100, ((bmi - 15) / (35 - 15)) * 100));
    requestAnimationFrame(() => {
      if (indicator) indicator.style.left = `calc(${pct}% - 9px)`;
    });
  });
}

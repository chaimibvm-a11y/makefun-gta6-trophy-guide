// Leonida Trophy Guide: checklist, roadmap, missables, spoiler setting.
// Progress and the spoiler setting are saved in localStorage; export and
// import move the progress file. All data comes from data/trophies.json.
// The app makes no network request at run time beyond loading its own files.
const KEY = 'gta6-trophy-checklist';
const SPOILER_KEY = 'gta6-trophy-spoiler';
const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));
const earned = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
let spoilerOn = localStorage.getItem(SPOILER_KEY) === '1';
let kind = 'all';
let grade = 'all';
let query = '';
let selectedId = null;

const $ = (id) => document.getElementById(id);
const rowsEl = $('rows');
const detailEl = $('detail');

function save() {
  localStorage.setItem(KEY, JSON.stringify([...earned]));
}

function isStory(t) {
  return t.kinds.includes('story');
}

function isMasked(t) {
  return spoilerOn && isStory(t) && !earned.has(t.name);
}

function medal(t) {
  return `<span class="medal ${t.grade}" title="${t.grade}"></span>`;
}

function tags(t) {
  const out = [];
  if (t.missable) out.push('<span class="tag miss">Missable</span>');
  if (t.hidden) out.push('<span class="tag hidden">Hidden</span>');
  for (const k of t.kinds) {
    if (k === 'missable') continue;
    out.push(`<span class="tag">${k}</span>`);
  }
  return out.join(' ');
}

function gradeLabel(t) {
  return `${medal(t)}<span class="glabel">${t.grade}</span>`;
}

function matches(t) {
  if (kind === 'online') return false;
  if (kind !== 'all' && !t.kinds.includes(kind)) return false;
  if (grade !== 'all' && t.grade !== grade) return false;
  if (query) {
    const hay = `${t.name} ${t.description} ${t.guide}`.toLowerCase();
    if (!hay.includes(query)) return false;
  }
  return true;
}

function renderProgress() {
  const total = trophies.length;
  const n = earned.size;
  $('earnedCount').textContent = n;
  $('barFill').style.width = `${(n / total) * 100}%`;
  $('progressText').textContent = `${n} of ${total} earned`;
  const counts = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const all = trophies.filter((t) => t.grade === g).length;
    const got = trophies.filter((t) => t.grade === g && earned.has(t.name)).length;
    return `${g} ${got}/${all}`;
  });
  $('gradeCounts').textContent = counts.join(' · ');
}

function renderList() {
  rowsEl.replaceChildren();
  const shown = trophies.filter(matches);
  for (const t of shown) {
    const tr = document.createElement('tr');
    if (earned.has(t.name)) tr.classList.add('earned');
    if (selectedId === t.id) tr.classList.add('selected');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.name);
    box.setAttribute('aria-label', `Mark ${t.name} earned`);
    box.addEventListener('change', (e) => {
      e.stopPropagation();
      if (box.checked) earned.add(t.name);
      else earned.delete(t.name);
      save();
      renderAll();
    });
    const c0 = document.createElement('td');
    c0.className = 'c';
    c0.append(box);
    const c1 = document.createElement('td');
    if (isMasked(t)) {
      c1.innerHTML = '<span class="tname">Hidden story trophy</span><br><span class="tdesc">Earn it to reveal its name and description.</span>';
    } else {
      const name = document.createElement('span');
      name.className = 'tname';
      name.textContent = t.name;
      const br = document.createElement('br');
      const desc = document.createElement('span');
      desc.className = 'tdesc';
      desc.textContent = t.description;
      c1.append(name, br, desc);
    }
    const c2 = document.createElement('td');
    c2.innerHTML = gradeLabel(t);
    const c3 = document.createElement('td');
    c3.innerHTML = tags(t);
    tr.append(c0, c1, c2, c3);
    tr.tabIndex = 0;
    tr.addEventListener('click', () => {
      selectedId = t.id;
      renderList();
      renderDetail();
    });
    tr.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectedId = t.id;
        renderList();
        renderDetail();
      }
    });
    rowsEl.append(tr);
  }
  const empty = $('emptyState');
  if (kind === 'online') {
    empty.hidden = false;
    empty.textContent = 'No online trophies: all 55 trophies unlock in single player. There is nothing to track here.';
  } else if (shown.length === 0) {
    empty.hidden = false;
    empty.textContent = 'No trophies match these filters. Clear the search or pick another kind.';
  } else {
    empty.hidden = true;
  }
  const kindName = kind === 'all' ? 'all kinds' : kind;
  $('listHint').textContent = `Showing ${shown.length} of ${trophies.length} trophies (${kindName}${grade !== 'all' ? `, ${grade}` : ''}${query ? `, matching “${query}”` : ''}). Click a row to read its guide.`;
}

function sourceList(t) {
  const ul = document.createElement('ul');
  ul.className = 'sources';
  for (const s of t.sources) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = s.name;
    li.append(a);
    ul.append(li);
  }
  return ul;
}

function renderDetail() {
  detailEl.replaceChildren();
  if (selectedId === null) {
    const p = document.createElement('p');
    p.className = 'detail-empty';
    p.textContent = 'Select a trophy to read its guide and sources.';
    detailEl.append(p);
    return;
  }
  const t = byId.get(selectedId);
  const h = document.createElement('h3');
  h.textContent = isMasked(t) ? 'Hidden story trophy' : t.name;
  detailEl.append(h);
  const off = document.createElement('p');
  off.className = 'off';
  off.textContent = isMasked(t) ? 'Hidden on PlayStation until earned.' : t.description;
  detailEl.append(off);
  const meta = document.createElement('p');
  meta.className = 'meta';
  meta.innerHTML = gradeLabel(t) + ' · ' + tags(t);
  detailEl.append(meta);
  if (t.count !== null && t.countLabel) {
    const c = document.createElement('p');
    c.className = 'count';
    c.textContent = `PlayStation tracks this one: ${t.count.toLocaleString('en-US')} ${t.countLabel}.`;
    detailEl.append(c);
  }
  if (isMasked(t)) {
    const note = document.createElement('p');
    note.className = 'warn';
    note.textContent = 'Spoilers are hidden. Earn this trophy to reveal its guide and sources.';
    detailEl.append(note);
  } else {
    if (t.missable) {
      const w = document.createElement('p');
      w.className = 'warn';
      w.textContent = 'Missable: this is the one trophy in the list reported as missable. Read the Missables tab before you play past Chapter 1.';
      detailEl.append(w);
    }
    const g = document.createElement('p');
    g.className = 'guide';
    g.textContent = t.guide;
    detailEl.append(g);
    const sh = document.createElement('h4');
    sh.textContent = 'Sources';
    detailEl.append(sh);
    detailEl.append(sourceList(t));
    const sp = document.createElement('p');
    sp.className = 'meta';
    sp.textContent = 'Guide written in our own words for this entry. Names and descriptions are the official list.';
    detailEl.append(sp);
  }
  const line = document.createElement('p');
  line.className = 'earned-line';
  const btn = document.createElement('button');
  btn.type = 'button';
  const isEarned = earned.has(t.name);
  btn.textContent = isEarned ? '✓ Earned — undo' : 'Mark as earned';
  btn.classList.toggle('undo', isEarned);
  btn.addEventListener('click', () => {
    if (earned.has(t.name)) earned.delete(t.name);
    else earned.add(t.name);
    save();
    renderAll();
  });
  line.append(btn);
  detailEl.append(line);
}

function renderRoadmap() {
  const stagesEl = $('stages');
  stagesEl.replaceChildren();
  for (const s of doc.roadmap) {
    const members = trophies.filter((t) => t.stage === s.stage);
    const done = members.filter((t) => earned.has(t.name)).length;
    const li = document.createElement('li');
    const head = document.createElement('div');
    head.className = 'shead';
    const h = document.createElement('h3');
    h.textContent = `Stage ${s.stage}: ${s.title}`;
    const prog = document.createElement('span');
    prog.className = 'sprog';
    prog.textContent = `${done}/${members.length} earned`;
    head.append(h, prog);
    const p = document.createElement('p');
    p.textContent = s.text;
    const chips = document.createElement('div');
    chips.className = 'chips';
    for (const t of members) {
      const chip = document.createElement('span');
      chip.className = 'chip' + (earned.has(t.name) ? ' done' : '');
      chip.textContent = `${t.name} (${t.grade})`;
      chips.append(chip);
    }
    li.append(head, p, chips);
    stagesEl.append(li);
  }
  const nextEl = $('nextUp');
  nextEl.replaceChildren();
  const ordered = [...trophies].sort((a, b) => a.stage - b.stage || a.id - b.id);
  const next = ordered.filter((t) => !earned.has(t.name)).slice(0, 5);
  if (next.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Everything is earned: the platinum is yours.';
    nextEl.append(li);
  } else {
    for (const t of next) {
      const li = document.createElement('li');
      li.textContent = `${t.name} — ${t.description} (Stage ${t.stage})`;
      nextEl.append(li);
    }
  }
}

function renderMissables() {
  const list = $('missableList');
  list.replaceChildren();
  for (const t of trophies.filter((x) => x.missable)) {
    const card = document.createElement('div');
    card.className = 'misscard';
    const h = document.createElement('h3');
    h.textContent = `${t.name} — ${t.grade}`;
    const p = document.createElement('p');
    p.textContent = t.guide;
    const meta = document.createElement('p');
    meta.className = 'meta';
    meta.textContent = 'The only trophy reported as missable, by GTABase, PowerPyx, KeenGamer and Output Lag.';
    card.append(h, p, meta, sourceList(t));
    list.append(card);
  }
  const unc = $('unconfirmedList');
  unc.replaceChildren();
  const unconfirmed = ['In The Beginning…', 'Capital Offense', 'Bad Luck, I Guess', 'The Truth Is Out There', 'Ten Pin'];
  for (const name of unconfirmed) {
    const t = trophies.find((x) => x.name === name);
    const li = document.createElement('li');
    li.textContent = `${t.name}: ${t.description} — no confirmed unlock method at launch.`;
    unc.append(li);
  }
}

function renderAll() {
  renderProgress();
  renderList();
  renderDetail();
  renderRoadmap();
  renderMissables();
}

document.querySelectorAll('.tabs button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.view').forEach((v) => {
      v.hidden = v.id !== `view-${btn.dataset.view}`;
    });
  });
});

document.querySelectorAll('#kinds button').forEach((btn) => {
  btn.addEventListener('click', () => {
    kind = btn.dataset.kind;
    document.querySelectorAll('#kinds button').forEach((b) => b.classList.toggle('active', b === btn));
    renderList();
  });
});

$('grade').addEventListener('change', (e) => {
  grade = e.target.value;
  renderList();
});

$('search').addEventListener('input', (e) => {
  query = e.target.value.trim().toLowerCase();
  renderList();
});

$('spoiler').checked = spoilerOn;
$('spoiler').addEventListener('change', (e) => {
  spoilerOn = e.target.checked;
  localStorage.setItem(SPOILER_KEY, spoilerOn ? '1' : '0');
  renderAll();
});

$('export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify([...earned])], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
});

$('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const names = JSON.parse(await file.text());
    const valid = new Set(trophies.map((t) => t.name));
    earned.clear();
    for (const n of names) if (valid.has(n)) earned.add(n);
    save();
    renderAll();
  } catch {
    alert('That file is not valid progress JSON.');
  }
  e.target.value = '';
});

renderAll();

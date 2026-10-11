/* ============================================================
   ЗАСТАВКА
   ============================================================ */
(function boot() {
  const bootEl = document.getElementById('boot');
  let skipped = false;
  const timers = [];
  function skip() {
    if (skipped) return;
    skipped = true;
    timers.forEach(t => clearTimeout(t));
    finish(true);
  }
  bootEl.addEventListener('click', skip);
  window.addEventListener('keydown', skip);
  function finish(fast) {
    const wait = fast ? 200 : 500;
    const t = setTimeout(() => {
      bootEl.classList.add('done');
      document.body.classList.add('ready');
      setTimeout(() => bootEl.remove(), 900);
    }, wait);
    timers.push(t);
  }
  const t = setTimeout(() => finish(false), 3900);
  timers.push(t);
})();

/* ============================================================
   ИКОНКИ
   ============================================================ */
const ICON = {
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  emptyNotes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  emptyUsers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
};

/* ============================================================
   НАВИГАЦИЯ
   ============================================================ */
function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.querySelector('nav button[data-view="' + name + '"]').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.querySelectorAll('nav button').forEach(b => {
  b.onclick = () => switchView(b.dataset.view);
});

/* ============================================================
   КОНСПЕКТЫ
   ============================================================ */
const NKEY = 'oib_notes_v7';
let notes = JSON.parse(localStorage.getItem(NKEY) || '[]');
let editingId = null;
let filterSubject = 'all';

const grid = document.getElementById('notesGrid');
const filters = document.getElementById('filters');
const notesCount = document.getElementById('notesCount');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const inpSubject = document.getElementById('inpSubject');
const inpTitle = document.getElementById('inpTitle');
const inpContent = document.getElementById('inpContent');
const inpDate = document.getElementById('inpDate');
const inpPhoto = document.getElementById('inpPhoto');
const photoPreview = document.getElementById('photoPreview');
let pendingPhoto = null;

function saveNotes() { localStorage.setItem(NKEY, JSON.stringify(notes)); }
function esc(s) { return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* === ЗАГРУЗКА ФОТО === */
inpPhoto.onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    if (!confirm('Фото больше 2 МБ — может не сохраниться в браузере. Продолжить?')) {
      inpPhoto.value = '';
      return;
    }
  }
  const reader = new FileReader();
  reader.onload = ev => {
    pendingPhoto = ev.target.result;
    photoPreview.src = pendingPhoto;
    photoPreview.classList.add('show');
  };
  reader.readAsDataURL(file);
};

/* === ФИЛЬТРЫ === */
function renderFilters() {
  const subjects = ['all', ...new Set(notes.map(n => n.subject).filter(Boolean))];
  filters.innerHTML = subjects.map(s =>
    '<button class="chip ' + (s === filterSubject ? 'active' : '') + '" data-subject="' + esc(s) + '">' +
      (s === 'all' ? 'все' : esc(s)) +
    '</button>'
  ).join('');
  filters.querySelectorAll('.chip').forEach(chip => {
    chip.onclick = () => { filterSubject = chip.dataset.subject; renderFilters(); renderNotes(); };
  });
}

/* === СПИСОК КОНСПЕКТОВ === */
function renderNotes() {
  const list = filterSubject === 'all' ? notes : notes.filter(n => n.subject === filterSubject);
  notesCount.textContent = list.length ? '[' + list.length + ']' : '[0]';
  if (!list.length) {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1;"><div class="empty-icon">' + ICON.emptyNotes + '</div>ещё нет конспектов · нажми «новый»</div>';
    return;
  }
  grid.innerHTML = list.map((n, i) =>
    '<div class="note" data-id="' + n.id + '" style="animation-delay:' + (i*.04) + 's">' +
      '<div class="note-subject">' + esc(n.subject || 'без предмета') + '</div>' +
      '<div class="note-title">' + esc(n.title || 'без темы') + '</div>' +
      (n.photo ? '<img class="note-photo" src="' + n.photo + '" alt="">' : '') +
      '<div class="note-content">' + esc(n.content || '') + '</div>' +
      '<div class="note-footer">' +
        '<span>' + n.date + '</span>' +
        '<div class="note-actions">' +
          '<button class="btn-icon edit" data-act="edit">' + ICON.edit + '</button>' +
          '<button class="btn-icon del" data-act="del">' + ICON.trash + '</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  ).join('');

  grid.querySelectorAll('.note').forEach(el => {
    el.querySelector('[data-act="edit"]').onclick = e => { e.stopPropagation(); openEditNote(el.dataset.id); };
    el.querySelector('[data-act="del"]').onclick = e => { e.stopPropagation(); delNote(el.dataset.id); };
    el.onclick = () => el.classList.toggle('expanded');
  });

  grid.querySelectorAll('.note-photo').forEach(img => {
    img.onclick = e => {
      e.stopPropagation();
      document.getElementById('lightboxImg').src = img.src;
      document.getElementById('lightbox').classList.add('open');
    };
  });
}

/* === НОВЫЙ КОНСПЕКТ === */
function openNewNote() {
  editingId = null;
  modalTitle.textContent = 'новый конспект';
  inpSubject.value = '';
  inpTitle.value = '';
  inpContent.value = '';
  inpDate.value = new Date().toISOString().slice(0, 10);
  pendingPhoto = null;
  photoPreview.src = '';
  photoPreview.classList.remove('show');
  inpPhoto.value = '';
  modal.classList.add('open');
  setTimeout(() => inpSubject.focus(), 100);
}

/* === РЕДАКТИРОВАНИЕ === */
function openEditNote(id) {
  const n = notes.find(x => x.id === id);
  if (!n) return;
  editingId = id;
  modalTitle.textContent = 'редактировать';
  inpSubject.value = n.subject || '';
  inpTitle.value = n.title || '';
  inpContent.value = n.content || '';
  inpDate.value = n.dateRaw || new Date().toISOString().slice(0, 10);
  pendingPhoto = n.photo || null;
  if (pendingPhoto) {
    photoPreview.src = pendingPhoto;
    photoPreview.classList.add('show');
  } else {
    photoPreview.src = '';
    photoPreview.classList.remove('show');
  }
  inpPhoto.value = '';
  modal.classList.add('open');
  setTimeout(() => inpTitle.focus(), 100);
}

/* === УДАЛЕНИЕ === */
function delNote(id) {
  if (!confirm('Удалить этот конспект?')) return;
  notes = notes.filter(n => n.id !== id);
  saveNotes();
  renderFilters();
  renderNotes();
}

/* === ЗАКРЫТИЕ МОДАЛКИ === */
function closeModal() { modal.classList.remove('open'); }
modal.onclick = e => { if (e.target === modal) closeModal(); };
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
});

/* === СОХРАНЕНИЕ === */
function saveNote() {
  const subject = inpSubject.value.trim();
  const title = inpTitle.value.trim();
  const content = inpContent.value.trim();
  const dateRaw = inpDate.value || new Date().toISOString().slice(0, 10);
  const dateDisplay = new Date(dateRaw).toLocaleDateString('ru-RU');

  if (!title && !content && !pendingPhoto) return alert('Заполни тему, конспект или добавь фото');

  if (editingId) {
    const n = notes.find(x => x.id === editingId);
    Object.assign(n, { subject, title, content, date: dateDisplay, dateRaw, photo: pendingPhoto });
  } else {
    notes.unshift({
      id: 'n_' + Date.now(),
      subject, title, content,
      date: dateDisplay,
      dateRaw,
      photo: pendingPhoto
    });
  }
  saveNotes();
  closeModal();
  renderFilters();
  renderNotes();
}

/* === ЛАЙТБОКС === */
document.getElementById('lightbox').onclick = () => {
  document.getElementById('lightbox').classList.remove('open');
};

/* ============================================================
   ПОСЕЩАЕМОСТЬ
   ============================================================ */
const AKEY = 'oib_att_v7';
let att = JSON.parse(localStorage.getItem(AKEY) || '{"students":[],"records":{}}');
let currentDate = new Date().toISOString().slice(0, 10);

const listEl = document.getElementById('studentsList');
const statsEl = document.getElementById('stats');
const datePicker = document.getElementById('datePicker');
const newStudentInput = document.getElementById('newStudent');

const STATUSES = [
  { key: 'present', icon: ICON.check, label: 'пришёл' },
  { key: 'excused', icon: ICON.doc,   label: 'уваж.' },
  { key: 'enka',    icon: ICON.x,     label: 'энка' }
];

function saveAtt() { localStorage.setItem(AKEY, JSON.stringify(att)); }
function getDay() {
  if (!att.records[currentDate]) att.records[currentDate] = {};
  return att.records[currentDate];
}

function renderAtt() {
  datePicker.value = currentDate;
  if (!att.students.length) {
    listEl.innerHTML = '<div class="empty"><div class="empty-icon">' + ICON.emptyUsers + '</div>список пуст · добавь людей через поле выше</div>';
  } else {
    const day = getDay();
    listEl.innerHTML = att.students.map((name, i) => {
      const st = day[name] || '';
      const btns = STATUSES.map(s =>
        '<button class="status-btn ' + (st === s.key ? 'active' : '') + '" data-status="' + s.key + '" data-name="' + encodeURIComponent(name) + '">' +
          s.icon + ' ' + s.label +
        '</button>'
      ).join('');
      return '<div class="student-row" style="animation-delay:' + (i*.03) + 's">' +
        '<div class="student-name">' + esc(name) + '</div>' +
        '<div class="status-group">' + btns + '</div>' +
        '<button class="btn-icon del" data-del="' + encodeURIComponent(name) + '">' + ICON.trash + '</button>' +
      '</div>';
    }).join('');

    listEl.querySelectorAll('.status-btn').forEach(btn => {
      btn.onclick = () => {
        const name = decodeURIComponent(btn.dataset.name);
        const status = btn.dataset.status;
        const day = getDay();
        day[name] = day[name] === status ? '' : status;
        saveAtt();
        renderAtt();
      };
    });
    listEl.querySelectorAll('[data-del]').forEach(btn => {
      btn.onclick = () => {
        const name = decodeURIComponent(btn.dataset.del);
        if (!confirm('Удалить «' + name + '»?')) return;
        att.students = att.students.filter(n => n !== name);
        Object.values(att.records).forEach(d => delete d[name]);
        saveAtt();
        renderAtt();
      };
    });
  }
  renderStats();
}

function renderStats() {
  const day = getDay();
  let p = 0, e = 0, en = 0;
  att.students.forEach(n => {
    const s = day[n];
    if (s === 'present') p++;
    else if (s === 'excused') e++;
    else if (s === 'enka') en++;
  });
  const items = [
    { cls: '',       val: att.students.length, lbl: 'всего' },
    { cls: 'green',  val: p, lbl: 'пришли' },
    { cls: 'yellow', val: e, lbl: 'уважительных' },
    { cls: 'red',    val: en, lbl: 'энок' }
  ];
  statsEl.innerHTML = items.map(it =>
    '<div class="stat ' + it.cls + '">' +
      '<div class="num" data-target="' + it.val + '">0</div>' +
      '<div class="lbl">' + it.lbl + '</div>' +
    '</div>'
  ).join('');

  statsEl.querySelectorAll('.num').forEach(el => {
    const target = +el.dataset.target;
    const dur = 450;
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

function addStudent() {
  const name = newStudentInput.value.trim();
  if (!name) return;
  if (att.students.includes(name)) return alert('Такой уже есть');
  att.students.push(name);
  saveAtt();
  newStudentInput.value = '';
  renderAtt();
}

function resetDay() {
  if (!confirm('Очистить отметки за ' + currentDate + '?')) return;
  att.records[currentDate] = {};
  saveAtt();
  renderAtt();
}

datePicker.onchange = e => { currentDate = e.target.value; renderAtt(); };
newStudentInput.addEventListener('keydown', e => { if (e.key === 'Enter') addStudent(); });

/* ============================================================
   СТАРТ
   ============================================================ */
renderFilters();
renderNotes();
renderAtt();

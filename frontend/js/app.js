/**
 * frontend/js/app.js
 *
 * KEY FIX FOR VERCEL:
 * We use a RELATIVE API path ('/tasks') instead of a hardcoded
 * 'http://localhost:3000/tasks'. This means:
 *   - Locally via nodemon  → hits http://localhost:3000/tasks   ✅
 *   - On Vercel            → hits https://your-app.vercel.app/tasks  ✅
 *
 * No environment variables or config files needed.
 */

// ── API base: empty string = same origin (works locally AND on Vercel) ──────
const API = '';   // e.g. fetch(`${API}/tasks`) → /tasks

// ── App State ────────────────────────────────────────────────────────────────
let allTasks       = [];
let activeFilter   = 'all';
let activeSort     = 'newest';
let searchQuery    = '';
let pendingDelId   = null;

// ── DOM References ────────────────────────────────────────────────────────────
const taskGrid     = document.getElementById('task-grid');
const pageTitle    = document.getElementById('page-title');
const pageSub      = document.getElementById('page-sub');
const searchInput  = document.getElementById('search-input');
const searchClear  = document.getElementById('search-clear');
const sortSelect   = document.getElementById('sort-select');
const openModalBtn = document.getElementById('open-modal-btn');
const taskModal    = document.getElementById('task-modal');
const modalHeading = document.getElementById('modal-heading');
const modalSave    = document.getElementById('modal-save');
const modalCancel  = document.getElementById('modal-cancel');
const modalClose   = document.getElementById('modal-close');
const editTaskId   = document.getElementById('edit-task-id');
const taskTitle    = document.getElementById('task-title');
const taskDesc     = document.getElementById('task-description');
const taskPriority = document.getElementById('task-priority');
const taskCompleted= document.getElementById('task-completed');
const titleError   = document.getElementById('title-error');
const deleteModal  = document.getElementById('delete-modal');
const deleteCancel = document.getElementById('delete-cancel');
const deleteConfirm= document.getElementById('delete-confirm');
const apiPill      = document.getElementById('api-pill');
const apiPillText  = document.getElementById('api-pill-text');
const sidebarEl    = document.getElementById('sidebar');
const sidebarToggle= document.getElementById('sidebar-toggle');
const progressFill = document.getElementById('progress-fill');

// ── Fetch Wrapper ─────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res  = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

// ── Load All Tasks ────────────────────────────────────────────────────────────
async function loadTasks() {
  renderSkeletons();
  try {
    const data = await apiFetch('/tasks');
    allTasks = data.tasks;
    setApiStatus(true);
    renderAll();
  } catch (err) {
    setApiStatus(false);
    taskGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-art">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
        </div>
        <div class="empty-title">Cannot reach the API</div>
        <div class="empty-sub">
          Run <code style="color:var(--accent);background:var(--surface-3);padding:2px 7px;border-radius:5px;font-size:0.8rem">npm run dev</code>
          inside the project root, then refresh.
        </div>
      </div>`;
  }
}

// ── Render Everything ─────────────────────────────────────────────────────────
function renderAll() {
  updateStats();
  updateBadges();
  updateProgressBar();

  let tasks = [...allTasks];

  // Apply filter
  if (activeFilter === 'pending')   tasks = tasks.filter(t => !t.completed);
  if (activeFilter === 'completed') tasks = tasks.filter(t =>  t.completed);
  if (activeFilter === 'high')      tasks = tasks.filter(t => t.priority === 'high');
  if (activeFilter === 'medium')    tasks = tasks.filter(t => t.priority === 'medium');
  if (activeFilter === 'low')       tasks = tasks.filter(t => t.priority === 'low');

  // Apply search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    tasks = tasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q))
    );
  }

  // Apply sort
  if (activeSort === 'newest')   tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (activeSort === 'oldest')   tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (activeSort === 'alpha')    tasks.sort((a, b) => a.title.localeCompare(b.title));
  if (activeSort === 'priority') {
    const order = { high: 0, medium: 1, low: 2 };
    tasks.sort((a, b) => order[a.priority] - order[b.priority]);
  }

  // Update header
  const filterLabels = {
    all: 'All Tasks', pending: 'Pending', completed: 'Completed',
    high: 'High Priority', medium: 'Medium Priority', low: 'Low Priority',
  };
  pageTitle.textContent = filterLabels[activeFilter] || 'All Tasks';
  pageSub.textContent   = searchQuery
    ? `${tasks.length} result${tasks.length !== 1 ? 's' : ''} for "${searchQuery}"`
    : `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`;

  // Render cards or empty state
  if (!tasks.length) {
    taskGrid.innerHTML = buildEmptyState();
    return;
  }

  taskGrid.innerHTML = '';
  tasks.forEach((task, i) => {
    const card = buildCard(task);
    card.style.animationDelay = `${i * 0.045}s`;
    taskGrid.appendChild(card);
  });
}

// ── Build Task Card ───────────────────────────────────────────────────────────
function buildCard(task) {
  const card = document.createElement('div');
  card.className = `task-card${task.completed ? ' completed' : ''}`;
  card.dataset.id       = task.id;
  card.dataset.priority = task.priority;

  const date = new Date(task.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const priorityLabels = { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' };

  card.innerHTML = `
    <div class="check-col">
      <input type="checkbox" class="custom-cb" id="cb-${task.id}" ${task.completed ? 'checked' : ''} />
      <label class="cb-label" for="cb-${task.id}">
        <svg class="cb-check" viewBox="0 0 12 10" fill="none" width="12" height="10">
          <path d="M1 5l3 3.5L11 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </label>
    </div>

    <div class="task-body">
      <div class="task-title">${esc(task.title)}</div>
      ${task.description ? `<div class="task-desc">${esc(task.description)}</div>` : ''}
      <div class="task-meta">
        <span class="meta-chip chip-priority-${task.priority}">${priorityLabels[task.priority]}</span>
        <span class="meta-chip ${task.completed ? 'chip-done' : 'chip-pending'}">${task.completed ? '✓ Done' : '⏳ Pending'}</span>
        <span class="meta-date">${date}</span>
        <span class="meta-id">#${task.id}</span>
      </div>
    </div>

    <div class="task-actions">
      <button class="icon-btn edit-btn" title="Edit task" data-id="${task.id}">
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
        </svg>
      </button>
      <button class="icon-btn del-btn" title="Delete task" data-id="${task.id}">
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
      </button>
    </div>
  `;

  // Checkbox → toggle completed
  card.querySelector(`#cb-${task.id}`).addEventListener('change', e => {
    toggleComplete(task.id, e.target.checked);
  });

  // Edit button
  card.querySelector('.edit-btn').addEventListener('click', () => openEditModal(task));

  // Delete button
  card.querySelector('.del-btn').addEventListener('click', () => openDeleteModal(task.id));

  return card;
}

// ── Empty State ───────────────────────────────────────────────────────────────
function buildEmptyState() {
  const isSearch = !!searchQuery;
  return `
    <div class="empty-state">
      <div class="empty-art">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
          ${isSearch
            ? '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>'
            : '<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>'}
        </svg>
      </div>
      <div class="empty-title">${isSearch ? 'No results found' : 'No tasks here'}</div>
      <div class="empty-sub">${isSearch ? `Nothing matches "${searchQuery}". Try a different search.` : 'Add your first task to get started.'}</div>
      ${!isSearch ? `<div class="empty-cta"><button class="btn btn-primary" onclick="openAddModal()">＋ Add Task</button></div>` : ''}
    </div>`;
}

// ── Skeleton Loaders ──────────────────────────────────────────────────────────
function renderSkeletons() {
  taskGrid.innerHTML = Array.from({ length: 5 }, () => `
    <div class="skeleton-card">
      <div class="skel skel-sq"></div>
      <div class="skel-col">
        <div class="skel skel-h skel-w80"></div>
        <div class="skel skel-h skel-w55"></div>
        <div class="skel skel-h skel-w35"></div>
      </div>
    </div>`).join('');
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function updateStats() {
  const total   = allTasks.length;
  const done    = allTasks.filter(t => t.completed).length;
  const pending = total - done;
  const pct     = total ? Math.round((done / total) * 100) : 0;

  document.getElementById('s-total').textContent   = total;
  document.getElementById('s-done').textContent    = done;
  document.getElementById('s-pending').textContent = pending;
  document.getElementById('s-progress').textContent= `${pct}%`;
}

function updateProgressBar() {
  const total = allTasks.length;
  const done  = allTasks.filter(t => t.completed).length;
  progressFill.style.width = total ? `${(done / total) * 100}%` : '0%';
}

function updateBadges() {
  const total   = allTasks.length;
  const done    = allTasks.filter(t => t.completed).length;
  const pending = total - done;
  const high    = allTasks.filter(t => t.priority === 'high').length;
  const medium  = allTasks.filter(t => t.priority === 'medium').length;
  const low     = allTasks.filter(t => t.priority === 'low').length;

  document.getElementById('badge-all').textContent    = total;
  document.getElementById('badge-done').textContent   = done;
  document.getElementById('badge-pending').textContent= pending;
  document.getElementById('badge-high').textContent   = high;
  document.getElementById('badge-medium').textContent = medium;
  document.getElementById('badge-low').textContent    = low;
}

// ── API Status Pill ───────────────────────────────────────────────────────────
function setApiStatus(ok) {
  apiPill.className    = `api-pill ${ok ? 'connected' : 'error'}`;
  apiPillText.textContent = ok
    ? 'API connected'
    : 'API offline · check server';
}

// ── CRUD: Create ──────────────────────────────────────────────────────────────
async function saveTask() {
  const title = taskTitle.value.trim();
  titleError.textContent = '';

  if (!title) {
    titleError.textContent = 'Title is required.';
    taskTitle.classList.add('error');
    taskTitle.focus();
    return;
  }
  taskTitle.classList.remove('error');

  const isEdit = !!editTaskId.value;
  const body = {
    title,
    description: taskDesc.value.trim(),
    priority:    taskPriority.value,
    completed:   taskCompleted.value === 'true',
  };

  modalSave.disabled = true;
  modalSave.textContent = isEdit ? 'Saving…' : 'Adding…';

  try {
    if (isEdit) {
      const updated = await apiFetch(`/tasks/${editTaskId.value}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      const idx = allTasks.findIndex(t => t.id === updated.id);
      if (idx !== -1) allTasks[idx] = updated;
      toast('Task updated ✓', 'success');
    } else {
      const created = await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      allTasks.unshift(created);
      toast('Task created ✓', 'success');
    }
    closeTaskModal();
    renderAll();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    modalSave.disabled = false;
    modalSave.innerHTML = `
      <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
      </svg> Save Task`;
  }
}

// ── CRUD: Toggle Complete ─────────────────────────────────────────────────────
async function toggleComplete(id, completed) {
  try {
    const updated = await apiFetch(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ completed }),
    });
    const idx = allTasks.findIndex(t => t.id === id);
    if (idx !== -1) allTasks[idx] = updated;
    renderAll();
    toast(completed ? 'Marked as done ✓' : 'Marked as pending', 'info');
  } catch (err) {
    toast(err.message, 'error');
    renderAll(); // revert
  }
}

// ── CRUD: Delete ──────────────────────────────────────────────────────────────
async function confirmDelete() {
  if (!pendingDelId) return;
  try {
    await apiFetch(`/tasks/${pendingDelId}`, { method: 'DELETE' });
    allTasks = allTasks.filter(t => t.id !== pendingDelId);
    renderAll();
    toast('Task deleted', 'info');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    pendingDelId = null;
    deleteModal.classList.remove('open');
  }
}

// ── Modal Helpers ─────────────────────────────────────────────────────────────
function openAddModal() {
  editTaskId.value        = '';
  taskTitle.value         = '';
  taskDesc.value          = '';
  taskPriority.value      = 'medium';
  taskCompleted.value     = 'false';
  titleError.textContent  = '';
  taskTitle.classList.remove('error');
  modalHeading.textContent = 'New Task';
  taskModal.classList.add('open');
  setTimeout(() => taskTitle.focus(), 120);
}

function openEditModal(task) {
  editTaskId.value        = task.id;
  taskTitle.value         = task.title;
  taskDesc.value          = task.description || '';
  taskPriority.value      = task.priority || 'medium';
  taskCompleted.value     = String(task.completed);
  titleError.textContent  = '';
  taskTitle.classList.remove('error');
  modalHeading.textContent = 'Edit Task';
  taskModal.classList.add('open');
  setTimeout(() => taskTitle.focus(), 120);
}

function closeTaskModal() {
  taskModal.classList.remove('open');
}

function openDeleteModal(id) {
  pendingDelId = id;
  deleteModal.classList.add('open');
}

// ── Toast Notifications ───────────────────────────────────────────────────────
function toast(message, type = 'info') {
  const icons = {
    success: '✓',
    error:   '✕',
    info:    'ℹ',
  };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `
    <div class="toast-icon">${icons[type] || 'ℹ'}</div>
    <span>${message}</span>`;
  document.getElementById('toast-container').appendChild(el);

  setTimeout(() => {
    el.classList.add('hiding');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, 3200);
}

// ── Event Listeners ───────────────────────────────────────────────────────────

// Add task button
openModalBtn.addEventListener('click', openAddModal);

// Modal save / cancel / close
modalSave.addEventListener('click', saveTask);
modalCancel.addEventListener('click', closeTaskModal);
modalClose.addEventListener('click', closeTaskModal);

// Delete modal
deleteConfirm.addEventListener('click', confirmDelete);
deleteCancel.addEventListener('click', () => {
  deleteModal.classList.remove('open');
  pendingDelId = null;
});

// Close modals on overlay click
[taskModal, deleteModal].forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) {
      modal.classList.remove('open');
      pendingDelId = null;
    }
  });
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    taskModal.classList.remove('open');
    deleteModal.classList.remove('open');
  }
  // Ctrl/Cmd + K → focus search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    searchInput.focus();
  }
});

// Enter key submits modal
taskTitle.addEventListener('keydown', e => {
  if (e.key === 'Enter') saveTask();
});

// Nav filter buttons
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderAll();
    // Close sidebar on mobile after selection
    if (window.innerWidth < 768) sidebarEl.classList.remove('open');
  });
});

// Sort select
sortSelect.addEventListener('change', e => {
  activeSort = e.target.value;
  renderAll();
});

// Search
searchInput.addEventListener('input', e => {
  searchQuery = e.target.value.trim();
  searchClear.classList.toggle('visible', !!searchQuery);
  renderAll();
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  searchClear.classList.remove('visible');
  searchInput.focus();
  renderAll();
});

// Mobile sidebar toggle
sidebarToggle.addEventListener('click', () => sidebarEl.classList.toggle('open'));

// Close sidebar on outside click (mobile)
document.addEventListener('click', e => {
  if (window.innerWidth < 768 &&
      sidebarEl.classList.contains('open') &&
      !sidebarEl.contains(e.target) &&
      !sidebarToggle.contains(e.target)) {
    sidebarEl.classList.remove('open');
  }
});

// ── Utility ───────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Boot ──────────────────────────────────────────────────────────────────────
loadTasks();

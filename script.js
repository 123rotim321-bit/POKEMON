const API_ROOT = 'https://api.pokemontcg.io/v2/cards';
const pageSize = 20; // exactly 20 cards per page
let currentPage = 1;
let currentQuery = '';
let lastTotal = 0;
let isLoadingAll = false;

const form = document.getElementById('search-form');
const input = document.getElementById('search-input');
const statusEl = document.getElementById('status');
const countEl = document.getElementById('count');
const cardGrid = document.getElementById('card-grid');
const prevBtn = document.getElementById('prev-page');
const nextBtn = document.getElementById('next-page');
const loadMoreBtn = document.getElementById('load-more');
const load200Btn = document.getElementById('load-200');
const loadAllBtn = document.getElementById('load-all');
const pageIndicator = document.getElementById('page-indicator');
const resetBtn = document.getElementById('reset-btn');

const modal = document.getElementById('card-modal');
const modalImage = document.getElementById('modal-image');
const modalTitle = document.getElementById('modal-title');
const modalClose = document.getElementById('modal-close');

function setStatus(text) {
  statusEl.textContent = text;
}

function setPageIndicator() {
  pageIndicator.textContent = `Page ${currentPage}`;
}

function openCardModal(imageSrc, name) {
  modalImage.src = imageSrc;
  modalImage.alt = `${name} full card image`;
  modalTitle.textContent = name;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
}

function closeCardModal() {
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  modalImage.src = '';
  modalTitle.textContent = '';
}

function makeCardNode(card) {
  const wrapper = document.createElement('article');
  wrapper.className = 'card-item';
  const thumb = card.images.small || '';
  const full = card.images.large || thumb;
  wrapper.innerHTML = `
    <img src="${thumb}" data-full="${full}" alt="${card.name} card image" loading="lazy" />
    <div class="card-meta">
      <h2>${card.name}</h2>
      <div><strong>Set:</strong> ${card.set?.name || 'Unknown'}</div>
      <div><strong>Type:</strong> ${card.supertype || 'N/A'} ${card.subtypes ? '(' + card.subtypes.join(', ') + ')' : ''}</div>
      <div><strong>Rarity:</strong> ${card.rarity || 'Unknown'}</div>
    </div>`;
  return wrapper;
}

async function fetchCards({ query = '', page = 1, append = false } = {}) {
  const params = new URLSearchParams();
  params.set('page', page.toString());
  params.set('pageSize', pageSize.toString());
  if (query) {
    const escaped = query.replace(/"/g, '');
    params.set('q', `name:"*${escaped}*"`);
  }

  const url = `${API_ROOT}?${params.toString()}`;
  setStatus('Loading cards...');

  try {
    const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!response.ok) {
      throw new Error(`API status ${response.status}`);
    }
    const data = await response.json();
    lastTotal = data.totalCount || data.total || data.count || 0;

    if (!append) {
      cardGrid.innerHTML = '';
    }

    if (!data.data || !data.data.length) {
      if (!append) {
        setStatus('No cards found. Try a different search term.');
      } else {
        setStatus('No more cards available.');
      }
      countEl.textContent = '';
      prevBtn.disabled = page <= 1;
      nextBtn.disabled = true;
      loadMoreBtn.disabled = true;
      return;
    }

    data.data.forEach(card => cardGrid.appendChild(makeCardNode(card)));

    const shown = (page - 1) * pageSize + data.data.length;
    countEl.textContent = `Displaying ${shown} of ${lastTotal} cards`;
    setStatus('Done. Scroll for cards.');

    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page * pageSize >= lastTotal;
    loadMoreBtn.disabled = page * pageSize >= lastTotal;
    setPageIndicator();
  } catch (err) {
    console.error(err);
    setStatus('Fetch error: ' + err.message);
    countEl.textContent = '';
    if (!append) cardGrid.innerHTML = '';
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    loadMoreBtn.disabled = true;
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  currentQuery = input.value.trim();
  currentPage = 1;
  fetchCards({ query: currentQuery, page: currentPage });
});

resetBtn.addEventListener('click', () => {
  input.value = '';
  currentQuery = '';
  currentPage = 1;
  fetchCards({ query: '', page: currentPage });
});

prevBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage -= 1;
    fetchCards({ query: currentQuery, page: currentPage });
  }
});

nextBtn.addEventListener('click', () => {
  if (currentPage * pageSize < lastTotal) {
    currentPage += 1;
    fetchCards({ query: currentQuery, page: currentPage });
  }
});

loadMoreBtn.addEventListener('click', () => {
  if (currentPage * pageSize < lastTotal) {
    currentPage += 1;
    fetchCards({ query: currentQuery, page: currentPage, append: true });
  } else {
    setStatus('No more cards to load.');
    loadMoreBtn.disabled = true;
  }
});

load200Btn.addEventListener('click', async () => {
  if (!lastTotal) {
    setStatus('Please wait for initial cards to load first.');
    return;
  }

  const totalPages = Math.ceil(lastTotal / pageSize);
  if (currentPage >= totalPages) {
    setStatus('No more cards to load.');
    return;
  }

  load200Btn.disabled = true;
  loadMoreBtn.disabled = true;
  loadAllBtn.disabled = true;
  setStatus('Loading 200 cards (10 pages), please wait...');

  try {
    const targetPage = Math.min(currentPage + 10, totalPages);
    for (let next = currentPage + 1; next <= targetPage; next += 1) {
      await fetchCards({ query: currentQuery, page: next, append: true });
      currentPage = next;
    }
    setStatus(`Loaded up to page ${currentPage} (${currentPage * pageSize} cards).`);
  } catch (error) {
    console.error(error);
    setStatus('Load 200 failed: ' + error.message);
  } finally {
    load200Btn.disabled = false;
    loadMoreBtn.disabled = currentPage * pageSize >= lastTotal;
    loadAllBtn.disabled = false;
  }
});

loadAllBtn.addEventListener('click', async () => {
  if (isLoadingAll) return;
  if (!lastTotal) {
    setStatus('Please wait for initial cards to load first.');
    return;
  }

  const totalPages = Math.ceil(lastTotal / pageSize);
  if (currentPage >= totalPages) {
    setStatus('All cards already loaded.');
    return;
  }

  // extra guard for load more path:
  if (currentPage * pageSize < lastTotal) {
    loadMoreBtn.disabled = false;
  }

  isLoadingAll = true;
  loadAllBtn.disabled = true;
  loadMoreBtn.disabled = true;
  load200Btn.disabled = true;
  setStatus('Loading all cards, please wait...');

  try {
    for (let next = currentPage + 1; next <= totalPages; next += 1) {
      await fetchCards({ query: currentQuery, page: next, append: true });
      currentPage = next;
    }
    setStatus(`Loaded ${Math.min(totalPages * pageSize, lastTotal)} cards.`);
  } catch (error) {
    console.error(error);
    setStatus('Load all failed: ' + error.message);
  } finally {
    isLoadingAll = false;
    loadAllBtn.disabled = false;
    load200Btn.disabled = false;
    loadMoreBtn.disabled = currentPage * pageSize >= lastTotal;
  }
});

cardGrid.addEventListener('click', (event) => {
  const img = event.target.closest('img');
  if (!img) return;
  const fullSrc = img.dataset.full;
  if (!fullSrc) return;
  const cardName = img.alt.replace(' card image', '');
  openCardModal(fullSrc, cardName);
});

modalClose.addEventListener('click', closeCardModal);
modal.addEventListener('click', (event) => {
  if (event.target.classList.contains('card-modal-backdrop')) {
    closeCardModal();
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeCardModal();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  fetchCards({ query: '', page: 1 });
});

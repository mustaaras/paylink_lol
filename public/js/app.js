// PayLink (paylink.lol) - Core Frontend Engine

let currentCategory = 'all';
let currentSearchQuery = '';
let allListings = [];
let activeOutbidId = null;
let fetchedImageUrl = null;
let currentCelebratedListing = null;

// Custom Brand SVG Category Icons (29 Full Categories)
const categorySvgIcons = {
  all: `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="4.5" height="4.5" rx="1.2"/><rect x="9.5" y="2" width="4.5" height="4.5" rx="1.2"/><rect x="2" y="9.5" width="4.5" height="4.5" rx="1.2"/><rect x="9.5" y="9.5" width="4.5" height="4.5" rx="1.2"/></svg>`,
  'ai-agents': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="10" height="8" rx="2"/><circle cx="6" cy="9" r="1" fill="currentColor"/><circle cx="10" cy="9" r="1" fill="currentColor"/><path d="M8 2V5M6 2H10"/></svg>`,
  'seo-ai': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="5"/><path d="M11 11L14.5 14.5M5 7L6.5 8.5L9.5 5.5"/></svg>`,
  'marketing': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L4 6V10L12 14V2Z"/><path d="M4 8H2V11H4M14 6V10"/></svg>`,
  'crypto-web3': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M6 5H9.5C10.5 5 11 5.8 11 6.5C11 7.2 10.5 8 9.5 8H6M6 8H10C11 8 11.5 8.8 11.5 9.5C11.5 10.2 11 11 10 11H6M6 4V12"/></svg>`,
  'devtools': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 4.5L2 8L5.5 11.5M10.5 4.5L14 8L10.5 11.5M9 3L7 13"/></svg>`,
  'business-finance': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2V14M4 5L8 3L12 5M2 9L4 5L6 9H2ZM10 9L12 5L14 9H10Z"/></svg>`,
  'security-privacy': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.5L2.5 4V8C2.5 11.5 5 14 8 15C11 14 13.5 11.5 13.5 8V4L8 1.5Z"/><path d="M5.5 8L7 9.5L10.5 6"/></svg>`,
  'health-wellness': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7.5C2 4.5 4.5 2.5 7 4.5C9.5 2.5 12 4.5 12 7.5C12 11 7 14 7 14C7 14 2 11 2 7.5Z"/><path d="M1 8H4L5.5 5.5L7.5 10.5L9 8H13"/></svg>`,
  'social-creator': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="4" cy="8" r="2"/><circle cx="12" cy="4" r="2"/><circle cx="12" cy="12" r="2"/><path d="M5.8 7.1L10.2 4.9M5.8 8.9L10.2 11.1"/></svg>`,
  'leaderboards': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2H12V7C12 9.2 10.2 11 8 11C5.8 11 4 9.2 4 7V2ZM4 4H2C2 5.5 3 6.5 4 6.8M12 4H14C14 5.5 13 6.5 12 6.8M8 11V14M5 14H11"/></svg>`,
  'hiring-jobs': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="12" height="9" rx="2"/><path d="M5 5V3C5 2.4 5.4 2 6 2H10C10.6 2 11 2.4 11 3V5M2 8H14"/></svg>`,
  'education': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2L1 5.5L8 9L15 5.5L8 2ZM3.5 7.5V11.5C3.5 11.5 5.5 13.5 8 13.5C10.5 13.5 12.5 11.5 12.5 11.5V7.5M14 6V11"/></svg>`,
  'agencies-services': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 8L5 4L9 7L13 3M11 8L15 12M5 12L9 8"/></svg>`,
  'ecommerce': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1H3L5 10H13L15 4H4M5 13.5C5 14.3 4.3 15 3.5 15C2.7 15 2 14.3 2 13.5M12.5 13.5C12.5 14.3 11.8 15 11 15C10.2 15 9.5 14.3 9.5 13.5"/></svg>`,
  'domains-assets': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M2 8H14M8 2C9.5 4 10.5 6 10.5 8C10.5 10 9.5 12 8 14C6.5 12 5.5 10 5.5 8C5.5 6 6.5 4 8 2Z"/></svg>`,
  'games-entertainment': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="12" height="8" rx="3"/><path d="M4.5 8H7.5M6 6.5V9.5M10.5 7H11.5M9.5 9H10.5"/></svg>`,
  'people-profiles': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="5" r="3"/><path d="M3 14C3 11.2 5.2 9 8 9C10.8 9 13 11.2 13 14"/></svg>`,
  'productivity': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="5" height="12" rx="1.5"/><rect x="9" y="2" width="5" height="7" rx="1.5"/><rect x="9" y="11" width="5" height="3" rx="1"/></svg>`,
  'design-creative': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.5C4.4 1.5 1.5 4.4 1.5 8C1.5 11.6 4.4 14.5 8 14.5C9.5 14.5 10.5 13.5 10.5 12.2C10.5 11.5 10.2 11 9.8 10.5C9.4 10 9.2 9.5 9.2 9C9.2 8 10 7.2 11 7.2H12.5C13.6 7.2 14.5 6.3 14.5 5.2C14.5 3.2 11.6 1.5 8 1.5Z"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="7" cy="4.5" r="1" fill="currentColor"/><circle cx="10" cy="5.5" r="1" fill="currentColor"/></svg>`,
  'writing-content': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11.5 2.5L13.5 4.5L5 13H3V11L11.5 2.5Z"/></svg>`,
  'directories-launch': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M10.5 5.5L7 7L5.5 10.5L9 9L10.5 5.5Z"/></svg>`,
  'ai-media': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1L9.5 5.5L14 7L9.5 8.5L8 13L6.5 8.5L2 7L6.5 5.5L8 1Z"/><path d="M12.5 11.5L13.5 13.5L15.5 14L13.5 14.5L12.5 16.5L11.5 14.5L9.5 14L11.5 13.5L12.5 11.5Z"/></svg>`,
  'audio-voice': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="2" width="5" height="8" rx="2.5"/><path d="M3 7V8C3 10.8 5.2 13 8 13C10.8 13 13 10.8 13 8V7M8 13V15M5.5 15H10.5"/></svg>`,
  'sales-leads': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="3.5"/><circle cx="8" cy="8" r="1" fill="currentColor"/></svg>`,
  'travel-lifestyle': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6C3.5 9.5 8 14.5 8 14.5C8 14.5 12.5 9.5 12.5 6C12.5 3.5 10.5 1.5 8 1.5Z"/><circle cx="8" cy="6" r="2"/></svg>`,
  'real-estate': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.5L8 2L14 6.5V14H10V9H6V14H2V6.5Z"/></svg>`,
  'media-news': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="12" height="12" rx="1.5"/><path d="M5 5H11M5 8H11M5 11H8"/></svg>`,
  'other': `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="5" height="5" rx="1"/><circle cx="12" cy="4.5" r="2.5"/><polygon points="8,9.5 11,14.5 5,14.5"/></svg>`,
  // Legacy mappings
  saas: `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 1.5L2.5 9H8L7.5 14.5L13.5 7H8L8.5 1.5Z"/></svg>`,
  domain: `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M2 8H14"/><path d="M8 2C9.5 4 10.5 6 10.5 8C10.5 10 9.5 12 8 14C6.5 12 5.5 10 5.5 8C5.5 6 6.5 4 8 2Z"/></svg>`,
  digital: `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.5L14 4.5V11.5L8 14.5L2 11.5V4.5L8 1.5Z"/><path d="M8 1.5V14.5"/><path d="M14 4.5L8 8L2 4.5"/></svg>`,
  service: `<svg class="cat-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2L14 6L6 14H2V10L10 2Z"/><path d="M9 3L13 7"/><path d="M2 14L4.5 11.5"/></svg>`
};

const categoryNames = {
  all: 'All Categories',
  'ai-agents': 'AI Agents & Infrastructure',
  'seo-ai': 'SEO & AI Visibility',
  'marketing': 'Marketing & Advertising',
  'crypto-web3': 'Crypto, Web3 & Investing',
  'devtools': 'Developer Tools',
  'business-finance': 'Business, Finance & Legal',
  'security-privacy': 'Security, Privacy & Compliance',
  'health-wellness': 'Health, Fitness & Wellness',
  'social-creator': 'Social Media & Creator Tools',
  'leaderboards': 'Leaderboards & Attention Markets',
  'hiring-jobs': 'Hiring, Jobs & Careers',
  'education': 'Education & Learning',
  'agencies-services': 'Agencies, Studios & Services',
  'ecommerce': 'Ecommerce & Retail',
  'domains-assets': 'Domains & Web Assets',
  'games-entertainment': 'Games & Entertainment',
  'people-profiles': 'People & Profiles',
  'productivity': 'Productivity & Personal Tools',
  'design-creative': 'Design & Creative',
  'writing-content': 'Writing & Content',
  'directories-launch': 'Directories, Launch & Discovery',
  'ai-media': 'AI Media Generation',
  'audio-voice': 'Audio, Voice & Podcasting',
  'sales-leads': 'Sales & Lead Generation',
  'travel-lifestyle': 'Travel, Local & Lifestyle',
  'real-estate': 'Real Estate & Property',
  'media-news': 'Media & News',
  'other': 'Other',
  // Legacy aliases
  saas: 'SaaS & AI',
  domain: 'Domains & Web Assets',
  digital: 'Digital Products',
  service: 'Agencies & Services'
};

function getCategoryBadge(cat) {
  const icon = categorySvgIcons[cat] || categorySvgIcons.other;
  const name = categoryNames[cat] || cat;
  return `<span class="cat-tag">${icon} ${name}</span>`;
}

function formatCurrency(amount) {
  const val = Number(amount) || 0;
  return `$${val.toLocaleString('en-US', {
    minimumFractionDigits: val % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  })}`;
}

function getDomainFromUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url.startsWith('http') ? url : 'https://' + url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0];
  }
}

// Vibrant monogram background gradients for cards without logos
const monogramGradients = [
  'linear-gradient(135deg, #6366f1, #4338ca)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ec4899, #db2777)',
  'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  'linear-gradient(135deg, #06b6d4, #0891b2)'
];

function getMonogram(title) {
  if (!title) return 'PL';
  const words = title.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return title.substring(0, 2).toUpperCase();
}

function getGradientForString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % monogramGradients.length;
  return monogramGradients[index];
}

let turnstileToken = null;
let turnstileWidgetId = null;

async function initTurnstile() {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    const siteKey = config.turnstileSiteKey || '1x00000000000000000000AA';

    function renderTurnstile() {
      if (typeof turnstile !== 'undefined' && document.getElementById('cf-turnstile-box')) {
        try {
          turnstileWidgetId = turnstile.render('#cf-turnstile-box', {
            sitekey: siteKey,
            size: 'invisible',
            callback: function(token) {
              turnstileToken = token;
            },
            'expired-callback': function() {
              turnstileToken = null;
              if (typeof turnstile !== 'undefined' && turnstileWidgetId !== null) {
                turnstile.reset(turnstileWidgetId);
              }
            }
          });
        } catch (e) {
          console.warn('Turnstile render error:', e);
        }
      } else {
        setTimeout(renderTurnstile, 250);
      }
    }

    renderTurnstile();
  } catch (err) {
    console.warn('Could not init Turnstile config:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initEventListeners();
  initQuickSubmit();
  initQueryParams();
  connectLiveFeed();
  loadLeaderboard();
  initTurnstile();
});

/**
 * Theme Switcher (Light / Dark)
 */
function initTheme() {
  const savedTheme = localStorage.getItem('paylink_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('paylink_theme', next);
      updateThemeIcon(next);
    });
  }
}

function updateThemeIcon(theme) {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-label', theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode');
    toggleBtn.title = theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode';
  }
}

/**
 * 1-Link Zero Friction Inline Submit & Auto-Fetch
 */
function initQuickSubmit() {
  const urlInput = document.getElementById('quick-url-input');
  const fetchBtn = document.getElementById('quick-fetch-btn');
  const previewPanel = document.getElementById('quick-preview-panel');
  const titleInput = document.getElementById('quick-title-input');
  const taglineInput = document.getElementById('quick-tagline-input');
  const previewImg = document.getElementById('preview-img');
  const categorySelect = document.getElementById('quick-category-select');
  const bidInput = document.getElementById('quick-bid-input');
  const presetBtns = document.querySelectorAll('.quick-preset-btn');
  const form = document.getElementById('quick-submit-form');
  const submitBtn = document.getElementById('quick-submit-action-btn');

  const defaultIcon = document.getElementById('quick-default-icon');
  const faviconImg = document.getElementById('quick-url-favicon');

  function updateInputIcon(rawVal) {
    if (!rawVal || !rawVal.trim()) {
      if (defaultIcon) defaultIcon.style.display = 'block';
      if (faviconImg) {
        faviconImg.style.display = 'none';
        faviconImg.src = '';
      }
      return;
    }

    const domain = getDomainFromUrl(rawVal.trim());
    if (domain && domain.includes('.') && domain.length >= 4) {
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
      if (faviconImg) {
        faviconImg.src = faviconUrl;
        faviconImg.onload = () => {
          if (defaultIcon) defaultIcon.style.display = 'none';
          faviconImg.style.display = 'block';
        };
        faviconImg.onerror = () => {
          if (defaultIcon) defaultIcon.style.display = 'block';
          faviconImg.style.display = 'none';
        };
      }
    } else {
      if (defaultIcon) defaultIcon.style.display = 'block';
      if (faviconImg) {
        faviconImg.style.display = 'none';
        faviconImg.src = '';
      }
    }
  }

  // Live auto-icon display on typing or pasting
  urlInput.addEventListener('input', () => {
    updateInputIcon(urlInput.value);
  });

  // Auto-fetch on button click
  fetchBtn.addEventListener('click', () => {
    handleUrlFetch(urlInput.value.trim());
  });

  // Auto-fetch when pressing Enter in URL input
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleUrlFetch(urlInput.value.trim());
    }
  });

  // Auto-icon and fetch on paste
  urlInput.addEventListener('paste', (e) => {
    setTimeout(() => {
      const pasted = urlInput.value.trim();
      updateInputIcon(pasted);
      if (pasted && (pasted.startsWith('http://') || pasted.startsWith('https://') || pasted.includes('.'))) {
        handleUrlFetch(pasted);
      }
    }, 50);
  });

  async function handleUrlFetch(url) {
    if (!url) {
      alert('Please paste a link first');
      urlInput.focus();
      return;
    }

    // Auto prepend https:// if protocol is missing
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
      urlInput.value = targetUrl;
    }

    const spinner = document.getElementById('fetch-btn-spinner');
    const btnText = document.getElementById('fetch-btn-text');

    if (spinner) spinner.style.display = 'inline-block';
    if (btnText) btnText.innerText = 'Fetching Info...';
    fetchBtn.disabled = true;

    try {
      const res = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch link metadata');
      }

      // Populate preview panel
      if (titleInput) titleInput.value = data.title || '';
      if (taglineInput) taglineInput.value = data.description || '';
      
      fetchedImageUrl = data.imageUrl || data.faviconUrl || null;
      if (previewImg && (data.imageUrl || data.faviconUrl)) {
        previewImg.src = data.imageUrl || data.faviconUrl;
      }

      // Auto-detect category heuristics
      const lowerUrl = url.toLowerCase();
      if (lowerUrl.endsWith('.com') || lowerUrl.endsWith('.io') || lowerUrl.endsWith('.ai') || lowerUrl.endsWith('.lol')) {
        if (lowerUrl.includes('dan.com') || lowerUrl.includes('reginsta') || lowerUrl.includes('sedo') || lowerUrl.includes('afternic')) {
          if (categorySelect) categorySelect.value = 'domain';
        } else if (lowerUrl.includes('gumroad') || lowerUrl.includes('lemonsqueezy') || lowerUrl.includes('notion')) {
          if (categorySelect) categorySelect.value = 'digital';
        } else if (lowerUrl.includes('cal.com') || lowerUrl.includes('fiverr') || lowerUrl.includes('agency')) {
          if (categorySelect) categorySelect.value = 'service';
        } else {
          if (categorySelect) categorySelect.value = 'saas';
        }
      }

      // Reveal preview panel
      const submitBox = document.getElementById('quick-submit-section');
      if (submitBox) submitBox.classList.add('expanded');
      if (previewPanel) {
        previewPanel.style.display = 'block';
        previewPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      updatePayButtonText();
    } catch (err) {
      console.warn('Metadata fetch fallback:', err);
      // Even if scrape fails, open the panel with domain as title
      try {
        const parsed = new URL(url.startsWith('http') ? url : 'https://' + url);
        if (titleInput) titleInput.value = parsed.hostname.replace('www.', '');
        if (taglineInput) taglineInput.value = 'Direct link to ' + parsed.hostname;
        if (previewImg) previewImg.src = `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=128`;
        const submitBox = document.getElementById('quick-submit-section');
        if (submitBox) submitBox.classList.add('expanded');
        if (previewPanel) previewPanel.style.display = 'block';
      } catch {
        alert('Please enter a valid link (e.g. https://yourstartup.com)');
      }
    } finally {
      if (spinner) spinner.style.display = 'none';
      if (btnText) btnText.innerText = 'Rank Link ↗';
      fetchBtn.disabled = false;
    }
  }

  // Quick Preset Bid Buttons
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const val = btn.dataset.val;
      if (val && bidInput) {
        bidInput.value = val;
        updatePayButtonText();
      }
    });
  });

  if (bidInput) {
    bidInput.addEventListener('input', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      updatePayButtonText();
    });
  }

  function updatePayButtonText() {
    if (submitBtn && bidInput) {
      const bid = parseFloat(bidInput.value) || 0;
      if (bid <= 0) {
        submitBtn.innerHTML = `Post Free Link ↗`;
      } else {
        submitBtn.innerHTML = `⚡ Pay ${formatCurrency(bid)} & Rank ↗`;
      }
    }
  }

  // Form submission directly triggers checkout or instant free publish
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const url = urlInput.value.trim();
      const title = titleInput.value.trim();
      const tagline = taglineInput.value.trim();
      const category = categorySelect.value;
      const price_tag = document.getElementById('quick-price-input')?.value.trim();
      const bid_amount = parseFloat(bidInput.value) || 0;
      const email = document.getElementById('quick-email-input')?.value.trim();

      if (!url || !title || !tagline || isNaN(bid_amount) || bid_amount < 0) {
        alert('Please provide a title, description, and link');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerText = bid_amount <= 0 ? 'Publishing Free Link...' : 'Creating Checkout Session...';

      try {
        const payload = {
          title,
          tagline,
          buy_url: url.startsWith('http') ? url : 'https://' + url,
          image_url: fetchedImageUrl || undefined,
          price_tag: price_tag || undefined,
          category,
          bid_amount,
          bidder_email: email || undefined,
          turnstile_token: turnstileToken || undefined
        };

        const res = await fetch('/api/listings/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to submit link');
        }

        if (data.free && data.listing) {
          showToast(`🎉 Free link "${escapeHtml(data.listing.title)}" published successfully!`, 'success');
          // Reset form
          urlInput.value = '';
          updateInputIcon('');
          titleInput.value = '';
          taglineInput.value = '';
          bidInput.value = '0';
          presetBtns.forEach(b => b.classList.remove('active'));
          const zeroBtn = Array.from(presetBtns).find(b => b.dataset.val === '0');
          if (zeroBtn) zeroBtn.classList.add('active');
          if (previewPanel) previewPanel.style.display = 'none';
          const submitBox = document.getElementById('quick-submit-section');
          if (submitBox) submitBox.classList.remove('expanded');

          openCelebrateModal(data.listing, 0);
          return;
        }

        // Direct redirect to checkout
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        }
      } catch (err) {
        alert(err.message || 'An error occurred during submission.');
      } finally {
        submitBtn.disabled = false;
        updatePayButtonText();
      }
    });
  }
}

/**
 * Connect to SSE Real-Time Live Feed
 */
function connectLiveFeed() {
  const eventSource = new EventSource('/api/live-feed');

  eventSource.addEventListener('connected', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.listings) {
        allListings = data.listings;
        renderLeaderboard();
      }
      if (data.stats) {
        updateStats(data.stats);
      }
      if (data.recentOutbids && data.recentOutbids.length > 0) {
        updateTicker(data.recentOutbids[0]);
      }
    } catch (err) {
      console.error('Error parsing SSE connected payload:', err);
    }
  });

  eventSource.addEventListener('leaderboard_update', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.listings) {
        allListings = data.listings;
        renderLeaderboard();
      }
      if (data.stats) {
        updateStats(data.stats);
      }
      if (data.notification) {
        showToast(data.notification.message, data.notification.type === 'outbid' ? 'toast-outbid' : 'toast-success');
        updateTickerFromNotification(data.notification);
        if (isActivityDrawerOpen()) {
          loadActivityStream();
        }
      }
    } catch (err) {
      console.error('Error processing SSE update:', err);
    }
  });

  eventSource.addEventListener('click_update', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.stats) {
        updateStats(data.stats);
      }
      const countEl = document.getElementById(`clicks-${data.listing_id}`);
      if (countEl) {
        const numEl = countEl.querySelector('.clicks-num');
        if (numEl) {
          const currentClicks = parseInt(numEl.innerText.replace(/[^0-9]/g, '')) || 0;
          numEl.innerText = currentClicks + 1;
        }
      }
    } catch (err) {
      console.error('Error processing click update:', err);
    }
  });

  eventSource.addEventListener('visitors_update', (e) => {
    try {
      const data = JSON.parse(e.data);
      updateActiveVisitors(data.active_visitors);
    } catch (err) {
      console.error('Error processing visitors update:', err);
    }
  });

  eventSource.onerror = () => {
    console.warn('Live feed disconnected. Retrying in 5s...');
  };
}

/**
 * Fetch and render initial leaderboard
 */
async function loadLeaderboard() {
  try {
    const res = await fetch('/api/listings');
    allListings = await res.json();
    renderLeaderboard();

    const statsRes = await fetch('/api/stats');
    const stats = await statsRes.json();
    updateStats(stats);
  } catch (err) {
    console.error('Failed to load listings:', err);
  }
}

/**
 * Render leaderboard list with category and search filtering (Matches reference design)
 */
function renderLeaderboard() {
  const container = document.getElementById('leaderboard-list');
  if (!container) return;

  const query = currentSearchQuery.trim().toLowerCase();

  const filtered = allListings.filter(item => {
    const matchCategory = currentCategory === 'all' || item.category === currentCategory;
    if (!matchCategory) return false;

    if (!query) return true;
    return (
      (item.title && item.title.toLowerCase().includes(query)) ||
      (item.tagline && item.tagline.toLowerCase().includes(query)) ||
      (item.category && item.category.toLowerCase().includes(query)) ||
      (item.buy_url && item.buy_url.toLowerCase().includes(query))
    );
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 48px 20px; background: var(--bg-card); border: 1px dashed var(--border-subtle); border-radius: var(--radius-lg); color: var(--text-muted);">
        <p style="font-size: 15px; font-weight: 500;">No paylinks matching "${escapeHtml(query || currentCategory)}".</p>
        <button class="btn btn-primary btn-sm" style="margin-top: 14px;" onclick="focusQuickSubmit('${escapeJs(currentCategory)}')">
          Be the #1 in ${escapeHtml(currentCategory)} (Free or Boost)
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const catBadgeHtml = getCategoryBadge(item.category);
    const domainName = getDomainFromUrl(item.buy_url);
    const minToClaim = Math.max(1, Math.floor(Number(item.bid_amount || 0)) + 1);

    // Squircle Thumbnail / Monogram Icon
    let thumbHtml = '';
    if (item.image_url) {
      thumbHtml = `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" class="item-thumb" onerror="this.parentElement.innerHTML='<div class=\\'item-monogram\\' style=\\'background: ${getGradientForString(item.title)}\\'>${getMonogram(item.title)}</div>'" />`;
    } else {
      const gradient = getGradientForString(item.title);
      thumbHtml = `<div class="item-monogram" style="background: ${gradient}">${getMonogram(item.title)}</div>`;
    }

    return `
      <div class="item-row" id="listing-${item.id}">
        <div class="item-row-left">
          <span class="rank-num">#${item.rank}</span>
          <div class="item-thumb-wrapper">
            ${thumbHtml}
          </div>
        </div>

        <div class="item-row-content">
          <div class="item-header-row">
            <div class="item-title-wrapper">
              <a href="/go/${item.id}" target="_blank" rel="noopener" class="item-title">
                ${escapeHtml(item.title)}
              </a>
              <!-- Action Pill: claim this rank for $X -->
              <button type="button" class="claim-rank-pill" onclick="openClaimRankModal(${item.rank}, ${item.bid_amount}, '${item.id}')">
                claim this rank for ${formatCurrency(minToClaim)}
              </button>
            </div>
            <div class="item-price-col">
              <span class="item-price-val">${formatCurrency(item.bid_amount)}</span>
            </div>
          </div>

          <p class="item-description">${escapeHtml(item.tagline || '')}</p>

          <div class="item-meta-row">
            <span class="meta-item meta-time">${formatTimeAgo(item.created_at)}</span>
            <a href="/go/${item.id}" target="_blank" rel="noopener" class="meta-item meta-domain">
              ${escapeHtml(domainName)}
            </a>
            <span class="meta-item meta-category">${catBadgeHtml}</span>
            <span class="meta-item meta-clicks" id="clicks-${item.id}">
              <span class="clicks-dot">●</span> <strong>${Number(item.clicks_count || 0).toLocaleString()}</strong> clicks
            </span>
            <button type="button" class="meta-item meta-details-link" onclick="openDetailsModal('${item.id}')">
              see details
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.focusQuickSubmit = function(cat, e) {
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
  }
  const urlInput = document.getElementById('quick-url-input');
  const catSelect = document.getElementById('quick-category-select');
  if (catSelect && cat && cat !== 'all') {
    catSelect.value = cat;
  }
  if (urlInput) {
    urlInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      urlInput.focus();
      urlInput.select();
    }, 200);
  }
};

/**
 * Update stats numbers
 */
function updateStats(stats) {
  const volEl = document.getElementById('stat-volume');
  const countEl = document.getElementById('stat-listings');
  const clicksEl = document.getElementById('stat-clicks');
  const topBidEl = document.getElementById('stat-top-bid');
  const cardVisitors = document.getElementById('stat-visitors-card');
  const heroTotal = document.getElementById('hero-total-visitors');

  if (volEl && stats.total_volume_usd !== undefined) volEl.innerText = formatCurrency(stats.total_volume_usd);
  if (countEl && stats.total_listings !== undefined) countEl.innerText = stats.total_listings;
  if (clicksEl && stats.total_clicks !== undefined) clicksEl.innerText = Number(stats.total_clicks).toLocaleString();
  if (topBidEl && stats.top_bid !== undefined) topBidEl.innerText = formatCurrency(stats.top_bid);
  if (cardVisitors && stats.total_visitors !== undefined) cardVisitors.innerText = Number(stats.total_visitors).toLocaleString();
  if (heroTotal && stats.total_visitors !== undefined) heroTotal.innerText = Number(stats.total_visitors).toLocaleString();

  if (stats.active_visitors !== undefined) {
    updateActiveVisitors(stats.active_visitors);
  }
}

function updateActiveVisitors(count) {
  const tickerVisitors = document.getElementById('stat-active-visitors');
  const heroActive = document.getElementById('hero-active-visitors');
  const formatted = Math.max(1, count || 1);

  if (tickerVisitors) tickerVisitors.innerText = formatted;
  if (heroActive) heroActive.innerText = formatted;
}

/**
 * Update top ticker text
 */
function updateTicker(bidData) {
  const tickerEl = document.getElementById('ticker-message');
  if (tickerEl && bidData) {
    tickerEl.innerHTML = `<svg class="badge-icon" style="color: var(--accent-primary);" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 1.5L2.5 9H8L7.5 14.5L13.5 7H8L8.5 1.5Z"/></svg> <strong>${escapeHtml(bidData.title)}</strong> boosted by <strong>+${formatCurrency(bidData.amount)}</strong> for Rank #${bidData.rank}!`;
  }
}

function updateTickerFromNotification(notif) {
  const tickerEl = document.getElementById('ticker-message');
  if (tickerEl && notif) {
    tickerEl.innerHTML = escapeHtml(notif.message);
  }
}

/**
 * Event listeners setup
 */
function initEventListeners() {
  // Category tabs (2-line smooth horizontal scroller)
  const tabs = document.querySelectorAll('.tab-btn');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCategory = tab.dataset.category || 'all';
      renderLeaderboard();
    });
  });

  // Search Input
  const searchInput = document.getElementById('leaderboard-search');
  const clearBtn = document.getElementById('search-clear-btn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value;
      if (clearBtn) clearBtn.style.display = currentSearchQuery ? 'block' : 'none';
      renderLeaderboard();
    });
  }

  if (clearBtn && searchInput) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      currentSearchQuery = '';
      clearBtn.style.display = 'none';
      renderLeaderboard();
      searchInput.focus();
    });
  }

  // Outbid Preset buttons
  const presetBtns = document.querySelectorAll('#outbid-modal .preset-btn');
  const outbidAmountInput = document.getElementById('outbid-amount');

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const val = btn.dataset.val;
      if (val && outbidAmountInput) {
        outbidAmountInput.value = val;
      }
    });
  });

  if (outbidAmountInput) {
    outbidAmountInput.addEventListener('input', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
    });
  }

  // Outbid form submit
  const outbidForm = document.getElementById('outbid-form');
  if (outbidForm) {
    outbidForm.addEventListener('submit', handleOutbidSubmit);
  }

  // Claim Rank Presets & Actions
  const claimPresetMin = document.getElementById('claim-preset-min');
  const claimPreset5 = document.getElementById('claim-preset-plus5');
  const claimPreset10 = document.getElementById('claim-preset-plus10');
  const claimPreset25 = document.getElementById('claim-preset-plus25');
  const claimBidInput = document.getElementById('claim-bid-input');
  const claimSubmitBtnText = document.getElementById('claim-submit-btn-text');

  function updateClaimSubmitText() {
    if (!claimBidInput || !claimSubmitBtnText) return;
    const val = parseFloat(claimBidInput.value) || 0;
    claimSubmitBtnText.innerText = `Pay & Claim Rank #${activeClaimRank} (${formatCurrency(val)})`;
  }

  if (claimPresetMin && claimBidInput) {
    claimPresetMin.addEventListener('click', () => {
      const min = Math.max(1, Math.floor(activeClaimBaseBid) + 1);
      claimBidInput.value = min;
      document.querySelectorAll('#claim-rank-modal .preset-btn').forEach(b => b.classList.remove('active'));
      claimPresetMin.classList.add('active');
      updateClaimSubmitText();
    });
  }

  if (claimPreset5 && claimBidInput) {
    claimPreset5.addEventListener('click', () => {
      const min = Math.max(1, Math.floor(activeClaimBaseBid) + 1);
      claimBidInput.value = min + 5;
      document.querySelectorAll('#claim-rank-modal .preset-btn').forEach(b => b.classList.remove('active'));
      claimPreset5.classList.add('active');
      updateClaimSubmitText();
    });
  }

  if (claimPreset10 && claimBidInput) {
    claimPreset10.addEventListener('click', () => {
      const min = Math.max(1, Math.floor(activeClaimBaseBid) + 1);
      claimBidInput.value = min + 10;
      document.querySelectorAll('#claim-rank-modal .preset-btn').forEach(b => b.classList.remove('active'));
      claimPreset10.classList.add('active');
      updateClaimSubmitText();
    });
  }

  if (claimPreset25 && claimBidInput) {
    claimPreset25.addEventListener('click', () => {
      const min = Math.max(1, Math.floor(activeClaimBaseBid) + 1);
      claimBidInput.value = min + 25;
      document.querySelectorAll('#claim-rank-modal .preset-btn').forEach(b => b.classList.remove('active'));
      claimPreset25.classList.add('active');
      updateClaimSubmitText();
    });
  }

  if (claimBidInput) {
    claimBidInput.addEventListener('input', () => {
      document.querySelectorAll('#claim-rank-modal .preset-btn').forEach(b => b.classList.remove('active'));
      updateClaimSubmitText();
    });
  }

  // Claim Modal Auto-Fetch
  const claimFetchBtn = document.getElementById('claim-fetch-btn');
  const claimUrlInput = document.getElementById('claim-url-input');
  const claimTitleInput = document.getElementById('claim-title-input');
  const claimTaglineInput = document.getElementById('claim-tagline-input');

  if (claimFetchBtn && claimUrlInput) {
    claimFetchBtn.addEventListener('click', async () => {
      const rawUrl = claimUrlInput.value.trim();
      if (!rawUrl) {
        alert('Please enter a URL first');
        claimUrlInput.focus();
        return;
      }
      const targetUrl = (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) ? 'https://' + rawUrl : rawUrl;
      claimUrlInput.value = targetUrl;
      claimFetchBtn.disabled = true;
      claimFetchBtn.innerText = 'Fetching...';

      try {
        const res = await fetch(`/api/metadata?url=${encodeURIComponent(targetUrl)}`);
        const data = await res.json();
        if (data.title && claimTitleInput) claimTitleInput.value = data.title;
        if (data.description && claimTaglineInput) claimTaglineInput.value = data.description;
      } catch (err) {
        console.warn('Metadata fetch error:', err);
      } finally {
        claimFetchBtn.disabled = false;
        claimFetchBtn.innerText = 'Auto-Fetch';
      }
    });
  }

  // Claim Modal Submit
  const claimForm = document.getElementById('claim-rank-form');
  if (claimForm) {
    claimForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('claim-submit-btn');
      const url = document.getElementById('claim-url-input')?.value.trim();
      const title = document.getElementById('claim-title-input')?.value.trim();
      const tagline = document.getElementById('claim-tagline-input')?.value.trim();
      const category = document.getElementById('claim-category-select')?.value;
      const priceTag = document.getElementById('claim-price-input')?.value.trim();
      const bidAmount = parseFloat(document.getElementById('claim-bid-input')?.value) || 0;
      const email = document.getElementById('claim-email-input')?.value.trim();

      if (!url || !title || !tagline || !category) {
        alert('Please fill out all required fields.');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Preparing Checkout...';
      }

      try {
        const res = await fetch('/api/listings/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            tagline,
            buy_url: url.startsWith('http') ? url : 'https://' + url,
            category,
            price_tag: priceTag || undefined,
            bid_amount: bidAmount,
            bidder_email: email || undefined,
            turnstile_token: turnstileToken || undefined
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create checkout session');

        if (data.free) {
          closeClaimRankModal();
          showToast('Link listed successfully!');
          loadLeaderboard();
        } else if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        }
      } catch (err) {
        alert(err.message || 'Error processing rank claim checkout');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = `Pay & Claim Rank (${formatCurrency(bidAmount)})`;
        }
      }
    });
  }
}

let activeClaimRank = 1;
let activeClaimBaseBid = 0;
let activeClaimListingId = null;

/**
 * Details Modal
 */
window.openDetailsModal = function(id) {
  const item = allListings.find(l => l.id === id);
  if (!item) return;

  const modal = document.getElementById('details-modal');
  const titleEl = document.getElementById('details-title');
  const domainEl = document.getElementById('details-domain');
  const thumbContainer = document.getElementById('details-thumb-container');
  const rankBadge = document.getElementById('details-rank-badge');
  const fullTitle = document.getElementById('details-full-title');
  const catBadge = document.getElementById('details-category-badge');
  const descEl = document.getElementById('details-description');
  const statRank = document.getElementById('details-stat-rank');
  const statBid = document.getElementById('details-stat-bid');
  const statClicks = document.getElementById('details-stat-clicks');
  const statDate = document.getElementById('details-stat-date');
  const claimBtn = document.getElementById('details-claim-btn');
  const claimBtnText = document.getElementById('details-claim-btn-text');
  const visitBtn = document.getElementById('details-visit-btn');

  const domainName = getDomainFromUrl(item.buy_url);
  const minToClaim = Math.max(1, Math.floor(Number(item.bid_amount || 0)) + 1);

  if (titleEl) titleEl.innerText = 'Listing Details';
  if (domainEl) domainEl.innerText = domainName || 'paylink.lol';
  if (rankBadge) rankBadge.innerText = `#${item.rank}`;
  if (fullTitle) fullTitle.innerText = item.title;
  if (catBadge) catBadge.innerHTML = getCategoryBadge(item.category);
  if (descEl) descEl.innerText = item.tagline || 'No additional description provided.';

  if (thumbContainer) {
    if (item.image_url) {
      thumbContainer.innerHTML = `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" class="details-thumb-img" onerror="this.parentElement.innerHTML='<div class=\\'item-monogram\\' style=\\'background: ${getGradientForString(item.title)}\\'>${getMonogram(item.title)}</div>'" />`;
    } else {
      thumbContainer.innerHTML = `<div class="item-monogram" style="background: ${getGradientForString(item.title)}">${getMonogram(item.title)}</div>`;
    }
  }

  if (statRank) statRank.innerText = `#${item.rank}`;
  if (statBid) statBid.innerText = formatCurrency(item.bid_amount);
  if (statClicks) statClicks.innerText = Number(item.clicks_count || 0).toLocaleString();
  if (statDate) statDate.innerText = formatTimeAgo(item.created_at);

  if (claimBtn) {
    if (claimBtnText) claimBtnText.innerText = `Claim Rank #${item.rank} for ${formatCurrency(minToClaim)}`;
    claimBtn.onclick = () => {
      closeDetailsModal();
      openClaimRankModal(item.rank, item.bid_amount, item.id);
    };
  }

  if (visitBtn) {
    visitBtn.href = `/go/${item.id}`;
  }

  if (modal) modal.classList.add('open');
};

window.closeDetailsModal = function() {
  const modal = document.getElementById('details-modal');
  if (modal) modal.classList.remove('open');
};

/**
 * Claim Rank Modal
 */
window.openClaimRankModal = function(rank, currentBid, listingId) {
  activeClaimRank = rank;
  activeClaimBaseBid = Number(currentBid) || 0;
  activeClaimListingId = listingId;

  const modal = document.getElementById('claim-rank-modal');
  const targetPill = document.getElementById('claim-target-pill');
  const modalTitle = document.getElementById('claim-modal-title');
  const modalSubtitle = document.getElementById('claim-modal-subtitle');
  const bidInput = document.getElementById('claim-bid-input');
  const minPresetBtn = document.getElementById('claim-preset-min');
  const submitBtnText = document.getElementById('claim-submit-btn-text');

  const minBidToClaim = Math.max(1, Math.floor(activeClaimBaseBid) + 1);

  if (targetPill) targetPill.innerText = `Target: Rank #${rank}`;
  if (modalTitle) modalTitle.innerText = `Claim Rank #${rank}`;
  if (modalSubtitle) modalSubtitle.innerText = `Current rank holder bid is ${formatCurrency(activeClaimBaseBid)}. Bid at least ${formatCurrency(minBidToClaim)} to take this position.`;
  
  if (bidInput) {
    bidInput.min = minBidToClaim;
    bidInput.value = minBidToClaim;
  }
  if (minPresetBtn) {
    minPresetBtn.innerText = `Min: ${formatCurrency(minBidToClaim)}`;
    document.querySelectorAll('#claim-rank-modal .preset-btn').forEach(b => b.classList.remove('active'));
    minPresetBtn.classList.add('active');
  }
  if (submitBtnText) {
    submitBtnText.innerText = `Pay & Claim Rank #${rank} (${formatCurrency(minBidToClaim)})`;
  }

  if (modal) modal.classList.add('open');
};

window.closeClaimRankModal = function() {
  const modal = document.getElementById('claim-rank-modal');
  if (modal) modal.classList.remove('open');
};

/**
 * Open Outbid Modal
 */
window.openOutbidModal = function(id, title, rank, bidAmount) {
  activeOutbidId = id;
  const modal = document.getElementById('outbid-modal');
  const modalTitle = document.getElementById('outbid-target-title');
  const modalRank = document.getElementById('outbid-target-rank');
  const modalTotal = document.getElementById('outbid-target-total');

  if (modalTitle) modalTitle.innerText = title;
  if (modalRank) modalRank.innerText = `#${rank}`;
  if (modalTotal) modalTotal.innerText = formatCurrency(bidAmount);

  if (modal) modal.classList.add('open');
};

window.closeOutbidModal = function() {
  const modal = document.getElementById('outbid-modal');
  if (modal) modal.classList.remove('open');
  activeOutbidId = null;
};

/**
 * Submit Outbid action
 */
async function handleOutbidSubmit(e) {
  e.preventDefault();
  if (!activeOutbidId) return;

  const amountInput = document.getElementById('outbid-amount');
  const emailInput = document.getElementById('outbid-email');
  const submitBtn = document.getElementById('outbid-submit-btn');

  const amount = parseFloat(amountInput.value);
  if (!amount || amount < 1) {
    alert('Please enter an outbid amount of at least $1');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = 'Creating Outbid Session...';
  }

  try {
    const res = await fetch(`/api/listings/${activeOutbidId}/outbid-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        bidder_email: emailInput ? emailInput.value : undefined,
        turnstile_token: turnstileToken || undefined
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to initialize checkout');
    }

    window.location.href = data.checkoutUrl;
  } catch (err) {
    alert(err.message || 'Error processing outbid checkout');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Boost & Outbid Rank ↗';
    }
  }
}

/**
 * Celebration Modal with Confetti & Share on X
 */
window.openCelebrateModal = function(listing, amount = 0) {
  currentCelebratedListing = listing;
  const modal = document.getElementById('celebrate-modal');
  const badgeEl = document.getElementById('celebrate-rank-badge');
  const titleEl = document.getElementById('celebrate-title');
  const subEl = document.getElementById('celebrate-subtitle');
  const itemTitleEl = document.getElementById('celebrate-item-title');
  const itemTaglineEl = document.getElementById('celebrate-item-tagline');
  const shareBtn = document.getElementById('celebrate-share-x-btn');

  if (badgeEl) badgeEl.innerText = `🏆 Rank #${listing.rank}`;
  if (titleEl) titleEl.innerText = amount > 0 ? `Rank #${listing.rank} Secured!` : `Link Published Live!`;
  if (subEl) subEl.innerText = amount > 0 ? `Boost of +${formatCurrency(amount)} applied successfully.` : `Your free link is active on the paylink.lol attention leaderboard.`;
  if (itemTitleEl) itemTitleEl.innerText = listing.title;
  if (itemTaglineEl) itemTaglineEl.innerText = listing.tagline || '';

  if (shareBtn) {
    const text = `🚀 Just listed "${listing.title}" on https://paylink.lol at Rank #${listing.rank}!\n\nCan you outbid me?`;
    shareBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  }

  if (modal) modal.classList.add('open');
  runConfetti();
};

window.closeCelebrateModal = function() {
  const modal = document.getElementById('celebrate-modal');
  if (modal) modal.classList.remove('open');
};

/**
 * Confetti Canvas Particle System
 */
function runConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.parentElement.offsetWidth || 400;
  canvas.height = canvas.parentElement.offsetHeight || 400;

  const colors = ['#10B981', '#059669', '#F59E0B', '#6366F1', '#EC4899', '#3B82F6'];
  const particles = Array.from({ length: 45 }, () => ({
    x: canvas.width / 2,
    y: canvas.height / 2,
    vx: (Math.random() - 0.5) * 8,
    vy: (Math.random() - 0.8) * 9,
    size: Math.random() * 6 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    tilt: Math.random() * 10,
    opacity: 1
  }));

  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2; // gravity
      p.opacity -= 0.012;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillRect(p.x, p.y, p.size, p.size * 0.7);
    });

    frame++;
    if (frame < 80) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  animate();
}

/**
 * Activity Stream Drawer
 */
window.openActivityDrawer = async function() {
  const overlay = document.getElementById('activity-drawer-overlay');
  const drawer = document.getElementById('activity-drawer');

  if (overlay) overlay.classList.add('open');
  if (drawer) drawer.classList.add('open');

  await loadActivityStream();
};

window.closeActivityDrawer = function() {
  const overlay = document.getElementById('activity-drawer-overlay');
  const drawer = document.getElementById('activity-drawer');

  if (overlay) overlay.classList.remove('open');
  if (drawer) drawer.classList.remove('open');
};

function isActivityDrawerOpen() {
  const drawer = document.getElementById('activity-drawer');
  return drawer && drawer.classList.contains('open');
}

async function loadActivityStream() {
  const container = document.getElementById('activity-feed-list');
  if (!container) return;

  try {
    const res = await fetch('/api/activity');
    const items = await res.json();

    if (!items || items.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">No battle activity recorded yet.</div>`;
      return;
    }

    container.innerHTML = items.map(act => {
      const timeAgo = formatTimeAgo(act.created_at);
      const isFree = Number(act.amount) === 0;

      return `
        <div class="activity-card">
          <div class="activity-header">
            <span class="activity-title">${escapeHtml(act.title)}</span>
            <span class="activity-time">${timeAgo}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
            <span style="font-weight: 750; color: ${isFree ? 'var(--text-muted)' : 'var(--accent-primary)'}; font-size: 12.5px;">
              ${isFree ? '🆓 Free Listing Posted' : `⚡ Boosted +${formatCurrency(act.amount)}`}
            </span>
            <span class="rank-tag-above" style="font-size: 10.5px;">Rank #${act.rank}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load activity stream:', err);
    container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">Failed to load activity.</div>`;
  }
}

function parseUTCDate(dateStr) {
  if (!dateStr) return new Date();
  if (typeof dateStr === 'string') {
    const trimmed = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/.test(trimmed)) {
      return new Date(trimmed.replace(' ', 'T') + 'Z');
    }
    if (!trimmed.includes('Z') && !trimmed.includes('+')) {
      return new Date(trimmed + 'Z');
    }
    return new Date(trimmed);
  }
  return new Date(dateStr);
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'just now';
  const past = parseUTCDate(dateStr).getTime();
  const diffSec = Math.floor((Date.now() - past) / 1000);
  if (isNaN(diffSec) || diffSec < 60) return 'just now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/**
 * Toast Notification System
 */
function showToast(message, type = 'toast-success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

/**
 * Handle URL Query params (success messages)
 */
function initQueryParams() {
  const params = new URLSearchParams(window.location.search);

  if (params.get('success') === 'true') {
    const title = params.get('title') || 'Your PayLink';
    const rank = parseInt(params.get('rank')) || 1;
    const amount = parseFloat(params.get('amount')) || 1;
    openCelebrateModal({ title, rank, id: params.get('id') || 'list' }, amount);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (params.get('outbid_success') === 'true') {
    const title = params.get('title') || 'PayLink';
    const rank = parseInt(params.get('rank')) || 1;
    const amount = parseFloat(params.get('amount')) || 1;
    openCelebrateModal({ title, rank, id: params.get('id') || 'list' }, amount);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (params.get('error')) {
    alert(`Notice: ${params.get('error')}`);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (window.location.hash === '#quick-submit-section') {
    setTimeout(() => {
      window.focusQuickSubmit();
    }, 250);
  }
}

// Helpers
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeJs(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

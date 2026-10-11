(() => {
  const HIDDEN = 'x-clean-view-hidden';
  const defaults = {
    sidebar: false, leftSidebar: false, floatingGrok: false, floatingChat: false,
    centerFeed: true, widerFeed: true, twitterLogo: false,
    home: true, explore: true, notifications: true, follow: true, chat: true,
    calls: true, grok: true, premium: true, history: true, profile: true,
    more: true, post: true, account: true
  };
  let settings = { ...defaults };
  let lastOffset = 0;
  let lastFeed = null;
  const DEFAULT_FEED_WIDTH = 600;
  const widenedNodes = new Set();

  const style = document.createElement('style');
  style.textContent = `
    .${HIDDEN},
    html.x-clean-view-hide-right [data-testid="sidebarColumn"],
    html.x-clean-view-hide-right [aria-label="Trending"] { display: none !important; }
    html.x-clean-view-twitter-logo h1 a[href="/home"] { position: relative; }
    html.x-clean-view-twitter-logo h1 a[href="/home"] svg { visibility: hidden !important; }
    .x-clean-view-twitter-bird { display: none; }
    html.x-clean-view-twitter-logo .x-clean-view-twitter-bird {
      display: block;
      position: absolute;
      width: 32px;
      height: 32px;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      object-fit: contain;
      pointer-events: none;
    }
  `;
  (document.head || document.documentElement).appendChild(style);

  const navPaths = {
    '/home': 'home', '/explore': 'explore', '/notifications': 'notifications',
    '/i/connect_people': 'follow', '/i/chat': 'chat', '/messages': 'chat',
    '/i/calls': 'calls', '/i/grok': 'grok', '/i/premium': 'premium', '/i/history': 'history'
  };

  function toggle(element, visible) {
    if (element) element.classList.toggle(HIDDEN, !visible);
  }

  function clearWidenedNodes() {
    for (const node of widenedNodes) {
      node.style.removeProperty('width');
      node.style.removeProperty('min-width');
      node.style.removeProperty('max-width');
      node.style.removeProperty('flex-basis');
      node.style.removeProperty('margin-left');
      node.style.removeProperty('margin-right');
    }
    widenedNodes.clear();
  }

  function widenTimeline(feed) {
    // X centers a second, narrower wrapper around the posts. Expand the
    // timeline and its post wrappers so the visible content grows too.
    const roots = feed.querySelectorAll('[aria-label^="Timeline:"], [data-testid="tweet"]');
    for (const root of roots) {
      for (let node = root; node && node !== feed; node = node.parentElement) {
        if (widenedNodes.has(node)) continue;
        node.style.setProperty('width', '100%', 'important');
        node.style.setProperty('max-width', 'none', 'important');
        node.style.setProperty('margin-left', '0', 'important');
        node.style.setProperty('margin-right', '0', 'important');
        widenedNodes.add(node);
      }
    }
  }

  function applySettings() {
    document.documentElement.classList.toggle('x-clean-view-hide-right', !settings.sidebar);
    document.documentElement.classList.toggle('x-clean-view-twitter-logo', settings.twitterLogo);
    for (const logoLink of document.querySelectorAll('h1 a[href="/home"]')) {
      if (!logoLink.querySelector('.x-clean-view-twitter-bird')) {
        const bird = document.createElement('img');
        bird.className = 'x-clean-view-twitter-bird';
        bird.alt = '';
        bird.src = chrome.runtime.getURL('twitter-logo.svg');
        logoLink.append(bird);
      }
    }
    for (const sidebar of document.querySelectorAll('[data-testid="sidebarColumn"], aside[aria-label="Trending"]')) {
      toggle(sidebar, settings.sidebar);
    }
    for (const button of document.querySelectorAll('button[aria-label="Grok"], button[aria-label="Chat"]')) {
      toggle(button, settings[button.getAttribute('aria-label') === 'Grok' ? 'floatingGrok' : 'floatingChat']);
    }

    const wideMode = settings.widerFeed && window.innerWidth >= 900;
    const showLeftSidebar = settings.leftSidebar && !wideMode;
    const nav = document.querySelector('nav[aria-label="Primary"]');
    const leftSidebar = nav?.closest('header[role="banner"], header');
    toggle(leftSidebar, showLeftSidebar);
    if (nav) {
      for (const link of nav.querySelectorAll('a[href]')) {
        let path;
        try { path = new URL(link.href).pathname; } catch { continue; }
        const label = (link.getAttribute('aria-label') || link.textContent || '').trim().toLowerCase();
        const key = navPaths[path] || (label === 'profile' ? 'profile' : null);
        if (key) toggle(link, settings[key]);
      }
      toggle(nav.querySelector('[data-testid="AppTabBar_More_Menu"], button[aria-label="More menu items"]'), settings.more);
    }

    for (const post of document.querySelectorAll('a[href="/compose/post"]')) {
      if (!post.closest('article')) toggle(post, settings.post);
    }
    toggle(document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]'), settings.account);

    const feed = document.querySelector('[data-testid="primaryColumn"]');
    if (!feed) return;
    if (feed !== lastFeed) {
      clearWidenedNodes();
      lastFeed = feed;
      lastOffset = 0;
    }

    if (wideMode) {
      // Set the visible border box explicitly; X's column has internal
      // sizing rules that make a plain width declaration expand too far.
      const width = DEFAULT_FEED_WIDTH * 1.5;
      feed.style.setProperty('box-sizing', 'border-box', 'important');
      feed.style.setProperty('width', `${width}px`, 'important');
      feed.style.setProperty('min-width', `${width}px`, 'important');
      feed.style.setProperty('max-width', `${width}px`, 'important');
      feed.style.setProperty('flex-basis', `${width}px`, 'important');
      widenTimeline(feed);
    } else {
      clearWidenedNodes();
      for (const property of ['box-sizing', 'width', 'min-width', 'max-width', 'flex-basis']) feed.style.removeProperty(property);
    }

    if (settings.sidebar || !settings.centerFeed || window.innerWidth < 900) {
      feed.style.removeProperty('translate');
      lastOffset = 0;
      return;
    }

    // Center against the full viewport. If the left sidebar is visible,
    // keep enough clearance that it cannot cover the feed.
    const navBox = nav?.getBoundingClientRect();
    const feedBox = feed.getBoundingClientRect();
    const navRight = showLeftSidebar && navBox?.width ? navBox.right : 0;
    const desiredLeft = Math.max((document.documentElement.clientWidth - feedBox.width) / 2, navRight + (navRight ? 12 : 0));
    const naturalLeft = feedBox.left - lastOffset;
    lastOffset = Math.round(desiredLeft - naturalLeft);
    feed.style.translate = `${lastOffset}px 0`;
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applySettings();
    });
  }

  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', schedule);
  chrome.storage.local.get(defaults, value => {
    settings = value;
    schedule();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    for (const [key, change] of Object.entries(changes)) settings[key] = change.newValue;
    schedule();
  });
  schedule();
})();

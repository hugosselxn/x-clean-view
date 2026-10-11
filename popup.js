const sections = [
  ['Layout', [['sidebar', 'Right sidebar', false], ['leftSidebar', 'Left sidebar', false], ['centerFeed', 'Center main view', true], ['widerFeed', 'Widen main view by 50%', true], ['twitterLogo', 'Switch to Twitter logo', false], ['floatingGrok', 'Floating Grok button', false], ['floatingChat', 'Floating Chat button', false]]],
  ['Left navigation', [['home', 'Home', true], ['explore', 'Explore', true], ['notifications', 'Notifications', true], ['follow', 'Follow', true], ['chat', 'Chat', true], ['calls', 'Calls', true], ['grok', 'Grok', true], ['premium', 'Premium', true], ['history', 'History', true], ['profile', 'Profile', true], ['more', 'More', true], ['post', 'Post button', true], ['account', 'Account menu', true]]]
];
const defaults = Object.fromEntries(sections.flatMap(([, items]) => items.map(([key, , value]) => [key, value])));

chrome.storage.local.get(defaults, values => {
  const root = document.getElementById('settings');
  for (const [heading, items] of sections) {
    const section = document.createElement('section');
    section.className = 'section';
    const title = document.createElement('h2');
    title.textContent = heading;
    section.append(title);
    for (const [key, text] of items) {
      const label = document.createElement('label');
      const name = document.createElement('span');
      name.textContent = text;
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = values[key];
      checkbox.addEventListener('change', () => chrome.storage.local.set({ [key]: checkbox.checked }));
      label.append(name, checkbox);
      section.append(label);
    }
    if (heading === 'Layout') {
      const note = document.createElement('p');
      note.className = 'layout-note';
      note.textContent = 'Wide mode hides the left sidebar to keep the main view centered.';
      section.append(note);
    }
    root.append(section);
  }
});

// Toggle on extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  await toggleTab(tab.id);
});

// Context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'pac-toggle',
    title: 'Toggle Point & Claude',
    contexts: ['all']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'pac-toggle') {
    await toggleTab(tab.id);
  }
});

// Listen for deactivation from content script (Escape key)
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === 'deactivated' && sender.tab) {
    updateBadge(sender.tab.id, false);
  }
});

// Clear badge when tab navigates or reloads (content script resets to inactive)
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    updateBadge(tabId, false);
  }
});

async function toggleTab(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { action: 'toggle' });
    updateBadge(tabId, response.active);
  } catch {
    // Content script not loaded — inject it, then toggle
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ['content.css']
      });
      const response = await chrome.tabs.sendMessage(tabId, { action: 'toggle' });
      updateBadge(tabId, response.active);
    } catch (e) {
      console.warn('Point & Claude: Cannot activate on this page.', e.message);
    }
  }
}

function updateBadge(tabId, isActive) {
  chrome.action.setBadgeText({ text: isActive ? 'ON' : '', tabId }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ color: '#333333', tabId }).catch(() => {});
}

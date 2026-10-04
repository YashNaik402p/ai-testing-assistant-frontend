/**
 * AI Testing Assistant - Chat with AI Controller
 */

let currentProjectId = null;

document.addEventListener('DOMContentLoaded', async () => {
  Auth.requireAuth();

  const urlParams = new URLSearchParams(window.location.search);
  currentProjectId = urlParams.get('projectId');

  if (!currentProjectId) {
    UI.showToast('No project selected. Redirecting to dashboard...', 'error');
    setTimeout(() => window.location.href = 'dashboard.html', 1000);
    return;
  }

  // Setup Back button
  document.getElementById('chat-back-btn').href = `files.html?projectId=${currentProjectId}`;

  try {
    const project = await API.getProject(currentProjectId);
    if (project) {
      document.getElementById('chat-project-name').textContent = `${project.project_name} Assistant`;
    }
  } catch (err) {
    console.warn('Could not fetch project details:', err);
  }

  await loadChatHistory();
  setupChatForm();
});

/**
 * Fetch and render conversation history
 */
async function loadChatHistory() {
  const container = document.getElementById('chat-messages-container');

  try {
    const history = await API.getChatHistory(currentProjectId);
    container.innerHTML = '';

    if (!history || history.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="margin: auto;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <h3>How can I help with this project?</h3>
          <p>Ask about edge cases, unit test frameworks (pytest, jest, junit), security vulnerabilities, or refactoring.</p>
        </div>
      `;
      return;
    }

    history.forEach(item => {
      appendUserBubble(item.message, item.timestamp);
      if (item.ai_response) {
        appendAssistantBubble(item.ai_response, item.timestamp);
      }
    });

    scrollToBottom();
  } catch (err) {
    console.error('Error loading chat history:', err);
    container.innerHTML = `
      <div style="text-align: center; color: var(--status-danger); padding: 2rem;">
        Failed to load conversation history: ${UI.escapeHtml(err.message)}
      </div>
    `;
  }
}

/**
 * Setup message input and submission
 */
function setupChatForm() {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-message-input');
  const sendBtn = document.getElementById('chat-send-btn');
  const container = document.getElementById('chat-messages-container');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    // Clear empty state if present
    const emptyState = container.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    // 1. Immediately render User message
    appendUserBubble(message, new Date().toISOString());
    input.value = '';
    input.focus();
    sendBtn.disabled = true;

    // 2. Show Typing Indicator
    const typingRow = showTypingIndicator();
    scrollToBottom();

    try {
      // 3. Send message to backend
      const res = await API.sendChatMessage(currentProjectId, message);
      typingRow.remove();

      if (res && res.ai_response) {
        appendAssistantBubble(res.ai_response, res.timestamp || new Date().toISOString());
      }
    } catch (err) {
      typingRow.remove();
      appendAssistantBubble(`⚠️ Error: ${err.message || 'Could not communicate with AI backend.'}`, new Date().toISOString());
    } finally {
      sendBtn.disabled = false;
      scrollToBottom();
    }
  });
}

function appendUserBubble(message, timestamp) {
  const container = document.getElementById('chat-messages-container');
  const row = document.createElement('div');
  row.className = 'message-row user-message';
  row.innerHTML = `
    <div class="msg-avatar">You</div>
    <div>
      <div class="msg-bubble">${UI.escapeHtml(message)}</div>
      <div class="msg-time">${UI.formatDate(timestamp)}</div>
    </div>
  `;
  container.appendChild(row);
}

function appendAssistantBubble(response, timestamp) {
  const container = document.getElementById('chat-messages-container');
  const row = document.createElement('div');
  row.className = 'message-row assistant-message';

  // Use the universal Markdown renderer
  const formattedHtml = UI.renderMarkdown(response);

  row.innerHTML = `
    <div class="msg-avatar">AI</div>
    <div>
      <div class="msg-bubble">${formattedHtml}</div>
      <div class="msg-time">${UI.formatDate(timestamp)}</div>
    </div>
  `;
  container.appendChild(row);
}

function showTypingIndicator() {
  const container = document.getElementById('chat-messages-container');
  const row = document.createElement('div');
  row.className = 'message-row assistant-message';
  row.innerHTML = `
    <div class="msg-avatar">AI</div>
    <div class="msg-bubble typing-bubble">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  container.appendChild(row);
  return row;
}

function scrollToBottom() {
  const container = document.getElementById('chat-messages-container');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

/**
 * Format markdown and code blocks in AI chat
 */
function formatMarkdownResponse(text) {
  if (!text) return '';
  const lines = text.split('\n');
  let output = '';
  let inCode = false;
  let codeContent = '';

  for (let line of lines) {
    if (line.startsWith('```')) {
      if (!inCode) {
        inCode = true;
        codeContent = '';
      } else {
        inCode = false;
        output += `<pre style="background: rgba(0,0,0,0.3); padding: 0.75rem; border-radius: 6px; font-family: monospace; font-size: 0.85rem; overflow-x: auto; margin: 0.5rem 0;"><code>${UI.escapeHtml(codeContent)}</code></pre>`;
      }
      continue;
    }

    if (inCode) {
      codeContent += line + '\n';
      continue;
    }

    if (line.trim() === '') {
      output += '<br>';
    } else {
      // Basic bold inline formatting
      let formattedLine = UI.escapeHtml(line)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code style="background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px; font-family: monospace;">$1</code>');
      output += `<p style="margin-bottom: 0.25rem;">${formattedLine}</p>`;
    }
  }

  return output;
}

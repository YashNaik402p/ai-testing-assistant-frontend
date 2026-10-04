/**
 * AI Testing Assistant - Centralized API Service
 */

const API = {
  /**
   * Get current stored auth token
   */
  getToken() {
    return localStorage.getItem(CONFIG.TOKEN_KEY);
  },

  /**
   * Save auth token
   */
  setToken(token) {
    localStorage.setItem(CONFIG.TOKEN_KEY, token);
  },

  /**
   * Clear auth session
   */
  clearAuth() {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
  },

  /**
   * Standard request wrapper with error handling & JWT
   */
  async request(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    const headers = {
      ...(options.headers || {})
    };

    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Auto set content-type for json if not FormData
    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      // Handle 401 Unauthorized globally
      if (response.status === 401) {
        // If not already on login page, redirect
        if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('index.html')) {
          this.clearAuth();
          UI.showToast('Session expired. Please log in again.', 'error');
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 1000);
          return null;
        }
      }

      // Check if response is JSON or blob/stream
      const contentType = response.headers.get('content-type');
      let data = null;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errorMsg = (data && data.detail) || (typeof data === 'string' && data) || `Error: ${response.status} ${response.statusText}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  },

  /**
   * Dedicated file download helper for binary files (PDF, Excel, JSON)
   */
  async downloadFile(endpoint, defaultFilename = 'report') {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { headers });

      if (!response.ok) {
        let errMessage = 'Download failed';
        try {
          const errJson = await response.json();
          errMessage = errJson.detail || errMessage;
        } catch (_) {}
        throw new Error(errMessage);
      }

      // Extract filename from Content-Disposition header if present
      let filename = defaultFilename;
      const disposition = response.headers.get('content-disposition');
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      return true;
    } catch (err) {
      console.error(`[Download Error] ${endpoint}:`, err);
      throw err;
    }
  },

  // ==========================================
  // Auth API
  // ==========================================
  async register(name, email, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
  },

  async login(email, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res && res.access_token) {
      this.setToken(res.access_token);
    }
    return res;
  },

  // ==========================================
  // Projects API
  // ==========================================
  async getProjects() {
    return this.request('/projects', { method: 'GET' });
  },

  async getProject(projectId) {
    return this.request(`/projects/${projectId}`, { method: 'GET' });
  },

  async createProject(projectName, description, language) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify({
        project_name: projectName,
        description: description || '',
        language
      })
    });
  },

  async updateProject(projectId, projectName, description, language) {
    return this.request(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify({
        project_name: projectName,
        description: description || '',
        language
      })
    });
  },

  async deleteProject(projectId) {
    return this.request(`/projects/${projectId}`, { method: 'DELETE' });
  },

  // ==========================================
  // Source Code Upload API
  // ==========================================
  async pasteSourceCode(projectId, codeContent, language, fileName = '') {
    return this.request(`/projects/${projectId}/source-code`, {
      method: 'POST',
      body: JSON.stringify({
        code_content: codeContent,
        language,
        file_name: fileName || undefined
      })
    });
  },

  async uploadSingleFile(projectId, file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request(`/projects/${projectId}/source-code/upload-file`, {
      method: 'POST',
      body: formData
    });
  },

  async uploadZipFile(projectId, zipFile) {
    const formData = new FormData();
    formData.append('file', zipFile);
    return this.request(`/projects/${projectId}/source-code/upload-zip`, {
      method: 'POST',
      body: formData
    });
  },

  async listSourceCode(projectId) {
    return this.request(`/projects/${projectId}/source-code`, { method: 'GET' });
  },

  // ==========================================
  // Single File Analysis API
  // ==========================================
  async analyzeSourceCode(projectId, codeId) {
    return this.request(`/projects/${projectId}/source-code/${codeId}/analyze`, { method: 'POST' });
  },

  async getAnalysisReport(projectId, codeId) {
    return this.request(`/projects/${projectId}/source-code/${codeId}/report`, { method: 'GET' });
  },

  async generateTestCases(projectId, codeId) {
    return this.request(`/projects/${projectId}/source-code/${codeId}/generate-test-cases`, { method: 'POST' });
  },

  async getTestCases(projectId, codeId) {
    return this.request(`/projects/${projectId}/source-code/${codeId}/test-cases`, { method: 'GET' });
  },

  async analyzeSecurity(projectId, codeId) {
    return this.request(`/projects/${projectId}/source-code/${codeId}/analyze-security`, { method: 'POST' });
  },

  async getSecurityReport(projectId, codeId) {
    return this.request(`/projects/${projectId}/source-code/${codeId}/security-report`, { method: 'GET' });
  },

  async generateDocumentation(projectId, codeId) {
    return this.request(`/projects/${projectId}/source-code/${codeId}/generate-documentation`, { method: 'POST' });
  },

  async getDocumentation(projectId, codeId) {
    return this.request(`/projects/${projectId}/source-code/${codeId}/documentation`, { method: 'GET' });
  },

  async downloadSingleDocumentation(projectId, codeId, format = 'pdf') {
    return this.downloadFile(
      `/projects/${projectId}/source-code/${codeId}/documentation/download?format=${format}`,
      `documentation.${format === 'excel' ? 'xlsx' : format}`
    );
  },

  // ==========================================
  // Project-Level Analysis API
  // ==========================================
  async analyzeProject(projectId) {
    return this.request(`/projects/${projectId}/analyze-project`, { method: 'POST' });
  },

  async getProjectReport(projectId) {
    return this.request(`/projects/${projectId}/project-report`, { method: 'GET' });
  },

  async generateProjectDocumentation(projectId) {
    return this.request(`/projects/${projectId}/generate-documentation`, { method: 'POST' });
  },

  async getProjectDocumentation(projectId) {
    return this.request(`/projects/${projectId}/documentation`, { method: 'GET' });
  },

  async downloadProjectReport(projectId, fileFormat = 'pdf') {
    return this.downloadFile(
      `/projects/${projectId}/download?file_format=${fileFormat}`,
      `project_report.${fileFormat}`
    );
  },

  // ==========================================
  // Chat API
  // ==========================================
  async sendChatMessage(projectId, message) {
    return this.request(`/projects/${projectId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  },

  async getChatHistory(projectId) {
    return this.request(`/projects/${projectId}/chat`, { method: 'GET' });
  }
};

/**
 * UI Utilities (Toasts, Spinners, Helpers)
 */
const UI = {
  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '✕';

    toast.innerHTML = `<span style="font-weight:bold;">${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 200);
    }, 4000);
  },

  setButtonLoading(btn, isLoading, loadingText = 'Processing...') {
    if (!btn) return;
    if (isLoading) {
      btn.dataset.origHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span> ${loadingText}`;
    } else {
      btn.disabled = false;
      if (btn.dataset.origHtml) {
        btn.innerHTML = btn.dataset.origHtml;
      }
    }
  },

  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

      /**
   * Universal Markdown Renderer
   * Handles: Bold-Italic, Bold, Italic, Tables, Lists with Nested Bullets & Blank Lines, Code Blocks
   */
  renderMarkdown(md) {
    if (!md) return '';

    // 1. Temporarily stash fenced code blocks (```code```) so their content isn't altered
    const codeBlocks = [];
    let text = md.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      codeBlocks.push({ lang, code });
      return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });

    // 2. Escape HTML tags
    text = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Helper for inline elements: Bold, Italic, Inline Code
    const formatInline = (str) => {
      return str
        .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
        .replace(/(\*\*\*|___)(.*?)\1/g, '<strong><em>$2</em></strong>')
        .replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>')
        .replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
    };

    // 3. Process line-by-line for blocks
    const lines = text.split('\n');
    const output = [];
    let i = 0;

    while (i < lines.length) {
      let line = lines[i];

      // Restore code block
      if (line.trim().startsWith('__CODE_BLOCK_') && line.trim().endsWith('__')) {
        const idx = parseInt(line.trim().replace('__CODE_BLOCK_', '').replace('__', ''), 10);
        const block = codeBlocks[idx];
        output.push(`<pre><code class="code-block language-${block.lang || 'text'}">${UI.escapeHtml(block.code)}</code></pre>`);
        i++;
        continue;
      }

      // Headings (# H1, ## H2, ### H3, etc.)
      if (/^#{1,6}\s+/.test(line)) {
        const level = line.match(/^#{1,6}/)[0].length;
        const content = line.replace(/^#{1,6}\s+/, '');
        output.push(`<h${level}>${formatInline(content)}</h${level}>`);
        i++;
        continue;
      }

      // Blockquotes (> quote)
      if (line.startsWith('&gt; ')) {
        const content = line.replace(/^&gt;\s*/, '');
        output.push(`<blockquote>${formatInline(content)}</blockquote>`);
        i++;
        continue;
      }

      // Horizontal rule (--- or ***)
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
        output.push('<hr>');
        i++;
        continue;
      }

      // Markdown Tables (| Col 1 | Col 2 |)
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const tableLines = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }

        if (tableLines.length >= 2) {
          const headers = tableLines[0].split('|').slice(1, -1).map(c => c.trim());
          let startRow = 1;
          if (/^\|?(\s*:?-+:?\s*\|?)+$/.test(tableLines[1])) {
            startRow = 2;
          }

          let tableHtml = '<div class="table-responsive"><table class="md-table"><thead><tr>';
          headers.forEach(h => {
            tableHtml += `<th>${formatInline(h)}</th>`;
          });
          tableHtml += '</tr></thead><tbody>';

          for (let r = startRow; r < tableLines.length; r++) {
            const cells = tableLines[r].split('|').slice(1, -1).map(c => c.trim());
            tableHtml += '<tr>';
            for (let c = 0; c < headers.length; c++) {
              const cellVal = cells[c] !== undefined ? cells[c] : '';
              tableHtml += `<td>${formatInline(cellVal)}</td>`;
            }
            tableHtml += '</tr>';
          }

          tableHtml += '</tbody></table></div>';
          output.push(tableHtml);
          continue;
        }
      }

      // -------------------------------------------------------------
      // FIXED: Numbered Lists (1. Item, 2. Item) with Sub-bullets
      // -------------------------------------------------------------
      if (/^\s*\d+\.\s+/.test(line)) {
        const firstMatch = line.match(/^\s*(\d+)\.\s+/);
        const startNum = firstMatch ? parseInt(firstMatch[1], 10) : 1;
        let listHtml = `<ol class="md-list" start="${startNum}">`;

        while (i < lines.length) {
          let currentLine = lines[i];

          // Skip blank lines without breaking the list if next line is a numbered item or sub-bullet
          if (currentLine.trim() === '') {
            let nextIdx = i + 1;
            while (nextIdx < lines.length && lines[nextIdx].trim() === '') nextIdx++;
            if (nextIdx < lines.length && (/^\s*\d+\.\s+/.test(lines[nextIdx]) || /^\s+[-*]\s+/.test(lines[nextIdx]))) {
              i++;
              continue;
            } else {
              break;
            }
          }

          // Numbered Item (1., 2., 3., etc.)
          const numMatch = currentLine.match(/^\s*(\d+)\.\s+(.*)$/);
          if (numMatch) {
            const itemNum = parseInt(numMatch[1], 10);
            const itemText = numMatch[2];
            listHtml += `<li value="${itemNum}">${formatInline(itemText)}`;

            // Check if following lines are indented sub-bullets (e.g. "   - ...")
            let subListHtml = '';
            let hasSubList = false;

            while (i + 1 < lines.length) {
              const nextLine = lines[i + 1];
              if (/^\s+[-*]\s+/.test(nextLine)) {
                if (!hasSubList) {
                  subListHtml += '<ul class="md-sublist">';
                  hasSubList = true;
                }
                const subText = nextLine.replace(/^\s+[-*]\s+/, '');
                subListHtml += `<li>${formatInline(subText)}</li>`;
                i++;
              } else {
                break;
              }
            }

            if (hasSubList) {
              subListHtml += '</ul>';
              listHtml += subListHtml;
            }

            listHtml += `</li>`;
            i++;
            continue;
          }

          break;
        }

        listHtml += '</ol>';
        output.push(listHtml);
        continue;
      }

      // Unordered Lists (- item or * item)
      if (/^\s*[-*]\s+/.test(line)) {
        let listHtml = '<ul class="md-list">';
        while (i < lines.length) {
          let currentLine = lines[i];

          if (currentLine.trim() === '') {
            let nextIdx = i + 1;
            while (nextIdx < lines.length && lines[nextIdx].trim() === '') nextIdx++;
            if (nextIdx < lines.length && /^\s*[-*]\s+/.test(lines[nextIdx])) {
              i++;
              continue;
            } else {
              break;
            }
          }

          if (/^\s*[-*]\s+/.test(currentLine)) {
            const itemText = currentLine.replace(/^\s*[-*]\s+/, '');
            listHtml += `<li>${formatInline(itemText)}</li>`;
            i++;
            continue;
          }

          break;
        }
        listHtml += '</ul>';
        output.push(listHtml);
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        i++;
        continue;
      }

      // Normal paragraph
      output.push(`<p>${formatInline(line)}</p>`);
      i++;
    }

    return output.join('\n');
  },}
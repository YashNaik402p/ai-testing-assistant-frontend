/**
 * AI Testing Assistant - Report Page Controller
 */

let currentProjectId = null;
let currentCodeId = null;
let isProjectView = false;
let currentDocMarkdown = '';

document.addEventListener('DOMContentLoaded', async () => {
  Auth.requireAuth();

  const urlParams = new URLSearchParams(window.location.search);
  currentProjectId = urlParams.get('projectId');
  currentCodeId = urlParams.get('codeId');
  isProjectView = urlParams.get('view') === 'project' || (!currentCodeId && !!currentProjectId);

  if (!currentProjectId) {
    UI.showToast('No project specified. Redirecting to dashboard...', 'error');
    setTimeout(() => window.location.href = 'dashboard.html', 1000);
    return;
  }

  // Setup navigation links
  document.getElementById('back-to-files-link').href = `files.html?projectId=${currentProjectId}`;
  document.getElementById('report-chat-btn').href = `chat.html?projectId=${currentProjectId}`;

  setupTabs();
  setupDownloadDropdown();

  if (isProjectView) {
    await loadProjectReport();
  } else {
    await loadSingleFileReport();
  }
    // Wire up Generate/Regenerate Documentation button for both views
  const regenDocsBtn = document.getElementById('regen-docs-btn');
  if (regenDocsBtn) {
    regenDocsBtn.onclick = handleGenerateDocumentation;
  }
});

function setupTabs() {
  const tabs = [
    { btn: document.getElementById('tab-overview-btn'), content: document.getElementById('content-overview') },
    { btn: document.getElementById('tab-tests-btn'), content: document.getElementById('content-tests') },
    { btn: document.getElementById('tab-security-btn'), content: document.getElementById('content-security') },
    { btn: document.getElementById('tab-docs-btn'), content: document.getElementById('content-docs') }
  ];

  tabs.forEach(t => {
    t.btn.addEventListener('click', () => {
      tabs.forEach(x => {
        x.btn.classList.remove('active');
        x.content.classList.remove('active');
      });
      t.btn.classList.add('active');
      t.content.classList.add('active');
    });
  });

  // Copy Markdown Doc
  const copyDocsBtn = document.getElementById('copy-docs-btn');
  if (copyDocsBtn) {
    copyDocsBtn.addEventListener('click', () => {
      if (!currentDocMarkdown) {
        UI.showToast('No documentation content to copy', 'info');
        return;
      }
      navigator.clipboard.writeText(currentDocMarkdown).then(() => {
        UI.showToast('Documentation copied to clipboard!', 'success');
      });
    });
  }
}

/**
 * Configure download dropdown items based on whether user is viewing single file or zip project
 */
function setupDownloadDropdown() {
  const dropdownBtn = document.getElementById('download-dropdown-btn');
  const dropdownMenu = document.getElementById('download-dropdown-menu');

  dropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    dropdownMenu.classList.remove('show');
  });

  if (!isProjectView && currentCodeId) {
    // Single file download: PDF, JSON
    dropdownMenu.innerHTML = `
      <button type="button" class="dropdown-item" onclick="handleSingleDownload('pdf')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        </svg>
        <span>Download PDF</span>
      </button>
      
      <button type="button" class="dropdown-item" onclick="handleSingleDownload('json')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
        <span>Download JSON</span>
      </button>
    `;
  } else {
    // Overall Project (ZIP) download: PDF, JSON
    dropdownMenu.innerHTML = `
      <button type="button" class="dropdown-item" onclick="handleProjectDownload('pdf')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        </svg>
        <span>Download Project PDF</span>
      </button>
      <button type="button" class="dropdown-item" onclick="handleProjectDownload('json')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
        <span>Download Project JSON</span>
      </button>
    `;
  }
}

/**
 * Handle Single File Downloads
 */
async function handleSingleDownload(format) {
  try {
    UI.showToast(`Generating ${format.toUpperCase()} documentation...`, 'info');
    await API.downloadSingleDocumentation(currentProjectId, currentCodeId, format);
    UI.showToast(`${format.toUpperCase()} downloaded!`, 'success');
  } catch (err) {
    UI.showToast(err.message || `Failed to download ${format}`, 'error');
  }
}

/**
 * Handle Project-Level Report Downloads
 */
async function handleProjectDownload(fileFormat) {
  try {
    UI.showToast(`Generating Project Report (${fileFormat.toUpperCase()})...`, 'info');
    await API.downloadProjectReport(currentProjectId, fileFormat);
    UI.showToast(`Project Report downloaded!`, 'success');
  } catch (err) {
    UI.showToast(err.message || `Failed to download report`, 'error');
  }
}
/**
 * Unified Generate / Regenerate Documentation handler
 * Works seamlessly for BOTH Single File and Overall Project views!
 */
async function handleGenerateDocumentation() {
  const btn = document.getElementById('regen-docs-btn');
  UI.setButtonLoading(btn, true, 'Writing Documentation...');

  try {
    if (isProjectView) {
      // 1. Overall Project Documentation Route
      const doc = await API.generateProjectDocumentation(currentProjectId);
      currentDocMarkdown = doc.content || '';
      document.getElementById('doc-content-container').innerHTML = UI.renderMarkdown(currentDocMarkdown);
      UI.showToast('Overall project documentation generated!', 'success');
    } else {
      // 2. Single File Documentation Route
      await API.generateDocumentation(currentProjectId, currentCodeId);
      UI.showToast('File documentation updated!', 'success');
      await loadDocumentation();
    }
  } catch (err) {
    UI.showToast(err.message || 'Failed to generate documentation', 'error');
  } finally {
    UI.setButtonLoading(btn, false);
  }
}
/**
 * Load Single File Report Flow
 */
async function loadSingleFileReport() {
  try {
    // 1. Fetch File & Project Info
    const project = await API.getProject(currentProjectId);
    const files = await API.listSourceCode(currentProjectId);
    const currentFile = files.find(f => f.code_id == currentCodeId);

    const fileName = currentFile ? currentFile.file_name : `Code #${currentCodeId}`;
    document.getElementById('report-heading-title').textContent = `${fileName} — Report`;
    document.getElementById('report-heading-subtitle').textContent = `File Analysis in ${project.project_name} (${(currentFile && currentFile.language) || 'Code'})`;

    // 2. Fetch / Check Analysis Report
    let report = null;
    try {
      report = await API.getAnalysisReport(currentProjectId, currentCodeId);
    } catch (_) {
      // If not analyzed yet, analyze it now
      report = await API.analyzeSourceCode(currentProjectId, currentCodeId);
    }

    if (report) {
      document.getElementById('kpi-quality-score').textContent = report.quality_score != null ? `${report.quality_score}/10` : 'N/A';
      document.getElementById('kpi-complexity-score').textContent = report.complexity || 'N/A';
      document.getElementById('explanation-text').textContent = report.explanation_summary || 'No explanation generated.';
    }

    // 3. Fetch Test Cases
    await loadTestCases();

    // 4. Fetch Security Report
    await loadSecurityReport();

    // 5. Fetch Documentation
    await loadDocumentation();

    // Wire up regenerate buttons
    document.getElementById('regen-tests-btn').onclick = async function () {
      UI.setButtonLoading(this, true, 'Generating Test Cases...');
      try {
        await API.generateTestCases(currentProjectId, currentCodeId);
        UI.showToast('Test cases regenerated!', 'success');
        await loadTestCases();
      } catch (err) {
        UI.showToast(err.message || 'Failed to generate test cases', 'error');
      } finally {
        UI.setButtonLoading(this, false);
      }
    };

    document.getElementById('run-security-btn').onclick = async function () {
      UI.setButtonLoading(this, true, 'Running Security Audit...');
      try {
        await API.analyzeSecurity(currentProjectId, currentCodeId);
        UI.showToast('Security analysis complete!', 'success');
        await loadSecurityReport();
      } catch (err) {
        UI.showToast(err.message || 'Failed to run security analysis', 'error');
      } finally {
        UI.setButtonLoading(this, false);
      }
    };

    document.getElementById('regen-docs-btn').onclick = async function () {
      UI.setButtonLoading(this, true, 'Writing Documentation...');
      try {
        await API.generateDocumentation(currentProjectId, currentCodeId);
        UI.showToast('Documentation updated!', 'success');
        await loadDocumentation();
      } catch (err) {
        UI.showToast(err.message || 'Failed to generate documentation', 'error');
      } finally {
        UI.setButtonLoading(this, false);
      }
    };

  } catch (err) {
    console.error('Error loading single file report:', err);
    UI.showToast(err.message || 'Error loading report', 'error');
  }
}

/**
 * Load Test Cases
 */
async function loadTestCases() {
  const container = document.getElementById('test-cases-container');
  try {
    let testCases = await API.getTestCases(currentProjectId, currentCodeId);
    document.getElementById('kpi-tests-count').textContent = testCases.length;

    if (!testCases || testCases.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No test cases generated for this file yet.</p>
          <button class="btn btn-primary" style="margin-top: 1rem;" onclick="document.getElementById('regen-tests-btn').click()">
            Generate AI Test Cases
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="test-cases-table">
          <thead>
            <tr>
              <th style="width: 12%;">Test Code</th>
              <th style="width: 18%;">Type</th>
              <th style="width: 35%;">Description</th>
              <th style="width: 35%;">Expected Result</th>
            </tr>
          </thead>
          <tbody>
            ${testCases.map(tc => `
              <tr>
                <td><span class="test-code-badge">${UI.escapeHtml(tc.test_code)}</span></td>
                <td><span class="badge badge-neutral">${UI.escapeHtml(tc.test_type)}</span></td>
                <td>${UI.escapeHtml(tc.description)}</td>
                <td><code>${UI.escapeHtml(tc.expected_result)}</code></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color: var(--status-danger);">Failed to load test cases: ${UI.escapeHtml(err.message)}</p>`;
  }
}

/**
 * Load Security Report
 */
async function loadSecurityReport() {
  const container = document.getElementById('security-container');
  try {
    const sec = await API.getSecurityReport(currentProjectId, currentCodeId);
    document.getElementById('kpi-security-score').textContent = sec.security_score != null ? `${sec.security_score}/10` : 'N/A';

    container.innerHTML = `
      <div class="security-alert-box severity-${sec.severity || 'Low'}">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
          <h4 style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">Security Audit Finding</h4>
          <span class="badge badge-${sec.severity === 'High' || sec.severity === 'Critical' ? 'danger' : sec.severity === 'Medium' ? 'warning' : 'info'}">
            Severity: ${UI.escapeHtml(sec.severity || 'Low')}
          </span>
        </div>
        <p style="margin-bottom: 0.75rem; color: var(--text-primary); font-size: 0.95rem;">${UI.escapeHtml(sec.issue_description || 'No vulnerabilities detected.')}</p>
        <div style="background: var(--bg-surface); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          <strong style="color: var(--accent-cyan); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.35rem;">AI Recommendation:</strong>
          <span style="font-size: 0.9rem; color: var(--text-secondary);">${UI.escapeHtml(sec.recommendation || 'Keep following security best practices.')}</span>
        </div>
      </div>
    `;
  } catch (_) {
    document.getElementById('kpi-security-score').textContent = 'Pending';
    container.innerHTML = `
      <div class="empty-state">
        <p>No security analysis performed for this file yet.</p>
        <button class="btn btn-primary" style="margin-top: 1rem;" onclick="document.getElementById('run-security-btn').click()">
          Run Security Audit
        </button>
      </div>
    `;
  }
}

/**
 * Load Documentation
 */
async function loadDocumentation() {
  const container = document.getElementById('doc-content-container');
  try {
    const doc = await API.getDocumentation(currentProjectId, currentCodeId);
    currentDocMarkdown = doc.content || '';
    container.innerHTML = UI.renderMarkdown(currentDocMarkdown);
  } catch (_) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No documentation generated for this file yet.</p>
        <button class="btn btn-primary" style="margin-top: 1rem;" onclick="handleGenerateDocumentation()">
          Generate Documentation
        </button>
      </div>
    `;
  }
}

/**
 * Load Overall Project (ZIP) Report Flow
 */
async function loadProjectReport() {
  try {
    const project = await API.getProject(currentProjectId);
    document.getElementById('report-heading-title').textContent = `${project.project_name} — Project Intelligence`;
    document.getElementById('report-heading-subtitle').textContent = `Overall Codebase Architecture, Complexity & Security Summary`;

    // Fetch Project Analysis
    let projAnalysis = null;
    try {
      projAnalysis = await API.getProjectReport(currentProjectId);
    } catch (_) {
      projAnalysis = await API.analyzeProject(currentProjectId);
    }

    if (projAnalysis) {
      document.getElementById('kpi-quality-score').textContent = projAnalysis.average_quality_score != null ? `${Math.round(projAnalysis.average_quality_score)}/10` : 'N/A';
      document.getElementById('kpi-complexity-score').textContent = projAnalysis.average_complexity || 'N/A';
      document.getElementById('kpi-security-score').textContent = projAnalysis.average_security_score != null ? `${Math.round(projAnalysis.average_security_score)}/10` : 'N/A';
      document.getElementById('kpi-tests-count').textContent = `${projAnalysis.files_with_analysis || 0} / ${projAnalysis.total_files || 0}`;
      document.getElementById('kpi-tests-label').textContent = 'Files Analyzed';

      document.getElementById('explanation-text').textContent = projAnalysis.overview || 'No overview generated.';

      // Security Tab for project
      const secContainer = document.getElementById('security-container');
      secContainer.innerHTML = `
        <div class="security-alert-box severity-Medium">
          <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary);">Overall Codebase Security Summary</h4>
          <p style="color: var(--text-secondary); line-height: 1.6;">${UI.escapeHtml(projAnalysis.security_summary || 'No security issues identified.')}</p>
        </div>
      `;
      document.getElementById('run-security-btn').style.display = 'none';

      // Test Cases Tab for project
      const tcContainer = document.getElementById('test-cases-container');
      tcContainer.innerHTML = `
        <div class="empty-state">
          <p>Project-level analysis aggregates individual file analyses. View individual files to see file-specific test cases.</p>
          <a href="files.html?projectId=${currentProjectId}" class="btn btn-secondary" style="margin-top: 1rem;">Go to Files List</a>
        </div>
      `;
      document.getElementById('regen-tests-btn').style.display = 'none';

      // Project Documentation (Using the new UI.renderMarkdown & handleGenerateDocumentation)
      try {
        let projDoc = await API.getProjectDocumentation(currentProjectId);
        currentDocMarkdown = projDoc.content || '';
        document.getElementById('doc-content-container').innerHTML = UI.renderMarkdown(currentDocMarkdown);
      } catch (_) {
        document.getElementById('doc-content-container').innerHTML = `
          <div class="empty-state">
            <p>No project documentation generated yet.</p>
            <button class="btn btn-primary" style="margin-top: 1rem;" onclick="handleGenerateDocumentation()">
              Generate Project Docs
            </button>
          </div>
        `;
      }
    }
  } catch (err) {
    console.error('Error loading project report:', err);
    UI.showToast(err.message || 'Failed to load project report', 'error');
  }
}

/**
 * Lightweight client-side markdown renderer for documentation
 */
function renderMarkdownContent(targetEl, markdown) {
  if (!markdown) {
    targetEl.innerHTML = '<p style="color: var(--text-muted);">No documentation content available.</p>';
    return;
  }

  const lines = markdown.split('\n');
  let html = '';
  let inCodeBlock = false;
  let codeBuffer = '';

  for (let line of lines) {
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBuffer = '';
      } else {
        inCodeBlock = false;
        html += `<pre><code>${UI.escapeHtml(codeBuffer)}</code></pre>`;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer += line + '\n';
      continue;
    }

    if (line.startsWith('# ')) {
      html += `<h1>${UI.escapeHtml(line.slice(2))}</h1>`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${UI.escapeHtml(line.slice(3))}</h2>`;
    } else if (line.startsWith('### ')) {
      html += `<h3>${UI.escapeHtml(line.slice(4))}</h3>`;
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      html += `<li>${UI.escapeHtml(line.slice(2))}</li>`;
    } else if (line.trim() === '') {
      html += '<br>';
    } else {
      html += `<p>${UI.escapeHtml(line)}</p>`;
    }
  }

  targetEl.innerHTML = html;
}

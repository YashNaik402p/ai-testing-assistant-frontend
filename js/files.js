/**
 * AI Testing Assistant - Files to Analyze Controller
 */

let currentProjectId = null;
let projectFiles = [];

document.addEventListener('DOMContentLoaded', async () => {
  Auth.requireAuth();

  const urlParams = new URLSearchParams(window.location.search);
  currentProjectId = urlParams.get('projectId');

  if (!currentProjectId) {
    UI.showToast('No project selected. Redirecting to dashboard...', 'error');
    setTimeout(() => window.location.href = 'dashboard.html', 1000);
    return;
  }

  // Setup header links
  document.getElementById('upload-more-btn').href = `upload.html?projectId=${currentProjectId}`;
  document.getElementById('chat-project-btn').href = `chat.html?projectId=${currentProjectId}`;

  try {
    const project = await API.getProject(currentProjectId);
    if (project) {
      document.getElementById('project-title').textContent = `${project.project_name} — Files`;
      document.getElementById('project-subtitle').textContent = `Manage and analyze files in ${project.project_name} (${project.language || 'Code'})`;
    }
  } catch (err) {
    console.warn('Could not fetch project details:', err);
  }

  await loadFiles();
  await checkProjectAnalysisStatus();

  // Search filter
  const searchInput = document.getElementById('file-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = projectFiles.filter(f =>
        (f.file_name && f.file_name.toLowerCase().includes(q)) ||
        (f.language && f.language.toLowerCase().includes(q))
      );
      renderFileRows(filtered);
    });
  }

  // Run Project Analysis button
  const runProjectAnalysisBtn = document.getElementById('run-project-analysis-btn');
  if (runProjectAnalysisBtn) {
    runProjectAnalysisBtn.addEventListener('click', async () => {
      const analyzedFilesCount = projectFiles.filter(f => f._isAnalyzed).length;
      if (analyzedFilesCount === 0) {
        UI.showToast('Please analyze at least one file before running project-level analysis.', 'warning');
        return;
      }

      try {
        UI.setButtonLoading(runProjectAnalysisBtn, true, 'Analyzing Project Codebase...');
        await API.analyzeProject(currentProjectId);
        UI.showToast('Project analysis complete! Opening Report...', 'success');
        setTimeout(() => {
          window.location.href = `report.html?projectId=${currentProjectId}&view=project`;
        }, 800);
      } catch (err) {
        UI.showToast(err.message || 'Failed to analyze project', 'error');
      } finally {
        UI.setButtonLoading(runProjectAnalysisBtn, false);
      }
    });
  }
});

/**
 * Load all files in project and check analysis status
 */
async function loadFiles() {
  const tbody = document.getElementById('files-table-body');
  const countBadge = document.getElementById('files-count-badge');

  try {
    const files = await API.listSourceCode(currentProjectId);
    projectFiles = files || [];
    countBadge.textContent = `${projectFiles.length} File${projectFiles.length === 1 ? '' : 's'} in Project`;

    if (projectFiles.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 3rem;">
            <div class="empty-state">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <h3>No source files found</h3>
              <p>Upload a single file or a ZIP archive to begin AI analysis.</p>
              <a href="upload.html?projectId=${currentProjectId}" class="btn btn-primary" style="margin-top: 1rem;">
                Upload Code
              </a>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    // Check analysis status for each file in parallel
    const statusPromises = projectFiles.map(async (file) => {
      try {
        const report = await API.getAnalysisReport(currentProjectId, file.code_id);
        return { codeId: file.code_id, isAnalyzed: !!report };
      } catch (_) {
        return { codeId: file.code_id, isAnalyzed: false };
      }
    });

    const statuses = await Promise.all(statusPromises);
    const statusMap = {};
    statuses.forEach(s => { statusMap[s.codeId] = s.isAnalyzed; });

    projectFiles.forEach(f => {
      f._isAnalyzed = statusMap[f.code_id] || false;
    });

    renderFileRows(projectFiles);
  } catch (err) {
    console.error('Error listing files:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2rem; color: var(--status-danger);">
          Failed to load files: ${UI.escapeHtml(err.message)}
        </td>
      </tr>
    `;
  }
}

/**
 * Render table rows
 */
function renderFileRows(files) {
  const tbody = document.getElementById('files-table-body');
  if (!tbody) return;

  if (files.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">
          No matching files found.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = files.map(f => {
    const isAnalyzed = f._isAnalyzed;

    const statusBadge = isAnalyzed
      ? `<span class="badge badge-success">● Analysed</span>`
      : `<span class="badge badge-warning">● Pending</span>`;

    const actionButton = isAnalyzed
      ? `
        <a href="report.html?projectId=${currentProjectId}&codeId=${f.code_id}" class="btn btn-secondary" style="padding: 0.45rem 0.9rem; font-size: 0.85rem;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>View Report</span>
        </a>
      `
      : `
        <button type="button" class="btn btn-primary" style="padding: 0.45rem 0.9rem; font-size: 0.85rem;" onclick="handleAnalyzeFile(${f.code_id}, this)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span>Analyse</span>
        </button>
      `;

    return `
      <tr>
        <td>
          <div class="file-name-cell">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span>${UI.escapeHtml(f.file_name)}</span>
          </div>
        </td>
        <td>
          <span class="badge badge-neutral">${UI.escapeHtml(f.language || 'Code')}</span>
        </td>
        <td>${UI.formatDate(f.uploaded_at)}</td>
        <td>${statusBadge}</td>
        <td style="text-align: right;">${actionButton}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Handle analyzing an individual file
 */
async function handleAnalyzeFile(codeId, btnEl) {
  try {
    UI.setButtonLoading(btnEl, true, 'Analyzing...');
    await API.analyzeSourceCode(currentProjectId, codeId);
    UI.showToast('Analysis finished! Opening report...', 'success');
    setTimeout(() => {
      window.location.href = `report.html?projectId=${currentProjectId}&codeId=${codeId}`;
    }, 600);
  } catch (err) {
    UI.showToast(err.message || 'Failed to analyze file', 'error');
    UI.setButtonLoading(btnEl, false);
  }
}

/**
 * Check if project-level analysis exists
 */
async function checkProjectAnalysisStatus() {
  try {
    const report = await API.getProjectReport(currentProjectId);
    if (report) {
      const viewBtn = document.getElementById('view-project-report-btn');
      if (viewBtn) {
        viewBtn.href = `report.html?projectId=${currentProjectId}&view=project`;
        viewBtn.style.display = 'inline-flex';
      }
      document.getElementById('project-analysis-title').textContent = 'Project Intelligence Ready';
      document.getElementById('project-analysis-desc').textContent = `Overview generated : ${Math.round(report.average_quality_score) || 'N/A'}/10`;
    }
  } catch (_) {}
}

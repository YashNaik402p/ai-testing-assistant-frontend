/**
 * AI Testing Assistant - Dashboard Controller
 */

let allProjects = [];

document.addEventListener('DOMContentLoaded', async () => {
  Auth.requireAuth();

  const projectsGrid = document.getElementById('projects-grid');
  const createModal = document.getElementById('create-project-modal');
  const openCreateModalBtn = document.getElementById('open-create-modal-btn');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const cancelModalBtn = document.getElementById('cancel-modal-btn');
  const createForm = document.getElementById('create-project-form');
  const searchInput = document.getElementById('project-search');

  // Modal Handlers
  function openModal() {
    createModal.classList.add('active');
    document.getElementById('project-name').focus();
  }

  function closeModal() {
    createModal.classList.remove('active');
    createForm.reset();
  }

  if (openCreateModalBtn) openCreateModalBtn.addEventListener('click', openModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

  // Close modal when clicking backdrop
  createModal.addEventListener('click', (e) => {
    if (e.target === createModal) closeModal();
  });

  // Load Projects
  await loadProjects();

  // Search Filter
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      const filtered = allProjects.filter(p =>
        (p.project_name && p.project_name.toLowerCase().includes(query)) ||
        (p.language && p.language.toLowerCase().includes(query)) ||
        (p.description && p.description.toLowerCase().includes(query))
      );
      renderProjects(filtered);
    });
  }

  // Create Project Form Submit
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('project-name').value.trim();
      const language = document.getElementById('project-language').value;
      const desc = document.getElementById('project-desc').value.trim();
      const saveBtn = document.getElementById('save-project-btn');

      if (!name) {
        UI.showToast('Please enter a project name', 'error');
        return;
      }

      try {
        UI.setButtonLoading(saveBtn, true, 'Creating...');
        const newProj = await API.createProject(name, desc, language);
        UI.showToast(`Project "${newProj.project_name}" created!`, 'success');
        closeModal();
        await loadProjects();
      } catch (err) {
        UI.showToast(err.message || 'Failed to create project', 'error');
      } finally {
        UI.setButtonLoading(saveBtn, false);
      }
    });
  }
});

/**
 * Fetch and process projects from backend
 */
async function loadProjects() {
  const grid = document.getElementById('projects-grid');
  const statTotal = document.getElementById('stat-total-projects');
  const statAnalyzed = document.getElementById('stat-analyzed-projects');

  try {
    const projects = await API.getProjects();
    allProjects = projects || [];

    // Check analysis status for each project in parallel
    const statusPromises = allProjects.map(async (p) => {
      try {
        const report = await API.getProjectReport(p.project_id);
        return { projectId: p.project_id, isAnalyzed: !!report };
      } catch (_) {
        // If project report not yet run, check if any single file has an analysis report
        try {
          const files = await API.listSourceCode(p.project_id);
          if (files && files.length > 0) {
            // Check first file's report
            try {
              const fileRep = await API.getAnalysisReport(p.project_id, files[0].code_id);
              return { projectId: p.project_id, isAnalyzed: !!fileRep, hasFiles: true, firstCodeId: files[0].code_id };
            } catch (_) {
              return { projectId: p.project_id, isAnalyzed: false, hasFiles: true, firstCodeId: files[0].code_id };
            }
          }
        } catch (_) {}
        return { projectId: p.project_id, isAnalyzed: false, hasFiles: false };
      }
    });

    const statuses = await Promise.all(statusPromises);
    const statusMap = {};
    let analyzedCount = 0;

    statuses.forEach(s => {
      statusMap[s.projectId] = s;
      if (s.isAnalyzed) analyzedCount++;
    });

    // Update stats
    if (statTotal) statTotal.textContent = allProjects.length;
    if (statAnalyzed) statAnalyzed.textContent = analyzedCount;

    // Attach status info to allProjects objects
    allProjects.forEach(p => {
      p._status = statusMap[p.project_id] || { isAnalyzed: false, hasFiles: false };
    });

    renderProjects(allProjects);
  } catch (err) {
    console.error('Error loading projects:', err);
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <p style="color: var(--status-danger);">Failed to load projects: ${UI.escapeHtml(err.message)}</p>
        <button class="btn btn-secondary" style="margin-top: 1rem;" onclick="loadProjects()">Try Again</button>
      </div>
    `;
  }
}

/**
 * Render project cards
 */
function renderProjects(projects) {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  if (!projects || projects.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
        <h3>No projects found</h3>
        <p>Create your first project to upload code and generate AI test suites.</p>
        <button class="btn btn-primary" style="margin-top: 1rem;" onclick="document.getElementById('open-create-modal-btn').click()">
          Create Project
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = projects.map(p => {
    const isAnalyzed = p._status && p._status.isAnalyzed;
    const hasFiles = p._status && p._status.hasFiles;
    const firstCodeId = p._status && p._status.firstCodeId;

    // Badge
    const statusBadge = isAnalyzed
      ? `<span class="badge badge-success">● Analysed</span>`
      : `<span class="badge badge-warning">● Pending</span>`;

    // Action button based on analyzed status
    let actionBtn = '';
    if (isAnalyzed) {
      // If analyzed, button says "View Report" and takes to report page
      const reportUrl = firstCodeId
        ? `report.html?projectId=${p.project_id}&codeId=${firstCodeId}`
        : `report.html?projectId=${p.project_id}&view=project`;

      actionBtn = `
        <a href="${reportUrl}" class="btn btn-primary btn-main">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>View Report</span>
        </a>
      `;
    } else {
      // If not analyzed, button says "Analyse" and takes user to upload page (or files page if files exist)
      const targetUrl = hasFiles
        ? `files.html?projectId=${p.project_id}`
        : `upload.html?projectId=${p.project_id}`;

      actionBtn = `
        <a href="${targetUrl}" class="btn btn-primary btn-main">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span>Analyse</span>
        </a>
      `;
    }

    return `
      <div class="project-card" id="proj-card-${p.project_id}">
        <div>
          <div class="project-card-header">
            <div class="project-name">
              <span>${UI.escapeHtml(p.project_name)}</span>
            </div>
            ${statusBadge}
          </div>

          <p class="project-desc">${UI.escapeHtml(p.description || 'No description provided.')}</p>
        </div>

        <div>
          <div class="project-meta">
            <span class="badge badge-neutral">${UI.escapeHtml(p.language || 'Code')}</span>
            <span>Created ${UI.formatDate(p.created_at)}</span>
          </div>

          <div class="project-actions">
            ${actionBtn}
            <a href="files.html?projectId=${p.project_id}" class="btn btn-secondary btn-icon" title="View Project Files">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </a>
            <button class="project-menu-btn" title="Delete Project" onclick="handleDeleteProject(${p.project_id}, '${UI.escapeHtml(p.project_name)}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Handle project deletion
 */
async function handleDeleteProject(projectId, projectName) {
  if (!confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
    return;
  }

  try {
    await API.deleteProject(projectId);
    UI.showToast(`Project "${projectName}" deleted`, 'info');
    await loadProjects();
  } catch (err) {
    UI.showToast(err.message || 'Failed to delete project', 'error');
  }
}

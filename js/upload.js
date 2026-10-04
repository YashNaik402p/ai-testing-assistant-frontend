/**
 * AI Testing Assistant - Upload Page Controller
 */

let currentProjectId = null;
let activeTab = 'paste';
let selectedSingleFile = null;
let selectedZipFile = null;

document.addEventListener('DOMContentLoaded', async () => {
  Auth.requireAuth();

  const urlParams = new URLSearchParams(window.location.search);
  currentProjectId = urlParams.get('projectId');

  if (!currentProjectId) {
    UI.showToast('No project selected. Redirecting to dashboard...', 'error');
    setTimeout(() => window.location.href = 'dashboard.html', 1200);
    return;
  }

  // Load project name in header
  try {
    const project = await API.getProject(currentProjectId);
    if (project) {
      document.getElementById('project-header-title').textContent = `Upload Code: ${project.project_name}`;
      if (project.language) {
        const langSelect = document.getElementById('paste-language');
        for (let opt of langSelect.options) {
          if (opt.value.toLowerCase() === project.language.toLowerCase()) {
            opt.selected = true;
            break;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch project info:', err);
  }

  setupTabs();
  setupDropzones();
  setupActions();
});

function setupTabs() {
  const tabPaste = document.getElementById('tab-paste-btn');
  const tabSingle = document.getElementById('tab-single-btn');
  const tabZip = document.getElementById('tab-zip-btn');

  const contentPaste = document.getElementById('content-paste');
  const contentSingle = document.getElementById('content-single');
  const contentZip = document.getElementById('content-zip');

  const flowHint = document.getElementById('flow-hint-text');
  const btnText = document.getElementById('analyse-btn-text');

  function switchTab(tab) {
    activeTab = tab;
    [tabPaste, tabSingle, tabZip].forEach(b => b.classList.remove('active'));
    [contentPaste, contentSingle, contentZip].forEach(c => c.classList.remove('active'));

    if (tab === 'paste') {
      tabPaste.classList.add('active');
      contentPaste.classList.add('active');
      flowHint.textContent = 'Pasted code is immediately analyzed and redirected to the Report page.';
      btnText.textContent = 'Analyse Code';
    } else if (tab === 'single') {
      tabSingle.classList.add('active');
      contentSingle.classList.add('active');
      flowHint.textContent = 'Single files are immediately analyzed and redirected to the Report page.';
      btnText.textContent = 'Analyse File';
    } else if (tab === 'zip') {
      tabZip.classList.add('active');
      contentZip.classList.add('active');
      flowHint.textContent = 'ZIP archives extract all files and redirect to the Files to Analyze page.';
      btnText.textContent = 'Upload & Extract ZIP';
    }
  }

  tabPaste.addEventListener('click', () => switchTab('paste'));
  tabSingle.addEventListener('click', () => switchTab('single'));
  tabZip.addEventListener('click', () => switchTab('zip'));
}

function setupDropzones() {
  // Single file dropzone
  const singleDropzone = document.getElementById('single-dropzone');
  const singleInput = document.getElementById('single-file-input');
  const singleInfo = document.getElementById('single-file-info');
  const singleName = document.getElementById('single-file-name');

  singleDropzone.addEventListener('click', () => singleInput.click());
  singleInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      selectedSingleFile = e.target.files[0];
      singleName.textContent = `Selected: ${selectedSingleFile.name} (${(selectedSingleFile.size / 1024).toFixed(1)} KB)`;
      singleInfo.style.display = 'inline-flex';
    }
  });

  // ZIP dropzone
  const zipDropzone = document.getElementById('zip-dropzone');
  const zipInput = document.getElementById('zip-file-input');
  const zipInfo = document.getElementById('zip-file-info');
  const zipName = document.getElementById('zip-file-name');

  zipDropzone.addEventListener('click', () => zipInput.click());
  zipInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      selectedZipFile = e.target.files[0];
      zipName.textContent = `Selected: ${selectedZipFile.name} (${(selectedZipFile.size / 1024).toFixed(1)} KB)`;
      zipInfo.style.display = 'inline-flex';
    }
  });

  // Drag & drop prevention & styling
  [singleDropzone, zipDropzone].forEach(dropzone => {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      });
    });
  });

  singleDropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      selectedSingleFile = e.dataTransfer.files[0];
      singleName.textContent = `Selected: ${selectedSingleFile.name} (${(selectedSingleFile.size / 1024).toFixed(1)} KB)`;
      singleInfo.style.display = 'inline-flex';
    }
  });

  zipDropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.name.endsWith('.zip')) {
        UI.showToast('Please drop a valid .zip archive file', 'error');
        return;
      }
      selectedZipFile = file;
      zipName.textContent = `Selected: ${selectedZipFile.name} (${(selectedZipFile.size / 1024).toFixed(1)} KB)`;
      zipInfo.style.display = 'inline-flex';
    }
  });
}

function setupActions() {
  const sampleBtn = document.getElementById('paste-sample-btn');
  const submitBtn = document.getElementById('analyse-submit-btn');

  // Sample code loader
  sampleBtn.addEventListener('click', () => {
    const sampleCode = `def calculate_discount(price: float, discount_percent: float) -> float:
    """
    Calculate the discounted price given the original price and discount percentage.
    Validates input ranges and prevents negative values.
    """
    if price < 0:
        raise ValueError("Price cannot be negative")
    if not (0 <= discount_percent <= 100):
        raise ValueError("Discount must be between 0 and 100")
        
    discount_amount = price * (discount_percent / 100.0)
    return round(price - discount_amount, 2)
`;
    document.getElementById('paste-code-content').value = sampleCode;
    document.getElementById('paste-filename').value = 'discount.py';
    document.getElementById('paste-language').value = 'Python';
    UI.showToast('Sample Python code loaded!', 'info');
  });

  // Main Submit (Analyse Button)
  submitBtn.addEventListener('click', async () => {
    // 1. Validation
    if (activeTab === 'paste') {
      const codeContent = document.getElementById('paste-code-content').value.trim();
      const language = document.getElementById('paste-language').value;
      const fileName = document.getElementById('paste-filename').value.trim();

      if (!codeContent) {
        UI.showToast('Please enter or paste your code first', 'error');
        return;
      }

      try {
        UI.setButtonLoading(submitBtn, true, 'Saving & Analyzing...');
        // Save code
        const savedCode = await API.pasteSourceCode(currentProjectId, codeContent, language, fileName);
        UI.showToast('Code saved. Running AI analysis...', 'info');

        // Run Analysis immediately
        await API.analyzeSourceCode(currentProjectId, savedCode.code_id);
        UI.showToast('Analysis completed! Opening Report...', 'success');

        setTimeout(() => {
          window.location.href = `report.html?projectId=${currentProjectId}&codeId=${savedCode.code_id}`;
        }, 800);
      } catch (err) {
        UI.showToast(err.message || 'Failed to analyze code', 'error');
        UI.setButtonLoading(submitBtn, false);
      }
    } else if (activeTab === 'single') {
      if (!selectedSingleFile) {
        UI.showToast('Please select a code file to upload', 'error');
        return;
      }

      try {
        UI.setButtonLoading(submitBtn, true, 'Uploading & Analyzing...');
        const savedCode = await API.uploadSingleFile(currentProjectId, selectedSingleFile);
        UI.showToast('File uploaded. Running AI analysis...', 'info');

        await API.analyzeSourceCode(currentProjectId, savedCode.code_id);
        UI.showToast('Analysis completed! Opening Report...', 'success');

        setTimeout(() => {
          window.location.href = `report.html?projectId=${currentProjectId}&codeId=${savedCode.code_id}`;
        }, 800);
      } catch (err) {
        UI.showToast(err.message || 'Failed to upload and analyze file', 'error');
        UI.setButtonLoading(submitBtn, false);
      }
    } else if (activeTab === 'zip') {
      if (!selectedZipFile) {
        UI.showToast('Please select a .zip archive to upload', 'error');
        return;
      }

      try {
        UI.setButtonLoading(submitBtn, true, 'Extracting & Processing ZIP...');
        const extractedFiles = await API.uploadZipFile(currentProjectId, selectedZipFile);
        const count = extractedFiles ? extractedFiles.length : 0;
        UI.showToast(`Extracted ${count} source files! Redirecting to Files...`, 'success');

        setTimeout(() => {
          window.location.href = `files.html?projectId=${currentProjectId}`;
        }, 800);
      } catch (err) {
        UI.showToast(err.message || 'Failed to extract ZIP archive', 'error');
        UI.setButtonLoading(submitBtn, false);
      }
    }
  });
}

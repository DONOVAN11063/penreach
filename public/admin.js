// ===== ADMIN DASHBOARD JAVASCRIPT =====

// ===== GLOBAL VARIABLES =====
let currentPage = 'dashboard';
let adminToken = localStorage.getItem('adminToken');
let adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');
let materials = [];
let grades = [];
let subjects = [];
let topics = [];
let folders = [];
let categories = [];

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    initializeEventListeners();
    loadDashboardData();
});

// ===== AUTHENTICATION =====
async function checkAuthentication() {
    const authCheck = document.getElementById('auth-check');
    const dashboard = document.getElementById('dashboard');
    
    if (!adminToken) {
        // No token, redirect to role selection
        window.location.href = '/admin-role-selection.html';
        return;
    }
    
    try {
        // Verify token with backend
        const response = await fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            adminInfo = data.admin;
            localStorage.setItem('adminInfo', JSON.stringify(adminInfo));
            showDashboard();
        } else {
            const data = await response.json();
            // Token invalid or expired, remove and redirect
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminInfo');
            
            // Show appropriate message based on error code
            if (data.code === 'TOKEN_EXPIRED') {
                console.log('Session expired. Please login again.');
            }
            
            window.location.href = '/admin-role-selection.html';
        }
    } catch (error) {
        console.error('Auth verification error:', error);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminInfo');
        window.location.href = '/admin-role-selection.html';
    }
}

function showDashboard() {
    document.getElementById('auth-check').style.display = 'none';
    document.getElementById('dashboard').style.display = 'flex';
    document.getElementById('admin-username').textContent = adminInfo.username || 'Admin';
    
    // Display the selected admin role
    const selectedRole = localStorage.getItem('selectedAdminRole');
    const roleElement = document.getElementById('admin-role');
    if (roleElement && selectedRole) {
        const roleText = selectedRole === 'student-admin' ? 'Student Admin' : 'Teachers Admin';
        roleElement.textContent = roleText;
    }
}

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            if (page) {
                navigateToPage(page);
            }
        });
    });
    
    // Sidebar toggle
    document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', refreshCurrentPage);
    
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            if (tab) {
                switchTab(tab);
            }
        });
    });
    
    // Form submissions
    initializeForms();
    
    // Modal controls
    initializeModals();
}

function initializeForms() {
    // Documents form
    const documentsForm = document.getElementById('documents-form');
    if (documentsForm) {
        documentsForm.addEventListener('submit', handleDocumentUpload);
        setupFormDependencies('document');
        setupDocumentFormCascading();
        
        // Add file selection event listener
        const fileInput = document.getElementById('doc-file');
        if (fileInput) {
            fileInput.addEventListener('change', handleFileSelection);
        }
    }
    
    // Videos form
    const videosForm = document.getElementById('videos-form');
    if (videosForm) {
        videosForm.addEventListener('submit', handleVideoUpload);
        setupFormDependencies('video');
    }
    
    // Quizzes form
    const quizzesForm = document.getElementById('quizzes-form');
    if (quizzesForm) {
        quizzesForm.addEventListener('submit', handleQuizUpload);
        setupFormDependencies('quiz');
        
        // Add initial question
        addQuizQuestion();
        
        // Add question button listener
        const addQuestionBtn = document.getElementById('add-question');
        if (addQuestionBtn) {
            addQuestionBtn.addEventListener('click', addQuizQuestion);
        }
    }
}

function initializeModals() {
    // Remove all existing event listeners first
    const modalOverlay = document.getElementById('modal-overlay');
    const modalClose = document.querySelector('.modal-close');
    const modalCancel = document.querySelector('.modal-cancel');
    const editForm = document.getElementById('edit-form');
    
    // Clone nodes to remove all event listeners
    if (modalOverlay) {
        const newOverlay = modalOverlay.cloneNode(true);
        modalOverlay.parentNode.replaceChild(newOverlay, modalOverlay);
    }
    
    if (modalClose) {
        const newClose = modalClose.cloneNode(true);
        modalClose.parentNode.replaceChild(newClose, modalClose);
    }
    
    if (modalCancel) {
        const newCancel = modalCancel.cloneNode(true);
        modalCancel.parentNode.replaceChild(newCancel, modalCancel);
    }
    
    if (editForm) {
        const newForm = editForm.cloneNode(true);
        editForm.parentNode.replaceChild(newForm, editForm);
    }
    
    // Now add fresh event listeners
    setTimeout(() => {
        const freshModalOverlay = document.getElementById('modal-overlay');
        const freshModalClose = document.querySelector('.modal-close');
        const freshModalCancel = document.querySelector('.modal-cancel');
        const freshEditForm = document.getElementById('edit-form');
        
        if (freshModalClose) {
            freshModalClose.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                closeModal();
            });
        }
        
        if (freshModalCancel) {
            freshModalCancel.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                closeModal();
            });
        }
        
        if (freshModalOverlay) {
            freshModalOverlay.addEventListener('click', function(e) {
                if (e.target === freshModalOverlay) {
                    closeModal();
                }
            });
        }
        
        if (freshEditForm) {
            freshEditForm.addEventListener('submit', handleModalSubmit);
        }
    }, 100);
}

async function handleModalSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Modal form submitted');
    
    const formData = new FormData(e.target);
    const action = formData.get('action');
    
    if (action === 'add') {
        await handleAddItem(formData);
    } else {
        await handleEditItem(formData);
    }
    
    // Only close modal after successful submission
    setTimeout(() => {
        closeModal();
    }, 500);
}

async function handleAddItem(formData) {
    const type = getCurrentModalType();
    let endpoint, data;
    
    // Determine targetAudience based on admin role
    const selectedRole = localStorage.getItem('selectedAdminRole');
    const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
    
    switch (type) {
        case 'grade':
            endpoint = '/api/content/grades';
            data = {
                value: formData.get('value'),
                phase: formData.get('phase'),
                targetAudience: targetAudience
            };
            break;
        case 'category':
            endpoint = '/api/content/categories';
            data = {
                name: formData.get('name'),
                kind: formData.get('kind'),
                phase: formData.get('phase'),
                grade: formData.get('grade'),
                description: formData.get('description'),
                color: formData.get('color'),
                icon: formData.get('icon'),
                order: formData.get('order'),
                category: formData.get('category'),
                targetAudience: targetAudience
            };
            break;
        case 'subject':
            endpoint = '/api/content/subjects';
            data = {
                name: formData.get('name'),
                icon: formData.get('icon'),
                phase: formData.get('phase'),
                targetAudience: targetAudience
            };
            break;
        case 'topic':
            endpoint = '/api/content/topics';
            data = {
                name: formData.get('name'),
                description: formData.get('description'),
                subject: formData.get('subject'),
                targetAudience: targetAudience
            };
            break;
        case 'folder':
            endpoint = '/api/folders';
            data = {
                name: formData.get('name'),
                description: formData.get('description'),
                order: formData.get('order') || 0,
                targetAudience: targetAudience
            };
            break;
        default:
            showToast('error', 'Error', 'Unknown item type');
            return;
    }
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('success', 'Success', `${type.charAt(0).toUpperCase() + type.slice(1)} added successfully`);
            await loadPageData(currentPage);
        } else {
            const error = await response.json();
            showToast('error', 'Error', error.error || 'Failed to add item');
        }
    } catch (error) {
        console.error('Add item error:', error);
        showToast('error', 'Error', 'Network error during add');
    }
}

function getCurrentModalType() {
    const modalTitle = document.getElementById('modal-title');
    if (!modalTitle) return null;
    
    const title = modalTitle.textContent.toLowerCase();
    if (title.includes('grade')) return 'grade';
    if (title.includes('subject')) return 'subject';
    if (title.includes('topic')) return 'topic';
    if (title.includes('folder')) return 'folder';
    
    return null;
}

// ===== NAVIGATION =====
function navigateToPage(page) {
    // Update active nav
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    
    // Update page content
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    document.getElementById(`${page}-page`).classList.add('active');
    
    // Update header
    updatePageHeader(page);
    
    // Load page data
    loadPageData(page);
    
    currentPage = page;
}

function updatePageHeader(page) {
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    
    const pageHeaders = {
        dashboard: { title: 'Dashboard', subtitle: 'Welcome to your STEAM learning portal management system' },
        materials: { title: 'Materials', subtitle: 'Manage all your STEAM learning materials in one place' },
        documents: { title: 'Documents', subtitle: 'Upload and organize PDF documents and text materials' },
        videos: { title: 'Videos', subtitle: 'Upload and organize video content and multimedia resources' },
        quizzes: { title: 'Quizzes', subtitle: 'Create and manage interactive quizzes for assessment' },
        'content-settings': { title: 'Content Settings', subtitle: 'Manage grades, subjects, and subcategories for your materials' },
        folders: { title: 'Folders', subtitle: 'Organize your materials into folders for better management' },
        analytics: { title: 'Analytics', subtitle: 'Monitor system usage, content performance, and engagement metrics' },
        students: { title: 'Students', subtitle: 'Share the public portal link with students for material access' }
    };
    
    const header = pageHeaders[page];
    if (header) {
        pageTitle.textContent = header.title;
        pageSubtitle.textContent = header.subtitle;
    }
}

async function loadPageData(page) {
    switch (page) {
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'materials':
            await loadMaterials();
            break;
        case 'documents':
            await loadDocuments();
            break;
        case 'videos':
            await loadVideos();
            break;
        case 'quizzes':
            await loadQuizzes();
            break;
        case 'content-settings':
            await loadContentSettings();
            break;
        case 'folders':
            await loadFolders();
            break;
        case 'analytics':
            await loadAnalytics();
            break;
        case 'students':
            loadStudentPortal();
            break;
    }
}

// ===== DASHBOARD DATA =====
async function loadDashboardData() {
    try {
        const selectedRole = localStorage.getItem('selectedAdminRole');
        const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        
        // Load materials stats
        const documentsResponse = await fetch(`/api/documents?targetAudience=${targetAudience}`);
        const documentsData = await documentsResponse.json();
        
        const videosResponse = await fetch(`/api/videos?targetAudience=${targetAudience}`);
        const videosData = await videosResponse.json();
        
        const quizzesResponse = await fetch(`/api/quizzes?targetAudience=${targetAudience}`);
        const quizzesData = await quizzesResponse.json();
        
        const materialsData = [...documentsData, ...videosData, ...quizzesData];
        
        // Update stats
        const stats = calculateStats(materialsData);
        updateDashboardStats(stats);
        
        // Load recent uploads
        updateRecentUploads(materialsData);
        
        // Update charts
        updateCharts(materialsData);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('error', 'Error', 'Failed to load dashboard data');
    }
}

function calculateStats(materials) {
    const stats = {
        total: materials.length,
        documents: materials.filter(m => m.type === 'document').length,
        videos: materials.filter(m => m.type === 'video').length,
        quizzes: materials.filter(m => m.type === 'quiz').length
    };
    
    return stats;
}

function updateDashboardStats(stats) {
    document.getElementById('total-materials').textContent = stats.total;
    document.getElementById('total-documents').textContent = stats.documents;
    document.getElementById('total-videos').textContent = stats.videos;
    document.getElementById('total-quizzes').textContent = stats.quizzes;
}

function updateRecentUploads(materials) {
    const recentUploads = materials
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10);
    
    const container = document.getElementById('recent-uploads');
    container.innerHTML = '';
    
    if (recentUploads.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No recent uploads</p>';
        return;
    }
    
    recentUploads.forEach(material => {
        const item = createRecentUploadItem(material);
        container.appendChild(item);
    });
}

function createRecentUploadItem(material) {
    const div = document.createElement('div');
    div.className = 'activity-item';
    
    const icon = getTypeIcon(material.type);
    const timeAgo = getTimeAgo(new Date(material.createdAt));
    
    div.innerHTML = `
        <div class="activity-icon">
            <i class="fas ${icon}"></i>
        </div>
        <div class="activity-details">
            <div class="activity-title">${material.title}</div>
            <div class="activity-time">${timeAgo}</div>
        </div>
    `;
    
    return div;
}

function getTypeIcon(type) {
    const icons = {
        document: 'fa-file-alt',
        video: 'fa-video',
        quiz: 'fa-question-circle'
    };
    return icons[type] || 'fa-folder';
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    
    return date.toLocaleDateString();
}

function setupDocumentFormCascading() {
    const phaseSelect = document.getElementById('doc-phase');
    const gradeSelect = document.getElementById('doc-grade');
    const folderSelect = document.getElementById('doc-folder');
    
    if (phaseSelect && gradeSelect) {
        // Setup cascading for phase → grade
        phaseSelect.addEventListener('change', async () => {
            const selectedPhase = phaseSelect.value;
            if (selectedPhase) {
                await loadGradesByPhase(selectedPhase, gradeSelect);
                // Clear grade selection
                gradeSelect.value = '';
            } else {
                // Clear grades if no phase selected
                gradeSelect.innerHTML = '<option value="">Select Grade</option>';
            }
        });
    }
    
    // Don't load folders initially - they will be loaded based on topic selection
}

async function loadFoldersForDropdown(folderSelect, filters = null) {
    try {
        const selectedRole = localStorage.getItem('selectedAdminRole');
        const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        const params = new URLSearchParams({ targetAudience });
        const folderFilters = typeof filters === 'string' ? { topic: filters } : (filters || {});

        Object.entries(folderFilters).forEach(([key, value]) => {
            if (value) {
                params.append(key, value);
            }
        });

        const url = `/api/folders?${params.toString()}`;
        const filterLabel = Object.entries(folderFilters)
            .filter(([, value]) => value)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ') || 'all';

        if (!folderSelect) {
            return;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const folders = await response.json();
        
        // Clear existing options
        folderSelect.innerHTML = '<option value="">Select Folder</option>';
        
        // Add folder options
        folders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder._id || folder.id;
            option.textContent = folder.name;
            folderSelect.appendChild(option);
        });
        
        console.log(`Loaded ${folders.length} folders for ${filterLabel}`);
    } catch (error) {
        console.error('Error loading folders:', error);
        folderSelect.innerHTML = '<option value="">Error loading folders</option>';
    }
}

// Global chart instances to prevent multiple charts
let activityChartInstance = null;
let distributionChartInstance = null;
let uploadTrendsChartInstance = null;
let contentCategoriesChartInstance = null;
let gradeDistributionChartInstance = null;
let subjectPopularityChartInstance = null;

function updateCharts(materials) {
    // Activity chart
    const activityCtx = document.getElementById('activity-chart');
    if (activityCtx) {
        // Destroy existing chart if it exists
        if (activityChartInstance) {
            activityChartInstance.destroy();
        }
        
        const activityData = getActivityChartData(materials);
        activityChartInstance = new Chart(activityCtx, {
            type: 'line',
            data: activityData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                resizeDelay: 100,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 0
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            precision: 0
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            }
        });
    }
    
    // Distribution chart
    const distributionCtx = document.getElementById('distribution-chart');
    if (distributionCtx) {
        // Destroy existing chart if it exists
        if (distributionChartInstance) {
            distributionChartInstance.destroy();
        }
        
        const distributionData = getDistributionChartData(materials);
        distributionChartInstance = new Chart(distributionCtx, {
            type: 'doughnut',
            data: distributionData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                resizeDelay: 100,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

function getActivityChartData(materials) {
    const last7Days = [];
    const counts = [];
    
    // Generate last 7 days with consistent date format
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0); // Normalize to start of day
        const dateStr = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
        
        last7Days.push(dateStr);
        counts.push(0);
    }
    
    // Count materials by date
    if (materials && Array.isArray(materials)) {
        materials.forEach(material => {
            try {
                if (material.createdAt) {
                    const materialDate = new Date(material.createdAt);
                    materialDate.setHours(0, 0, 0, 0); // Normalize to start of day
                    const dateStr = materialDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                    });
                    const index = last7Days.indexOf(dateStr);
                    if (index !== -1) {
                        counts[index]++;
                    }
                }
            } catch (error) {
                console.warn('Error processing material date:', error);
            }
        });
    }
    
    return {
        labels: last7Days,
        datasets: [{
            label: 'Uploads',
            data: counts,
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#667eea',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4
        }]
    };
}

function getDistributionChartData(materials) {
    const types = ['document', 'video', 'quiz'];
    const counts = types.map(type => 
        materials.filter(m => m.type === type).length
    );
    
    return {
        labels: ['Documents', 'Videos', 'Quizzes'],
        datasets: [{
            data: counts,
            backgroundColor: ['#667eea', '#f093fb', '#4facfe']
        }]
    };
}

// ===== MATERIALS MANAGEMENT =====
async function loadMaterials() {
    try {
        const selectedRole = localStorage.getItem('selectedAdminRole');
        const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        const response = await fetch(`/api/materials?targetAudience=${targetAudience}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        materials = await response.json();
        
        displayMaterials(materials);
        setupMaterialFilters();
        populateCategoryFilter();
        
    } catch (error) {
        console.error('Error loading materials:', error);
        showToast('error', 'Error', 'Failed to load materials');
    }
}

function displayMaterials(materialsToDisplay) {
    const grid = document.getElementById('materials-grid');
    grid.innerHTML = '';
    
    if (materialsToDisplay.length === 0) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><h3>No materials found</h3><p>Start by uploading your first material</p></div>';
        return;
    }
    
    materialsToDisplay.forEach(material => {
        const card = createMaterialCard(material);
        grid.appendChild(card);
    });
}

function createMaterialCard(material) {
    const div = document.createElement('div');
    div.className = 'material-item';
    
    const icon = getTypeIcon(material.type);
    const timeAgo = getTimeAgo(new Date(material.createdAt));
    
    div.innerHTML = `
        <div class="material-preview">
            <i class="fas ${icon}"></i>
        </div>
        <div class="material-content">
            <div class="material-title">${material.title}</div>
            <div class="material-description">${material.description || 'No description available'}</div>
            <div class="material-meta">
                <span>${material.type}</span>
                <span>${timeAgo}</span>
            </div>
            <div class="material-actions">
                <button class="btn btn-primary btn-small" onclick="viewMaterial('${material._id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-secondary btn-small" onclick="editMaterial('${material._id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger btn-small" onclick="deleteMaterial('${material._id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
    
    return div;
}

function setupMaterialFilters() {
    const typeFilter = document.getElementById('type-filter');
    const phaseFilter = document.getElementById('phase-filter');
    const gradeFilter = document.getElementById('grade-filter');
    const categoryFilter = document.getElementById('category-filter');
    
    [typeFilter, phaseFilter, gradeFilter, categoryFilter].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', applyMaterialFilters);
        }
    });
}

function populateCategoryFilter() {
    const categoryFilter = document.getElementById('category-filter');
    if (!categoryFilter) return;
    
    // Get unique subjects from materials
    const subjects = [...new Set(materials.map(m => m.subject).filter(Boolean))];
    
    categoryFilter.innerHTML = '<option value="">All Subjects</option>';
    subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        categoryFilter.appendChild(option);
    });
}

function applyMaterialFilters() {
    const typeFilter = document.getElementById('type-filter').value;
    const phaseFilter = document.getElementById('phase-filter').value;
    const gradeFilter = document.getElementById('grade-filter').value;
    const categoryFilter = document.getElementById('category-filter').value;
    
    let filtered = materials;
    
    if (typeFilter) {
        filtered = filtered.filter(m => m.type === typeFilter);
    }
    
    if (phaseFilter) {
        filtered = filtered.filter(m => m.phase === phaseFilter);
    }
    
    if (gradeFilter) {
        filtered = filtered.filter(m => m.grade === gradeFilter);
    }
    
    if (categoryFilter) {
        filtered = filtered.filter(m => m.subject === categoryFilter);
    }
    
    displayMaterials(filtered);
}

// ===== DOCUMENT UPLOAD =====

// Store selected files globally for management
let selectedFiles = [];

// File selection handler
function handleFileSelection(e) {
    const fileInput = e.target;
    const files = Array.from(fileInput.files);
    
    // Add new files to selected files array
    files.forEach(file => {
        if (!selectedFiles.find(f => f.name === file.name && f.size === file.size)) {
            selectedFiles.push(file);
        }
    });
    
    updateSelectedFilesDisplay();
}

// Update selected files display
function updateSelectedFilesDisplay() {
    const container = document.getElementById('selected-files-container');
    const list = document.getElementById('selected-files-list');
    
    if (selectedFiles.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    list.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'selected-file-item';
        
        const fileInfo = document.createElement('div');
        fileInfo.className = 'selected-file-info';
        
        const icon = document.createElement('i');
        icon.className = 'fas fa-file-pdf selected-file-icon';
        
        const name = document.createElement('span');
        name.className = 'selected-file-name';
        name.textContent = file.name;
        
        const size = document.createElement('span');
        size.className = 'selected-file-size';
        size.textContent = formatFileSize(file.size);
        
        fileInfo.appendChild(icon);
        fileInfo.appendChild(name);
        fileInfo.appendChild(size);
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-file-btn';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.onclick = () => removeFile(index);
        
        fileItem.appendChild(fileInfo);
        fileItem.appendChild(removeBtn);
        list.appendChild(fileItem);
    });
}

// Remove file from selection
function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateSelectedFilesDisplay();
    
    // Update file input
    const fileInput = document.getElementById('doc-file');
    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    fileInput.files = dt.files;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function handleDocumentUpload(e) {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
        showToast('error', 'Error', 'Please select at least one file');
        return;
    }
    
    const formData = new FormData();
    const phaseSelect = document.getElementById('doc-phase');
    const gradeSelect = document.getElementById('doc-grade');
    const folderSelect = document.getElementById('doc-folder');
    const termSelect = document.getElementById('doc-term');
    const subjectSelect = document.getElementById('doc-subject');
    const topicSelect = document.getElementById('doc-topic');
    
    if (!phaseSelect.value || !gradeSelect.value || !folderSelect.value || !termSelect.value) {
        showToast('error', 'Error', 'Please select phase, grade, folder, and term');
        return;
    }
    
    // Add selected files to FormData
    selectedFiles.forEach(file => {
        formData.append('files', file);
    });
    
    // Add other fields
    formData.append('type', 'document');
    formData.append('title', selectedFiles[0].name.replace(/\.[^/.]+$/, ''));
    formData.append('phase', phaseSelect.value);
    formData.append('grade', gradeSelect.value);
    formData.append('folderId', folderSelect.value);
    formData.append('term', termSelect.value);
    
    // Add targetAudience from localStorage based on selected admin role
    const selectedRole = localStorage.getItem('selectedAdminRole');
    const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
    formData.append('targetAudience', targetAudience);
    
    // Add optional fields if selected
    if (subjectSelect.value) formData.append('subject', subjectSelect.value);
    if (topicSelect.value) formData.append('topic', topicSelect.value);
    
    try {
        const response = await fetch('/api/documents/bulk', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('success', 'Success', `Successfully uploaded ${result.successful} files`);
            e.target.reset();
            selectedFiles = []; // Clear selected files
            updateSelectedFilesDisplay(); // Hide selected files display
            await loadDocuments();
        } else {
            showToast('error', 'Error', result.error || 'Upload failed');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showToast('error', 'Error', 'Network error during upload');
    }
}

async function loadDocuments() {
    try {
        const selectedRole = localStorage.getItem('selectedAdminRole');
        const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        const response = await fetch(`/api/documents?targetAudience=${targetAudience}`);
        const documents = await response.json();
        
        const grid = document.getElementById('documents-list');
        grid.innerHTML = '';
        
        if (documents.length === 0) {
            grid.innerHTML = '<div class="empty-state"><i class="fas fa-file-alt"></i><h3>No documents found</h3><p>Upload your first document to get started</p></div>';
            return;
        }
        
        documents.forEach(doc => {
            const card = createMaterialCard(doc);
            grid.appendChild(card);
        });
        
    } catch (error) {
        console.error('Error loading documents:', error);
        showToast('error', 'Error', 'Failed to load documents');
    }
}

// ===== VIDEO UPLOAD =====
async function handleVideoUpload(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const fileInput = document.getElementById('vid-file');
    const titleInput = document.getElementById('vid-title');
    const descriptionInput = document.getElementById('vid-description');
    const urlInput = document.getElementById('vid-url');
    const phaseSelect = document.getElementById('vid-phase');
    const gradeSelect = document.getElementById('vid-grade');
    const folderSelect = document.getElementById('vid-folder');
    const termSelect = document.getElementById('vid-term');
    const subjectSelect = document.getElementById('vid-subject');
    const topicSelect = document.getElementById('vid-topic');
    
    if (!phaseSelect.value || !gradeSelect.value || !folderSelect.value || !termSelect.value || !subjectSelect.value || !topicSelect.value) {
        showToast('error', 'Error', 'Please select phase, grade, folder, term, subject, and topic');
        return;
    }
    
    // Add file if selected
    if (fileInput.files.length > 0) {
        formData.append('file', fileInput.files[0]);
        
        // Display selected file name
        const fileName = fileInput.files[0].name;
        console.log('Selected video file:', fileName);
    }
    
    // Add other fields
    formData.append('title', titleInput.value || fileName || 'Untitled Video');
    formData.append('description', descriptionInput.value || '');
    formData.append('url', urlInput.value || '');
    formData.append('type', 'video');
    formData.append('phase', phaseSelect.value);
    formData.append('grade', gradeSelect.value);
    formData.append('folderId', folderSelect.value);
    formData.append('term', termSelect.value);
    formData.append('subject', subjectSelect.value);
    formData.append('topic', topicSelect.value);
    
    // Add targetAudience from localStorage
    const selectedRole = localStorage.getItem('selectedAdminRole');
    const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
    formData.append('targetAudience', targetAudience);
    
    try {
        const response = await fetch('/api/videos', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('success', 'Success', 'Video uploaded successfully');
            e.target.reset();
            await loadVideos();
        } else {
            showToast('error', 'Error', result.error || 'Upload failed');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showToast('error', 'Error', 'Network error during upload');
    }
}

async function loadVideos() {
    try {
        const selectedRole = localStorage.getItem('selectedAdminRole');
        const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        const response = await fetch(`/api/videos?targetAudience=${targetAudience}`);
        const videos = await response.json();
        
        const grid = document.getElementById('videos-list');
        grid.innerHTML = '';
        
        if (videos.length === 0) {
            grid.innerHTML = '<div class="empty-state"><i class="fas fa-video"></i><h3>No videos found</h3><p>Upload your first video to get started</p></div>';
            return;
        }
        
        videos.forEach(video => {
            const card = createMaterialCard(video);
            grid.appendChild(card);
        });
        
    } catch (error) {
        console.error('Error loading videos:', error);
        showToast('error', 'Error', 'Failed to load videos');
    }
}

// ===== QUIZ UPLOAD =====
async function handleQuizUpload(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const titleInput = document.getElementById('quiz-title');
    const descriptionInput = document.getElementById('quiz-description');
    const phaseSelect = document.getElementById('quiz-phase');
    const gradeSelect = document.getElementById('quiz-grade');
    const categorySelect = document.getElementById('quiz-category');
    const subjectSelect = document.getElementById('quiz-subject');
    const termSelect = document.getElementById('quiz-term');
    const topicSelect = document.getElementById('quiz-topic');
    const folderSelect = document.getElementById('quiz-folder');
    const durationInput = document.getElementById('quiz-duration');
    
    if (!titleInput.value || !phaseSelect.value || !gradeSelect.value || !categorySelect.value || !subjectSelect.value || !termSelect.value || !topicSelect.value || !folderSelect.value) {
        showToast('error', 'Error', 'Please select phase, grade, category, subject, term, topic, and folder');
        return;
    }
    
    // Collect questions from the improved form
    const questions = collectQuizQuestions();
    if (questions.length === 0) {
        showToast('error', 'Error', 'Please add at least one question');
        return;
    }
    
    formData.append('title', titleInput.value);
    formData.append('description', descriptionInput.value || '');
    formData.append('phase', phaseSelect.value);
    formData.append('grade', gradeSelect.value);
    formData.append('category', categorySelect.value);
    formData.append('subject', subjectSelect.value);
    formData.append('term', termSelect.value);
    formData.append('topic', topicSelect.value);
    formData.append('folderId', folderSelect.value);
    if (durationInput.value) {
        formData.append('duration', durationInput.value);
    }
    formData.append('questions', JSON.stringify(questions));
    
    // Ensure targetAudience is included from localStorage
    const selectedRole = localStorage.getItem('selectedAdminRole');
    const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
    if (!formData.has('targetAudience')) {
        formData.append('targetAudience', targetAudience);
    }
    
    try {
        const response = await fetch('/api/quizzes', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('success', 'Success', 'Quiz created successfully');
            e.target.reset();
            document.getElementById('questions-container').innerHTML = '';
            addQuizQuestion(); // Add initial question
            if (folderSelect) {
                folderSelect.innerHTML = '<option value="">Select Folder</option>';
            }
            await loadQuizzes();
        } else {
            showToast('error', 'Error', result.error || 'Quiz creation failed');
        }
    } catch (error) {
        console.error('Quiz creation error:', error);
        showToast('error', 'Error', 'Network error during quiz creation');
    }
}

// Collect quiz questions from the form
function collectQuizQuestions() {
    const questions = [];
    const questionItems = document.querySelectorAll('.quiz-question-item');
    
    questionItems.forEach((item, index) => {
        const questionText = item.querySelector('.quiz-question-input').value;
        const answerItems = item.querySelectorAll('.quiz-answer-item');
        const answers = [];
        let correctAnswer = 0;
        
        answerItems.forEach((answerItem, answerIndex) => {
            const answerText = answerItem.querySelector('.quiz-answer-input').value;
            const isCorrect = answerItem.querySelector('.quiz-correct-radio').checked;
            
            if (answerText.trim()) {
                answers.push(answerText.trim());
                if (isCorrect) {
                    correctAnswer = answerIndex;
                }
            }
        });
        
        if (questionText.trim() && answers.length >= 2) {
            questions.push({
                question: questionText.trim(),
                answers: answers,
                correctAnswer: correctAnswer
            });
        }
    });
    
    return questions;
}

// Add a new quiz question
function addQuizQuestion() {
    const container = document.getElementById('questions-container');
    const questionCount = container.querySelectorAll('.quiz-question-item').length + 1;
    
    const questionDiv = document.createElement('div');
    questionDiv.className = 'quiz-question-item';
    questionDiv.innerHTML = `
        <button type="button" class="quiz-remove-question" onclick="removeQuizQuestion(this)">
            <i class="fas fa-trash"></i>
        </button>
        <div class="quiz-question-header">
            <span class="quiz-question-number">Question ${questionCount}</span>
        </div>
        <input type="text" class="quiz-question-input" placeholder="Enter your question here..." required>
        <div class="quiz-answers-container">
            <div class="quiz-answer-item">
                <div class="quiz-answer-letter">A</div>
                <input type="text" class="quiz-answer-input" placeholder="Answer option A" required>
                <input type="radio" name="correct-${Date.now()}" class="quiz-correct-radio" value="0">
                <label class="quiz-correct-label">Correct</label>
                <button type="button" class="quiz-remove-answer" onclick="removeQuizAnswer(this)">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="quiz-answer-item">
                <div class="quiz-answer-letter">B</div>
                <input type="text" class="quiz-answer-input" placeholder="Answer option B" required>
                <input type="radio" name="correct-${Date.now()}" class="quiz-correct-radio" value="1">
                <label class="quiz-correct-label">Correct</label>
                <button type="button" class="quiz-remove-answer" onclick="removeQuizAnswer(this)">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
        <button type="button" class="quiz-add-answer" onclick="addQuizAnswer(this)">
            <i class="fas fa-plus"></i> Add Answer Option
        </button>
    `;
    
    container.appendChild(questionDiv);
    updateQuestionNumbers();
}

// Remove a quiz question
function removeQuizQuestion(button) {
    const questionItem = button.closest('.quiz-question-item');
    questionItem.remove();
    updateQuestionNumbers();
}

// Add an answer option to a question
function addQuizAnswer(button) {
    const answersContainer = button.previousElementSibling;
    const answerCount = answersContainer.querySelectorAll('.quiz-answer-item').length;
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    
    if (answerCount >= 6) {
        showToast('error', 'Error', 'Maximum 6 answer options allowed');
        return;
    }
    
    const questionItem = button.closest('.quiz-question-item');
    const radioName = questionItem.querySelector('.quiz-correct-radio').name;
    
    const answerDiv = document.createElement('div');
    answerDiv.className = 'quiz-answer-item';
    answerDiv.innerHTML = `
        <div class="quiz-answer-letter">${letters[answerCount]}</div>
        <input type="text" class="quiz-answer-input" placeholder="Answer option ${letters[answerCount]}" required>
        <input type="radio" name="${radioName}" class="quiz-correct-radio" value="${answerCount}">
        <label class="quiz-correct-label">Correct</label>
        <button type="button" class="quiz-remove-answer" onclick="removeQuizAnswer(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    answersContainer.appendChild(answerDiv);
}

// Remove an answer option
function removeQuizAnswer(button) {
    const answerItem = button.closest('.quiz-answer-item');
    const answersContainer = answerItem.parentElement;
    
    if (answersContainer.querySelectorAll('.quiz-answer-item').length <= 2) {
        showToast('error', 'Error', 'Minimum 2 answer options required');
        return;
    }
    
    answerItem.remove();
    updateAnswerLetters(answersContainer);
}

// Update answer letters after removal
function updateAnswerLetters(answersContainer) {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const answerItems = answersContainer.querySelectorAll('.quiz-answer-item');
    
    answerItems.forEach((item, index) => {
        const letterDiv = item.querySelector('.quiz-answer-letter');
        letterDiv.textContent = letters[index];
    });
}

// Update question numbers after removal
function updateQuestionNumbers() {
    const questionItems = document.querySelectorAll('.quiz-question-item');
    questionItems.forEach((item, index) => {
        const numberSpan = item.querySelector('.quiz-question-number');
        numberSpan.textContent = `Question ${index + 1}`;
    });
}

async function loadQuizzes() {
    try {
        const selectedRole = localStorage.getItem('selectedAdminRole');
        const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        const response = await fetch(`/api/quizzes?targetAudience=${targetAudience}`);
        const quizzes = await response.json();
        
        const grid = document.getElementById('quizzes-list');
        grid.innerHTML = '';
        
        if (quizzes.length === 0) {
            grid.innerHTML = '<div class="empty-state"><i class="fas fa-question-circle"></i><h3>No quizzes found</h3><p>Create your first quiz to get started</p></div>';
            return;
        }
        
        quizzes.forEach(quiz => {
            const card = createMaterialCard(quiz);
            grid.appendChild(card);
        });
        
    } catch (error) {
        console.error('Error loading quizzes:', error);
        showToast('error', 'Error', 'Failed to load quizzes');
    }
}

// ===== CONTENT SETTINGS =====
async function loadContentSettings() {
    await Promise.all([
        loadGrades(),
        loadCategories(),
        loadSubjects(),
        loadTopics()
    ]);
}

async function loadGrades() {
    try {
        const selectedRole = localStorage.getItem('selectedAdminRole');
        const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        const response = await fetch(`/api/content/grades/with-counts?targetAudience=${targetAudience}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        grades = await response.json();
        
        displayGrades();
        setupGradeButtons();
    } catch (error) {
        console.error('Error loading grades:', error);
        showToast('error', 'Error', 'Failed to load grades');
    }
}

async function loadSubjects() {
    try {
        const selectedRole = localStorage.getItem('selectedAdminRole');
        const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        const response = await fetch(`/api/content/subjects?targetAudience=${targetAudience}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        subjects = await response.json();
        
        displaySubjects();
        setupSubjectButtons();
    } catch (error) {
        console.error('Error loading subjects:', error);
        showToast('error', 'Error', 'Failed to load subjects');
    }
}

async function loadTopics() {
    try {
        const selectedRole = localStorage.getItem('selectedAdminRole');
        const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        const response = await fetch(`/api/content/topics?targetAudience=${targetAudience}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        topics = await response.json();
        
        displayTopics();
        setupTopicButtons();
    } catch (error) {
        console.error('Error loading topics:', error);
        showToast('error', 'Error', 'Failed to load topics');
    }
}

function displayGrades() {
    const grid = document.getElementById('grades-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    grades.forEach(grade => {
        const item = createGradeItem(grade);
        grid.appendChild(item);
    });
}

async function loadCategories() {
    try {
        const selectedRole = localStorage.getItem('selectedAdminRole');
        const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        const response = await fetch(`/api/content/categories?targetAudience=${targetAudience}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        categories = await response.json();
        
        displayCategories(categories);
        setupCategoryButtons();
    } catch (error) {
        console.error('Error loading categories:', error);
        showToast('error', 'Error', 'Failed to load categories');
        // Display empty state on error
        displayCategories([]);
    }
}

function createGradeItem(grade) {
    const div = document.createElement('div');
    div.className = 'grade-item grade-card';
    div.dataset.gradeId = grade._id;
    
    const counts = grade.counts || { categories: 0, subjects: 0, topics: 0, folders: 0 };
    
    div.innerHTML = `
        <div class="grade-card-main" onclick="toggleGradeDetails('${grade._id}')">
            <div class="grade-card-info">
                <div class="grade-card-title">
                    <i class="fas fa-chevron-down grade-card-chevron" id="chevron-${grade._id}"></i>
                    <h3>${grade.value}</h3>
                    <span class="grade-card-phase">${grade.phase}</span>
                </div>
                <div class="grade-card-stats">
                    <div class="stat-item">
                        <i class="fas fa-folder"></i>
                        <span>${counts.categories}</span>
                        <small>Categories</small>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-book"></i>
                        <span>${counts.subjects}</span>
                        <small>Subjects</small>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-list"></i>
                        <span>${counts.topics}</span>
                        <small>Topics</small>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-folder-open"></i>
                        <span>${counts.folders}</span>
                        <small>Folders</small>
                    </div>
                </div>
            </div>
        </div>
        <div class="grade-card-details" id="grade-details-${grade._id}" style="display: none;">
            <div class="grade-card-actions-row">
                <button class="btn btn-primary btn-small" onclick="openAddModalForGrade('category', '${grade._id}')">
                    <i class="fas fa-folder-plus"></i> Add Category
                </button>
                <button class="btn btn-primary btn-small" onclick="openAddModalForGrade('subject', '${grade._id}')">
                    <i class="fas fa-book-medical"></i> Add Subject
                </button>
                <button class="btn btn-primary btn-small" onclick="openAddModalForGrade('topic', '${grade._id}')">
                    <i class="fas fa-plus-circle"></i> Add Topic
                </button>
                <button class="btn btn-primary btn-small" onclick="openAddModalForGrade('folder', '${grade._id}')">
                    <i class="fas fa-folder-plus"></i> Add Folder
                </button>
                <button class="btn btn-secondary btn-small" onclick="editGrade('${grade._id}')">
                    <i class="fas fa-edit"></i> Edit Grade
                </button>
                <button class="btn btn-danger btn-small" onclick="deleteGrade('${grade._id}')">
                    <i class="fas fa-trash"></i> Delete Grade
                </button>
            </div>
            <div class="grade-card-items" id="grade-items-${grade._id}">
                <!-- Content will be loaded here when expanded -->
            </div>
        </div>
    `;
    
    return div;
}

function displayCategories(categories) {
    const grid = document.getElementById('categories-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (categories && categories.length > 0) {
        categories.forEach(category => {
            const item = createCategoryItem(category);
            grid.appendChild(item);
        });
    } else {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-folder"></i><h3>No categories found</h3><p>Add your first category to get started</p></div>';
    }
}

function setupCategoryButtons() {
    const addCategoryBtn = document.getElementById('add-category-btn');
    console.log('Add category button found:', addCategoryBtn);
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => {
            console.log('Add category button clicked');
            openAddModal('category');
        });
    } else {
        console.error('Add category button not found');
    }
    
    // Setup category filters with cascading
    const phaseFilter = document.getElementById('category-phase-filter');
    const gradeFilter = document.getElementById('category-grade-filter');
    const clearFiltersBtn = document.getElementById('clear-category-filters');
    
    if (phaseFilter && gradeFilter) {
        // Setup cascading for filters
        phaseFilter.addEventListener('change', async () => {
            const selectedPhase = phaseFilter.value;
            if (selectedPhase) {
                await loadGradesByPhase(selectedPhase, gradeFilter);
                // Clear grade filter and apply filters
                gradeFilter.value = '';
                filterCategories();
            } else {
                // Clear grades and apply filters
                gradeFilter.innerHTML = '<option value="">All Grades</option>';
                filterCategories();
            }
        });
        
        gradeFilter.addEventListener('change', filterCategories);
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearCategoryFilters);
    }
}

function editCategory(categoryId) {
    const category = categories.find(c => c._id === categoryId);
    if (!category) {
        showToast('error', 'Error', 'Category not found');
        return;
    }
    
    openEditModal('category', category);
}

function createCategoryItem(category) {
    const div = document.createElement('div');
    div.className = 'category-item';
    
    div.innerHTML = `
        <div class="item-header">
            <div class="item-title">${category.name}</div>
            <div class="item-actions">
                <button class="btn btn-secondary btn-small" onclick="editCategory('${category._id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-small" onclick="deleteCategory('${category._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="item-meta">
            <span>Phase: ${category.phase || 'All'}</span>
            <span>Description: ${category.description || 'No description'}</span>
        </div>
    `;
    
    return div;
}

function displaySubjects() {
    const grid = document.getElementById('subjects-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    subjects.forEach(subject => {
        const item = createSubjectItem(subject);
        grid.appendChild(item);
    });
}

function createSubjectItem(subject) {
    const div = document.createElement('div');
    div.className = 'subject-item';
    
    div.innerHTML = `
        <div class="item-header">
            <div class="item-title">${subject.icon} ${subject.name}</div>
            <div class="item-actions">
                <button class="btn btn-secondary btn-small" onclick="editSubject('${subject._id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-small" onclick="deleteSubject('${subject._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="item-meta">
            <span>Phase: ${subject.phase}</span>
            <span>Grade: ${subject.grade || 'All'}</span>
        </div>
    `;
    
    return div;
}

function displayTopics() {
    const grid = document.getElementById('topics-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    topics.forEach(topic => {
        const item = createTopicItem(topic);
        grid.appendChild(item);
    });
}

function createTopicItem(topic) {
    const div = document.createElement('div');
    div.className = 'topic-item';
    
    div.innerHTML = `
        <div class="item-header">
            <div class="item-title">${topic.name}</div>
            <div class="item-actions">
                <button class="btn btn-secondary btn-small" onclick="editTopic('${topic._id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-small" onclick="deleteTopic('${topic._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="item-meta">
            <span>Subject: ${topic.subject?.name || 'Unknown'}</span>
            <span>Grade: ${topic.grade?.value || 'All'}</span>
        </div>
    `;
    
    return div;
}

function setupGradeButtons() {
    const addGradeBtn = document.getElementById('add-grade-btn');
    console.log('Add grade button found:', addGradeBtn);
    if (addGradeBtn) {
        addGradeBtn.addEventListener('click', () => {
            console.log('Add grade button clicked');
            openAddModal('grade');
        });
    } else {
        console.error('Add grade button not found');
    }
}

function toggleGradeDetails(gradeId) {
    const details = document.getElementById(`grade-details-${gradeId}`);
    const chevron = document.getElementById(`chevron-${gradeId}`);
    
    if (details.style.display === 'none') {
        details.style.display = 'block';
        chevron.classList.remove('fa-chevron-down');
        chevron.classList.add('fa-chevron-up');
        loadGradeContent(gradeId);
    } else {
        details.style.display = 'none';
        chevron.classList.remove('fa-chevron-up');
        chevron.classList.add('fa-chevron-down');
    }
}

async function loadGradeContent(gradeId) {
    const itemsContainer = document.getElementById(`grade-items-${gradeId}`);
    if (!itemsContainer) return;
    
    itemsContainer.innerHTML = '<div class="loading">Loading content...</div>';
    
    try {
        const selectedRole = localStorage.getItem('selectedAdminRole');
        const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        
        const [categories, subjects, topics, folders] = await Promise.all([
            fetch(`/api/content/categories?grade=${gradeId}&targetAudience=${targetAudience}`).then(r => r.json()),
            fetch(`/api/content/subjects?grade=${gradeId}&targetAudience=${targetAudience}`).then(r => r.json()),
            fetch(`/api/topics?grade=${gradeId}&targetAudience=${targetAudience}`).then(r => r.json()),
            fetch(`/api/folders?grade=${gradeId}&targetAudience=${targetAudience}`).then(r => r.json())
        ]);
        
        itemsContainer.innerHTML = `
            <div class="grade-content-section">
                <h4>Categories (${categories.length})</h4>
                ${categories.length > 0 ? categories.map(c => `
                    <div class="mini-item">
                        ${c.name}
                        <button class="btn btn-secondary btn-mini" onclick="editCategory('${c._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                `).join('') : '<p class="empty-text">No categories</p>'}
            </div>
            <div class="grade-content-section">
                <h4>Subjects (${subjects.length})</h4>
                ${subjects.length > 0 ? subjects.map(s => `
                    <div class="mini-item">
                        ${s.icon} ${s.name}
                        <button class="btn btn-secondary btn-mini" onclick="editSubject('${s._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                `).join('') : '<p class="empty-text">No subjects</p>'}
            </div>
            <div class="grade-content-section">
                <h4>Topics (${topics.length})</h4>
                ${topics.length > 0 ? topics.map(t => `
                    <div class="mini-item">
                        ${t.name}
                        <button class="btn btn-secondary btn-mini" onclick="editTopic('${t._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                `).join('') : '<p class="empty-text">No topics</p>'}
            </div>
            <div class="grade-content-section">
                <h4>Folders (${folders.length})</h4>
                ${folders.length > 0 ? folders.map(f => `
                    <div class="mini-item">
                        ${f.name}
                        <button class="btn btn-secondary btn-mini" onclick="editFolder('${f._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                `).join('') : '<p class="empty-text">No folders</p>'}
            </div>
        `;
    } catch (error) {
        console.error('Error loading grade content:', error);
        itemsContainer.innerHTML = '<p class="error-text">Failed to load content</p>';
    }
}

function openAddModalForGrade(type, gradeId) {
    // Store the selected grade ID
    window.selectedGradeId = gradeId;
    openAddModal(type);
}

function setupSubjectButtons() {
    const addSubjectBtn = document.getElementById('add-subject-btn');
    console.log('Add subject button found:', addSubjectBtn);
    if (addSubjectBtn) {
        addSubjectBtn.addEventListener('click', () => {
            console.log('Add subject button clicked');
            openAddModal('subject');
        });
    } else {
        console.error('Add subject button not found');
    }
    
    // Setup subject filters with cascading
    const phaseFilter = document.getElementById('subject-phase-filter');
    const gradeFilter = document.getElementById('subject-grade-filter');
    const categoryFilter = document.getElementById('subject-category-filter');
    const clearFiltersBtn = document.getElementById('clear-subject-filters');
    
    if (phaseFilter && gradeFilter) {
        // Setup cascading for filters
        phaseFilter.addEventListener('change', async () => {
            const selectedPhase = phaseFilter.value;
            if (selectedPhase) {
                await loadGradesByPhase(selectedPhase, gradeFilter);
                // Clear grade filter and apply filters
                gradeFilter.value = '';
                filterSubjects();
            } else {
                // Clear grades and apply filters
                gradeFilter.innerHTML = '<option value="">All Grades</option>';
                filterSubjects();
            }
        });
        
        gradeFilter.addEventListener('change', filterSubjects);
    }
    
    if (categoryFilter) {
        // Populate category dropdown initially
        loadCategoriesForDropdown(categoryFilter);
        categoryFilter.addEventListener('change', filterSubjects);
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearSubjectFilters);
    }
}

function setupTopicButtons() {
    const addTopicBtn = document.getElementById('add-topic-btn');
    console.log('Add topic button found:', addTopicBtn);
    if (addTopicBtn) {
        addTopicBtn.addEventListener('click', () => {
            console.log('Add topic button clicked');
            openAddModal('topic');
        });
    } else {
        console.error('Add topic button not found');
    }
    
    // Setup topic filters with cascading
    const phaseFilter = document.getElementById('topic-phase-filter');
    const gradeFilter = document.getElementById('topic-grade-filter');
    const categoryFilter = document.getElementById('topic-category-filter');
    const subjectFilter = document.getElementById('topic-subject-filter');
    const termFilter = document.getElementById('topic-term-filter');
    const clearFiltersBtn = document.getElementById('clear-topic-filters');
    
    if (phaseFilter && gradeFilter) {
        // Setup cascading for filters
        phaseFilter.addEventListener('change', async () => {
            const selectedPhase = phaseFilter.value;
            if (selectedPhase) {
                await loadGradesByPhase(selectedPhase, gradeFilter);
                // Clear grade filter and apply filters
                gradeFilter.value = '';
                filterTopics();
            } else {
                // Clear grades and apply filters
                gradeFilter.innerHTML = '<option value="">All Grades</option>';
                filterTopics();
            }
        });
        
        gradeFilter.addEventListener('change', filterTopics);
    }
    
    if (categoryFilter && subjectFilter) {
        // Populate category dropdown initially
        loadCategoriesForDropdown(categoryFilter);
        
        // Setup cascading for category -> subject
        categoryFilter.addEventListener('change', async () => {
            const selectedCategory = categoryFilter.value;
            if (selectedCategory) {
                await loadSubjectsByCategory(selectedCategory, subjectFilter);
                // Clear subject filter and apply filters
                subjectFilter.value = '';
                filterTopics();
            } else {
                // Clear subjects and apply filters
                subjectFilter.innerHTML = '<option value="">All Subjects</option>';
                filterTopics();
            }
        });
        
        subjectFilter.addEventListener('change', filterTopics);
    }
    
    if (termFilter) {
        termFilter.addEventListener('change', filterTopics);
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearTopicFilters);
    }
}

function openAddModal(type) {
    console.log('Opening simple add modal for type:', type);
    
    // Use the simple modal instead
    const simpleModal = document.getElementById('simple-add-modal');
    const modalTitle = document.getElementById('simple-modal-title');
    const modalBody = document.getElementById('simple-modal-body');
    
    if (!simpleModal || !modalTitle || !modalBody) {
        console.error('Simple modal elements not found');
        showToast('error', 'Error', 'Modal elements not found');
        return;
    }
    
    modalTitle.textContent = `Add ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    
    // Generate form based on type
    const formHTML = generateSimpleForm(type);
    console.log('Generated form HTML:', formHTML);
    modalBody.innerHTML = formHTML;
    
    // Setup cascading dropdowns
    setupCascadingDropdowns(type);
    
    // Pre-select grade if adding from within a grade card
    if (window.selectedGradeId && type !== 'grade') {
        preselectGrade(window.selectedGradeId, type);
    }
    
    // Show the simple modal
    simpleModal.style.display = 'flex';
    
    console.log('Simple modal should now be visible');
}

async function preselectGrade(gradeId, type) {
    try {
        const selectedRole = localStorage.getItem('selectedAdminRole');
        const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        
        // Get the grade details
        const response = await fetch(`/api/content/grades?targetAudience=${targetAudience}`);
        const allGrades = await response.json();
        const selectedGrade = allGrades.find(g => g._id === gradeId);
        
        if (selectedGrade) {
            // Find the grade dropdown in the form
            const gradeDropdown = document.getElementById('simple-category-grade') || 
                                 document.getElementById('simple-subject-grade') ||
                                 document.getElementById('simple-topic-grade') ||
                                 document.getElementById('simple-folder-grade');
            
            if (gradeDropdown) {
                // Populate the grade dropdown with all grades
                gradeDropdown.innerHTML = '<option value="">Select Grade</option>';
                allGrades.forEach(grade => {
                    const option = document.createElement('option');
                    option.value = grade._id;
                    option.textContent = `${grade.value} - ${grade.phase}`;
                    gradeDropdown.appendChild(option);
                });
                
                // Pre-select the grade
                gradeDropdown.value = gradeId;
                
                // If the form has a phase dropdown, pre-select it too
                const phaseDropdown = document.getElementById('simple-category-phase') ||
                                     document.getElementById('simple-subject-phase') ||
                                     document.getElementById('simple-topic-phase') ||
                                     document.getElementById('simple-folder-phase');
                if (phaseDropdown) {
                    phaseDropdown.value = selectedGrade.phase;
                }
            }
        }
    } catch (error) {
        console.error('Error pre-selecting grade:', error);
    }
}

function setupCascadingDropdowns(type) {
    if (type === 'category') {
        // Setup phase → grade cascading for categories
        const phaseId = 'simple-category-phase';
        const gradeId = 'simple-category-grade';
        
        setupPhaseGradeCascading(phaseId, gradeId);
    } else if (type === 'subject') {
        // Setup phase → grade and category → subject cascading for subjects
        const phaseId = 'simple-subject-phase';
        const gradeId = 'simple-subject-grade';
        const categoryId = 'simple-subject-category';
        const subjectId = 'simple-subject-subject';
        
        setupPhaseGradeCascading(phaseId, gradeId);
        setupCategorySubjectCascading(categoryId, subjectId);
        
        // Populate categories initially
        const categorySelect = document.getElementById(categoryId);
        if (categorySelect) {
            loadCategoriesForDropdown(categorySelect);
        }
    } else if (type === 'topic') {
        // Setup phase → grade and category → subject cascading for topics
        const phaseId = 'simple-topic-phase';
        const gradeId = 'simple-topic-grade';
        const categoryId = 'simple-topic-category';
        const subjectId = 'simple-topic-subject';
        
        setupPhaseGradeCascading(phaseId, gradeId);
        setupCategorySubjectCascading(categoryId, subjectId);
        
        // Populate categories initially
        const categorySelect = document.getElementById(categoryId);
        if (categorySelect) {
            loadCategoriesForDropdown(categorySelect);
        }
    } else if (type === 'folder') {
        // Setup phase → grade and category → subject cascading for folders
        const phaseId = 'add-phase';
        const gradeId = 'add-grade';
        const categoryId = 'add-category';
        const subjectId = 'add-subject';
        const termId = 'add-term';
        const topicId = 'add-topic';
        
        setupPhaseGradeCascading(phaseId, gradeId);
        setupCategorySubjectCascading(categoryId, subjectId);
        setupTermTopicCascadingForFolder(phaseId, gradeId, subjectId, termId, topicId);
        
        // Populate categories initially
        const categorySelect = document.getElementById(categoryId);
        if (categorySelect) {
            loadCategoriesForDropdown(categorySelect);
        }
    }
}

function setupPhaseGradeCascading(phaseId, gradeId) {
    const phaseSelect = document.getElementById(phaseId);
    const gradeSelect = document.getElementById(gradeId);
    
    if (phaseSelect && gradeSelect) {
        phaseSelect.addEventListener('change', async () => {
            const selectedPhase = phaseSelect.value;
            if (selectedPhase) {
                // Load grades for selected phase
                await loadGradesByPhase(selectedPhase, gradeSelect);
            } else {
                // Clear grades if no phase selected
                gradeSelect.innerHTML = '<option value="">Select Grade</option>';
            }
        });
    }
}

function setupCategorySubjectCascading(categoryId, subjectId) {
    const categorySelect = document.getElementById(categoryId);
    const subjectSelect = document.getElementById(subjectId);
    
    if (categorySelect && subjectSelect) {
        categorySelect.addEventListener('change', async () => {
            const selectedCategory = categorySelect.value;
            if (selectedCategory) {
                // Load subjects for selected category
                await loadSubjectsByCategory(selectedCategory, subjectSelect);
            } else {
                // Clear subjects if no category selected
                subjectSelect.innerHTML = '<option value="">Select Subject</option>';
            }
        });
    }
}

function setupSubjectTopicCascading(subjectId, topicId) {
    const subjectSelect = document.getElementById(subjectId);
    const topicSelect = document.getElementById(topicId);
    
    if (subjectSelect && topicSelect) {
        subjectSelect.addEventListener('change', async () => {
            const selectedSubject = subjectSelect.value;
            if (selectedSubject) {
                // Load topics for selected subject
                await loadTopicsForSubject(selectedSubject, topicSelect);
            } else {
                // Clear topics if no subject selected
                topicSelect.innerHTML = '<option value="">Select Topic</option>';
            }
        });
    }
}

function setupTermTopicCascadingForFolder(phaseId, gradeId, subjectId, termId, topicId) {
    const phaseSelect = document.getElementById(phaseId);
    const gradeSelect = document.getElementById(gradeId);
    const subjectSelect = document.getElementById(subjectId);
    const termSelect = document.getElementById(termId);
    const topicSelect = document.getElementById(topicId);
    
    if (termSelect && topicSelect) {
        termSelect.addEventListener('change', async () => {
            const selectedTerm = termSelect.value;
            const phase = phaseSelect ? phaseSelect.value : '';
            const grade = gradeSelect ? gradeSelect.value : '';
            const subject = subjectSelect ? subjectSelect.value : '';
            
            if (selectedTerm) {
                // Load topics based on term and other filters
                await loadTopicsForFolder(phase, grade, subject, selectedTerm, topicSelect);
            } else {
                // Clear topics if no term selected
                topicSelect.innerHTML = '<option value="">Select Topic</option>';
            }
        });
    }
}

function setupEditCascadingDropdowns(type, data) {
    if (type === 'folder') {
        console.log('Setting up edit cascading dropdowns for folder');
        
        // Setup phase → grade and category → subject cascading for folder edits
        const phaseId = 'edit-phase';
        const gradeId = 'edit-grade';
        const categoryId = 'edit-category';
        const subjectId = 'edit-subject';
        const termId = 'edit-term';
        const topicId = 'edit-topic';
        
        try {
            setupPhaseGradeCascading(phaseId, gradeId);
            setupCategorySubjectCascading(categoryId, subjectId);
            setupTermTopicCascadingForFolder(phaseId, gradeId, subjectId, termId, topicId);
            
            // Populate categories initially
            const categorySelect = document.getElementById(categoryId);
            if (categorySelect) {
                loadCategoriesForDropdown(categorySelect);
            }
            
            // Load grades for initial phase and set values
            const phaseSelect = document.getElementById(phaseId);
            const gradeSelect = document.getElementById(gradeId);
            if (phaseSelect && gradeSelect && data.phase) {
                loadGradesByPhase(data.phase, gradeSelect).then(() => {
                    // Set grade after loading
                    if (data.grade) {
                        gradeSelect.value = data.grade;
                    }
                });
            }
            
            // Set category and load subjects after categories are loaded
            setTimeout(() => {
                if (data.category && categorySelect) {
                    categorySelect.value = data.category;
                    // Trigger change to load subjects
                    categorySelect.dispatchEvent(new Event('change'));
                    
                    // Set subject after subjects are loaded
                    setTimeout(() => {
                        const subjectSelect = document.getElementById(subjectId);
                        if (data.subject && subjectSelect) {
                            subjectSelect.value = data.subject;
                        }
                        
                        // Set term after it's available
                        setTimeout(() => {
                            const termSelect = document.getElementById(termId);
                            if (data.term && termSelect) {
                                termSelect.value = data.term;
                                // Trigger change to load topics
                                termSelect.dispatchEvent(new Event('change'));
                                
                                // Set topic after topics are loaded
                                setTimeout(() => {
                                    const topicSelect = document.getElementById(topicId);
                                    if (data.topic && topicSelect) {
                                        topicSelect.value = data.topic;
                                    }
                                }, 500);
                            }
                        }, 500);
                    }, 500);
                }
            }, 500);
            
            console.log('Edit cascading dropdowns setup completed');
        } catch (error) {
            console.error('Error setting up edit cascading dropdowns:', error);
        }
    }
}

async function loadGradesByPhase(phase, gradeSelect) {
    try {
        const selectedRole = localStorage.getItem('selectedAdminRole');
        const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        const response = await fetch(`/api/content/grades?phase=${phase}&targetAudience=${targetAudience}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const grades = await response.json();
        
        // Clear existing options
        gradeSelect.innerHTML = '<option value="">Select Grade</option>';
        
        // Add grade options
        grades.forEach(grade => {
            const option = document.createElement('option');
            option.value = grade._id || grade.value;
            option.textContent = grade.value || grade.name;
            gradeSelect.appendChild(option);
        });
        
        console.log(`Loaded ${grades.length} grades for phase: ${phase}`);
    } catch (error) {
        console.error('Error loading grades by phase:', error);
        gradeSelect.innerHTML = '<option value="">Error loading grades</option>';
    }
}

async function loadSubjectsByCategory(categoryId, subjectSelect) {
    try {
        const selectedRole = localStorage.getItem('selectedAdminRole');
        const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        const response = await fetch(`/api/content/subjects?category=${categoryId}&targetAudience=${targetAudience}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const subjects = await response.json();
        
        // Clear existing options
        subjectSelect.innerHTML = '<option value="">Select Subject</option>';
        
        // Add subject options
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject._id || subject.id;
            option.textContent = subject.name;
            subjectSelect.appendChild(option);
        });
        
        console.log(`Loaded ${subjects.length} subjects for category: ${categoryId}`);
    } catch (error) {
        console.error('Error loading subjects by category:', error);
        subjectSelect.innerHTML = '<option value="">Error loading subjects</option>';
    }
}

// Function to populate categories dropdown
async function loadCategoriesForDropdown(categorySelect) {
    try {
        const selectedRole = localStorage.getItem('selectedAdminRole');
        const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        const response = await fetch(`/api/content/categories?targetAudience=${targetAudience}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const categories = await response.json();
        
        // Clear existing options
        categorySelect.innerHTML = '<option value="">Select Category</option>';
        
        // Add category options
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category._id || category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
        
        console.log(`Loaded ${categories.length} categories`);
    } catch (error) {
        console.error('Error loading categories:', error);
        categorySelect.innerHTML = '<option value="">Error loading categories</option>';
    }
}

// Function to populate subjects dropdown (all subjects)
async function loadSubjectsForDropdown(subjectSelect) {
    try {
        const selectedRole = localStorage.getItem('selectedAdminRole');
        const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        const response = await fetch(`/api/content/subjects?targetAudience=${targetAudience}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const subjects = await response.json();

        // Clear existing options
        subjectSelect.innerHTML = '<option value="">Select Subject</option>';

        // Add subject options
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject._id || subject.id;
            option.textContent = subject.name;
            subjectSelect.appendChild(option);
        });

        console.log(`Loaded ${subjects.length} subjects`);
    } catch (error) {
        console.error('Error loading subjects:', error);
        subjectSelect.innerHTML = '<option value="">Error loading subjects</option>';
    }
}

function generateEditForm(type, data) {
    switch (type) {
        case 'folder':
            return `
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Folder Name</label>
                    <input type="text" id="edit-name" placeholder="e.g., Mathematics Resources, Science Materials" value="${data.name || ''}" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Description</label>
                    <textarea id="edit-description" rows="3" placeholder="e.g., Contains all mathematics learning materials and resources" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; resize: vertical;">${data.description || ''}</textarea>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Phase *</label>
                    <select id="edit-phase" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                        <option value="Foundation">Foundation</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Senior">Senior</option>
                        <option value="FET">FET</option>
                    </select>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Grade *</label>
                    <select id="edit-grade" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                        <option value="">Select Grade</option>
                        <!-- Grades will be populated dynamically based on phase -->
                    </select>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Category *</label>
                    <select id="edit-category" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                        <option value="">Select Category</option>
                        <!-- Categories will be populated dynamically -->
                    </select>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Subject *</label>
                    <select id="edit-subject" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                        <option value="">Select Subject</option>
                        <!-- Subjects will be populated dynamically based on category -->
                    </select>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Topic *</label>
                    <select id="edit-topic" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                        <option value="">Select Topic</option>
                        <!-- Topics will be populated dynamically based on term -->
                    </select>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Term *</label>
                    <select id="edit-term" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                        <option value="">Select Term</option>
                        <option value="1">Term 1</option>
                        <option value="2">Term 2</option>
                        <option value="3">Term 3</option>
                        <option value="4">Term 4</option>
                    </select>
                </div>
                <input type="hidden" id="edit-folder-id" value="${data._id}">
            `;
        default:
            return '<p>Edit form not available</p>';
    }
}

function generateSimpleForm(type) {
    switch (type) {
        case 'grade':
            return `
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Grade Value</label>
                    <input type="text" id="simple-grade-value" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Phase</label>
                    <select id="simple-grade-phase" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                        <option value="Foundation">Foundation</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Senior">Senior</option>
                        <option value="FET">FET</option>
                    </select>
                </div>
            `;
        case 'subject':
            return `
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Subject Name</label>
                    <input type="text" id="simple-subject-name" placeholder="e.g., Mathematics, Science, English" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Icon</label>
                    <input type="text" id="simple-subject-icon" placeholder="e.g., fas fa-calculator" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;">
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Phase</label>
                    <select id="simple-subject-phase" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                        <option value="Foundation">Foundation</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Senior">Senior</option>
                        <option value="FET">FET</option>
                    </select>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Grade</label>
                    <select id="simple-subject-grade" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                        <option value="">Select Grade</option>
                        <!-- Grades will be populated dynamically -->
                    </select>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Category</label>
                    <select id="simple-subject-category" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                        <option value="">Select Category</option>
                        <!-- Categories will be populated dynamically -->
                    </select>
                </div>
            `;
        case 'topic':
            return `
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Topic Name</label>
                    <input type="text" id="simple-topic-name" placeholder="e.g., Numbers, Shapes, Grammar" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Description</label>
                    <textarea id="simple-topic-description" rows="3" placeholder="e.g., Basic arithmetic operations" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; resize: vertical;"></textarea>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Phase</label>
                    <select id="simple-topic-phase" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                        <option value="Foundation">Foundation</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Senior">Senior</option>
                        <option value="FET">FET</option>
                    </select>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Grade</label>
                    <select id="simple-topic-grade" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                        <option value="">Select Grade</option>
                        <!-- Grades will be populated dynamically -->
                    </select>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Category</label>
                    <select id="simple-topic-category" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                        <option value="">Select Category</option>
                        <!-- Categories will be populated dynamically -->
                    </select>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Subject</label>
                    <select id="simple-topic-subject" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                        <option value="">Select Subject</option>
                        <!-- Subjects will be populated dynamically -->
                    </select>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Term</label>
                    <select id="simple-topic-term" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;">
                        <option value="">All Terms</option>
                        <option value="1">Term 1</option>
                        <option value="2">Term 2</option>
                        <option value="3">Term 3</option>
                        <option value="4">Term 4</option>
                    </select>
                </div>
            `;
        case 'category':
            return `
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Category Name</label>
                    <input type="text" id="simple-category-name" placeholder="e.g., STEM, Languages, Arts" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Description</label>
                    <textarea id="simple-category-description" rows="3" placeholder="e.g., Science, Technology, Engineering, and Mathematics" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; resize: vertical;"></textarea>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Phase</label>
                    <select id="simple-category-phase" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                        <option value="Foundation">Foundation</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Senior">Senior</option>
                        <option value="FET">FET</option>
                    </select>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Grade</label>
                    <select id="simple-category-grade" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                        <option value="">Select Grade</option>
                        <!-- Grades will be populated dynamically -->
                    </select>
                </div>
            `;
        case 'folder':
            return `
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Folder Name</label>
                    <input type="text" id="add-name" placeholder="e.g., Mathematics Resources, Science Materials" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Description</label>
                    <textarea id="add-description" rows="3" placeholder="e.g., Contains all mathematics learning materials and resources" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; resize: vertical;"></textarea>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Phase *</label>
                    <select id="add-phase" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                        <option value="">Select Phase</option>
                        <option value="Foundation">Foundation</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Senior">Senior</option>
                        <option value="FET">FET</option>
                    </select>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Grade *</label>
                    <select id="add-grade" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                        <option value="">Select Grade</option>
                        <!-- Grades will be populated dynamically based on phase -->
                    </select>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Category *</label>
                    <select id="add-category" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                        <option value="">Select Category</option>
                        <!-- Categories will be populated dynamically -->
                    </select>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Subject *</label>
                    <select id="add-subject" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                        <option value="">Select Subject</option>
                        <!-- Subjects will be populated dynamically based on category -->
                    </select>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Topic *</label>
                    <select id="add-topic" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                        <option value="">Select Topic</option>
                        <!-- Topics will be populated dynamically -->
                    </select>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Term *</label>
                    <select id="add-term" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;" required>
                        <option value="">Select Term</option>
                        <option value="1">Term 1</option>
                        <option value="2">Term 2</option>
                        <option value="3">Term 3</option>
                        <option value="4">Term 4</option>
                    </select>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #2d3748;">Order</label>
                    <input type="number" id="add-order" placeholder="0" min="0" value="0" style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;">
                </div>
            `;
        default:
            return '<p>Form not available</p>';
    }
}

function closeSimpleModal() {
    const simpleModal = document.getElementById('simple-add-modal');
    if (simpleModal) {
        simpleModal.style.display = 'none';
    }
}

async function saveSimpleModal() {
    const modalTitle = document.getElementById('simple-modal-title').textContent;
    let type = '';
    let isEdit = modalTitle.includes('Edit');
    
    if (modalTitle.includes('Grade')) type = 'grade';
    else if (modalTitle.includes('Category')) type = 'category';
    else if (modalTitle.includes('Subject')) type = 'subject';
    else if (modalTitle.includes('Topic')) type = 'topic';
    else if (modalTitle.includes('Folder')) type = 'folder';
    
    let data = {};
    
    if (type === 'grade') {
        data.value = document.getElementById(isEdit ? 'edit-grade-value' : 'simple-grade-value').value;
        data.phase = document.getElementById(isEdit ? 'edit-grade-phase' : 'simple-grade-phase').value;
        // Add targetAudience based on selected admin role
        const selectedRole = localStorage.getItem('selectedAdminRole');
        data.targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
    } else if (type === 'subject') {
        if (isEdit) {
            const nameEl = document.getElementById('edit-name');
            const iconEl = document.getElementById('edit-icon');
            const phaseEl = document.getElementById('edit-phase');
            
            if (!nameEl || !iconEl || !phaseEl) {
                console.error('Missing subject edit elements:', { nameEl: !!nameEl, iconEl: !!iconEl, phaseEl: !!phaseEl });
                showToast('error', 'Error', 'Form elements not found');
                return;
            }
            
            data.name = nameEl.value;
            data.icon = iconEl.value || 'fas fa-book';
            data.phase = phaseEl.value;
        } else {
            const nameEl = document.getElementById('simple-subject-name');
            const iconEl = document.getElementById('simple-subject-icon');
            const phaseEl = document.getElementById('simple-subject-phase');
            const gradeEl = document.getElementById('simple-subject-grade');
            const categoryEl = document.getElementById('simple-subject-category');
            
            if (!nameEl || !iconEl || !phaseEl || !gradeEl || !categoryEl) {
                console.error('Missing subject add elements:', { nameEl: !!nameEl, iconEl: !!iconEl, phaseEl: !!phaseEl, gradeEl: !!gradeEl, categoryEl: !!categoryEl });
                showToast('error', 'Error', 'Form elements not found');
                return;
            }
            
            data.name = nameEl.value;
            data.icon = iconEl.value || 'fas fa-book';
            data.phase = phaseEl.value;
            data.grade = gradeEl.value;
            data.category = categoryEl.value;
            // Add targetAudience based on selected admin role
            const selectedRole = localStorage.getItem('selectedAdminRole');
            data.targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        }
    } else if (type === 'category') {
        if (isEdit) {
            const nameEl = document.getElementById('edit-name');
            const descriptionEl = document.getElementById('edit-description');
            const phaseEl = document.getElementById('edit-phase');
            
            if (!nameEl || !descriptionEl || !phaseEl) {
                console.error('Missing category edit elements:', { nameEl: !!nameEl, descriptionEl: !!descriptionEl, phaseEl: !!phaseEl });
                showToast('error', 'Error', 'Form elements not found');
                return;
            }
            
            data.name = nameEl.value;
            data.description = descriptionEl.value;
            data.phase = phaseEl.value;
            data.kind = 'category';
            // Add targetAudience based on selected admin role
            const selectedRole = localStorage.getItem('selectedAdminRole');
            data.targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        } else {
            const nameEl = document.getElementById('simple-category-name');
            const descriptionEl = document.getElementById('simple-category-description');
            const phaseEl = document.getElementById('simple-category-phase');
            const gradeEl = document.getElementById('simple-category-grade');
            
            if (!nameEl || !descriptionEl || !phaseEl || !gradeEl) {
                console.error('Missing category add elements:', { nameEl: !!nameEl, descriptionEl: !!descriptionEl, phaseEl: !!phaseEl, gradeEl: !!gradeEl });
                showToast('error', 'Error', 'Form elements not found');
                return;
            }
            
            data.name = nameEl.value;
            data.description = descriptionEl.value;
            data.phase = phaseEl.value;
            data.grade = gradeEl.value;
            data.kind = 'category';
            // Add targetAudience based on selected admin role
            const selectedRole = localStorage.getItem('selectedAdminRole');
            data.targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        }
    } else if (type === 'topic') {
        if (isEdit) {
            const nameEl = document.getElementById('edit-name');
            const descriptionEl = document.getElementById('edit-description');
            
            if (!nameEl || !descriptionEl) {
                console.error('Missing topic edit elements:', { nameEl: !!nameEl, descriptionEl: !!descriptionEl });
                showToast('error', 'Error', 'Form elements not found');
                return;
            }
            
            data.name = nameEl.value;
            data.description = descriptionEl.value;
            // Add targetAudience based on selected admin role
            const selectedRole = localStorage.getItem('selectedAdminRole');
            data.targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        } else {
            const nameEl = document.getElementById('simple-topic-name');
            const descriptionEl = document.getElementById('simple-topic-description');
            const phaseEl = document.getElementById('simple-topic-phase');
            const gradeEl = document.getElementById('simple-topic-grade');
            const categoryEl = document.getElementById('simple-topic-category');
            const subjectEl = document.getElementById('simple-topic-subject');
            const termEl = document.getElementById('simple-topic-term');
            
            if (!nameEl || !descriptionEl || !phaseEl || !gradeEl || !categoryEl || !subjectEl) {
                console.error('Missing topic add elements:', { nameEl: !!nameEl, descriptionEl: !!descriptionEl, phaseEl: !!phaseEl, gradeEl: !!gradeEl, categoryEl: !!categoryEl, subjectEl: !!subjectEl });
                showToast('error', 'Error', 'Form elements not found');
                return;
            }
            
            data.name = nameEl.value;
            data.description = descriptionEl.value;
            data.phase = phaseEl.value;
            data.grade = gradeEl.value;
            data.category = categoryEl.value;
            data.subject = subjectEl.value;
            data.term = termEl ? termEl.value : null;
            // Add targetAudience based on selected admin role
            const selectedRole = localStorage.getItem('selectedAdminRole');
            data.targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        }
    } else if (type === 'folder') {
        const prefix = isEdit ? 'edit' : 'add';
        
        // Get elements with null checks
        const nameEl = document.getElementById(`${prefix}-name`);
        const descriptionEl = document.getElementById(`${prefix}-description`);
        const phaseEl = document.getElementById(`${prefix}-phase`);
        const gradeEl = document.getElementById(`${prefix}-grade`);
        const subjectEl = document.getElementById(`${prefix}-subject`);
        const topicEl = document.getElementById(`${prefix}-topic`);
        const termEl = document.getElementById(`${prefix}-term`);
        const orderEl = document.getElementById(`${prefix}-order`);
        
        // Check if elements exist
        if (!nameEl || !descriptionEl || !phaseEl || !gradeEl || !subjectEl || !topicEl) {
            console.error('Missing folder form elements:', {
                name: !!nameEl,
                description: !!descriptionEl,
                phase: !!phaseEl,
                grade: !!gradeEl,
                subject: !!subjectEl,
                topic: !!topicEl
            });
            showToast('error', 'Error', 'Form elements not found');
            return;
        }
        
        data.name = nameEl.value;
        data.description = descriptionEl.value;
        data.phase = phaseEl.value;
        data.grade = gradeEl.value;
        data.subject = subjectEl.value;
        data.topic = topicEl.value;
        data.term = termEl ? termEl.value : null;
        data.order = orderEl ? parseInt(orderEl.value || '0', 10) : 0;
        // Add targetAudience based on selected admin role
        const selectedRole = localStorage.getItem('selectedAdminRole');
        data.targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        
        console.log('Folder data being saved:', data);
        
        // Check if required fields are filled
        if (!data.name || !data.grade || !data.subject || !data.phase || !data.topic || !data.term) {
            console.error('Missing required field:', {
                name: !!data.name,
                grade: !!data.grade,
                subject: !!data.subject,
                phase: !!data.phase,
                topic: !!data.topic,
                term: !!data.term
            });
            showToast('error', 'Error', 'Please fill in all required fields');
            return;
        }
    }
    
    try {
        let endpoint = '';
        if (type === 'grade') endpoint = '/api/content/grades';
        else if (type === 'category') endpoint = '/api/content/categories';
        else if (type === 'subject') endpoint = '/api/content/subjects';
        else if (type === 'topic') endpoint = '/api/topics';
        else if (type === 'folder') endpoint = '/api/folders';
        
        let method = 'POST';
        let itemId = null;
        
        if (isEdit) {
            method = 'PUT';
            if (type === 'folder') {
                const folderIdEl = document.getElementById('edit-folder-id');
                if (folderIdEl) {
                    itemId = folderIdEl.value;
                    endpoint += `/${itemId}`;
                } else {
                    console.error('Edit folder ID element not found');
                    showToast('error', 'Error', 'Folder ID not found');
                    return;
                }
            } else if (type === 'category') {
                const categoryIdEl = document.getElementById('edit-category-id');
                if (categoryIdEl) {
                    itemId = categoryIdEl.value;
                    endpoint += `/${itemId}`;
                } else {
                    console.error('Edit category ID element not found');
                    showToast('error', 'Error', 'Category ID not found');
                    return;
                }
            } else if (type === 'subject') {
                const subjectIdEl = document.getElementById('edit-subject-id');
                if (subjectIdEl) {
                    itemId = subjectIdEl.value;
                    endpoint += `/${itemId}`;
                } else {
                    console.error('Edit subject ID element not found');
                    showToast('error', 'Error', 'Subject ID not found');
                    return;
                }
            } else if (type === 'topic') {
                const topicIdEl = document.getElementById('edit-topic-id');
                if (topicIdEl) {
                    itemId = topicIdEl.value;
                    endpoint += `/${itemId}`;
                } else {
                    console.error('Edit topic ID element not found');
                    showToast('error', 'Error', 'Topic ID not found');
                    return;
                }
            }
        }
        
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('success', 'Success', `${type} ${isEdit ? 'updated' : 'added'} successfully`);
            closeSimpleModal();
            await loadPageData(currentPage);
        } else {
            const error = await response.json();
            showToast('error', 'Error', error.error || `Failed to ${isEdit ? 'update' : 'add'} item`);
        }
    } catch (error) {
        console.error('Save item error:', error);
        showToast('error', 'Error', `Network error during ${isEdit ? 'update' : 'add'}`);
    }
}

function generateAddForm(type) {
    const selectedGradeId = window.selectedGradeId;
    
    switch (type) {
        case 'grade':
            return `
                <div class="form-group">
                    <label for="add-value">Grade Value</label>
                    <input type="text" id="add-value" name="value" required>
                </div>
                <div class="form-group">
                    <label for="add-phase">Phase</label>
                    <select id="add-phase" name="phase" required>
                        <option value="Foundation">Foundation</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Senior">Senior</option>
                        <option value="FET">FET</option>
                    </select>
                </div>
                <input type="hidden" name="action" value="add">
            `;
        case 'category':
            return `
                <div class="form-group">
                    <label for="add-name">Category Name</label>
                    <input type="text" id="add-name" name="name" required>
                </div>
                <div class="form-group">
                    <label for="add-description">Description</label>
                    <textarea id="add-description" name="description" rows="4"></textarea>
                </div>
                <div class="form-group">
                    <label for="add-phase">Phase</label>
                    <select id="add-phase" name="phase" required>
                        <option value="Foundation">Foundation</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Senior">Senior</option>
                        <option value="FET">FET</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="add-grade">Grade</label>
                    <select id="add-grade" name="grade" required>
                        <option value="">Select Grade</option>
                    </select>
                </div>
                <input type="hidden" name="action" value="add">
            `;
        case 'subject':
            return `
                <div class="form-group">
                    <label for="add-name">Subject Name</label>
                    <input type="text" id="add-name" name="name" required>
                </div>
                <div class="form-group">
                    <label for="add-icon">Icon</label>
                    <input type="text" id="add-icon" name="icon" placeholder="e.g., fas fa-book">
                </div>
                <div class="form-group">
                    <label for="add-phase">Phase</label>
                    <select id="add-phase" name="phase" required>
                        <option value="Foundation">Foundation</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Senior">Senior</option>
                        <option value="FET">FET</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="add-grade">Grade</label>
                    <select id="add-grade" name="grade" required>
                        <option value="">Select Grade</option>
                    </select>
                </div>
                <input type="hidden" name="action" value="add">
            `;
        case 'topic':
            return `
                <div class="form-group">
                    <label for="add-name">Topic Name</label>
                    <input type="text" id="add-name" name="name" required>
                </div>
                <div class="form-group">
                    <label for="add-description">Description</label>
                    <textarea id="add-description" name="description" rows="4"></textarea>
                </div>
                <div class="form-group">
                    <label for="add-phase">Phase</label>
                    <select id="add-phase" name="phase" required>
                        <option value="Foundation">Foundation</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Senior">Senior</option>
                        <option value="FET">FET</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="add-grade">Grade</label>
                    <select id="add-grade" name="grade" required>
                        <option value="">Select Grade</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="add-category">Category</label>
                    <select id="add-category" name="category" required>
                        <option value="">Select Category</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="add-subject">Subject</label>
                    <select id="add-subject" name="subject" required>
                        <option value="">Select Subject</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="add-term">Term</label>
                    <select id="add-term" name="term">
                        <option value="1">Term 1</option>
                        <option value="2">Term 2</option>
                        <option value="3">Term 3</option>
                        <option value="4">Term 4</option>
                    </select>
                </div>
                <input type="hidden" name="action" value="add">
            `;
        case 'folder':
            return `
                <div class="form-group">
                    <label for="add-name">Folder Name</label>
                    <input type="text" id="add-name" name="name" required>
                </div>
                <div class="form-group">
                    <label for="add-description">Description</label>
                    <textarea id="add-description" name="description" rows="4"></textarea>
                </div>
                <div class="form-group">
                    <label for="add-phase">Phase</label>
                    <select id="add-phase" name="phase" required>
                        <option value="Foundation">Foundation</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Senior">Senior</option>
                        <option value="FET">FET</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="add-grade">Grade</label>
                    <select id="add-grade" name="grade" required>
                        <option value="">Select Grade</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="add-subject">Subject</label>
                    <select id="add-subject" name="subject" required>
                        <option value="">Select Subject</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="add-topic">Topic</label>
                    <select id="add-topic" name="topic" required>
                        <option value="">Select Topic</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="add-term">Term</label>
                    <select id="add-term" name="term">
                        <option value="1">Term 1</option>
                        <option value="2">Term 2</option>
                        <option value="3">Term 3</option>
                        <option value="4">Term 4</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="add-order">Order</label>
                    <input type="number" id="add-order" name="order" min="0" value="0">
                </div>
                <input type="hidden" name="action" value="add">
            `;
        default:
            return '<p>Form not available for this type</p>';
    }
}

// ===== FOLDERS =====
async function loadFolders() {
    try {
        const selectedRole = localStorage.getItem('selectedAdminRole');
        const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        const response = await fetch(`/api/folders?targetAudience=${targetAudience}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        folders = await response.json();
        
        displayFolders();
        setupFolderButtons();
    } catch (error) {
        console.error('Error loading folders:', error);
        showToast('error', 'Error', 'Failed to load folders');
    }
}

function displayFolders() {
    const grid = document.getElementById('folders-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    folders.forEach(folder => {
        const item = createFolderItem(folder);
        grid.appendChild(item);
    });
}

function createFolderItem(folder) {
    const div = document.createElement('div');
    div.className = 'folder-item';
    
    div.innerHTML = `
        <div class="folder-preview">
            <i class="fas fa-folder"></i>
        </div>
        <div class="folder-content">
            <div class="folder-name">${folder.name}</div>
            <div class="folder-description">${folder.description || 'No description'}</div>
            <div class="folder-stats">
                <span><i class="fas fa-file"></i> ${folder.materialCount || 0} items</span>
                <span><i class="fas fa-folder"></i> ${folder.subfolderCount || 0} subfolders</span>
            </div>
            <div class="folder-actions">
                <button class="btn btn-primary btn-small" onclick="openFolder('${folder._id}')">
                    <i class="fas fa-folder-open"></i> Open
                </button>
                <button class="btn btn-secondary btn-small" onclick="editFolder('${folder._id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger btn-small" onclick="deleteFolder('${folder._id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
    
    return div;
}

function setupFolderButtons() {
    const addFolderBtn = document.getElementById('add-folder-btn');
    if (addFolderBtn) {
        addFolderBtn.addEventListener('click', () => {
            openAddModal('folder');
        });
    }
}

function editFolder(folderId) {
    console.log('editFolder called with ID:', folderId);
    const folder = folders.find(f => f._id === folderId);
    console.log('Found folder:', folder);
    if (!folder) {
        showToast('error', 'Error', 'Folder not found');
        return;
    }
    
    console.log('Calling openEditModal...');
    openEditModal('folder', folder);
}

function openEditModal(type, data) {
    console.log('Opening edit modal for type:', type, 'data:', data);
    
    const simpleModal = document.getElementById('simple-add-modal');
    const modalTitle = document.getElementById('simple-modal-title');
    const modalBody = document.getElementById('simple-modal-body');
    
    console.log('Modal elements found:', {
        simpleModal: !!simpleModal,
        modalTitle: !!modalTitle,
        modalBody: !!modalBody
    });
    
    if (!simpleModal || !modalTitle || !modalBody) {
        console.error('Simple modal elements not found');
        showToast('error', 'Error', 'Modal elements not found');
        return;
    }
    
    modalTitle.textContent = `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    
    try {
        // Generate edit form based on type
        const formHTML = generateEditForm(type, data);
        console.log('Generated form HTML:', formHTML);
        modalBody.innerHTML = formHTML;
        console.log('Modal body HTML after insertion:', modalBody.innerHTML);
        
        // No cascading dropdowns needed for simplified edit form
        
        // Show the simple modal
        simpleModal.style.display = 'flex';
        
        // Debug: Check if ID element exists based on type
        setTimeout(() => {
            let idElement = null;
            let elementName = '';
            
            switch (type) {
                case 'folder':
                    idElement = document.getElementById('edit-folder-id');
                    elementName = 'Folder';
                    break;
                case 'category':
                    idElement = document.getElementById('edit-category-id');
                    elementName = 'Category';
                    break;
                case 'subject':
                    idElement = document.getElementById('edit-subject-id');
                    elementName = 'Subject';
                    break;
                case 'topic':
                    idElement = document.getElementById('edit-topic-id');
                    elementName = 'Topic';
                    break;
                case 'grade':
                    idElement = document.getElementById('edit-grade-id');
                    elementName = 'Grade';
                    break;
                default:
                    elementName = 'Unknown';
            }
            
            console.log(`${elementName} ID element found:`, !!idElement);
            if (idElement) {
                console.log(`${elementName} ID value:`, idElement.value);
            }
        }, 100);
        
        console.log('Edit modal should now be visible');
    } catch (error) {
        console.error('Error in openEditModal:', error);
        showToast('error', 'Error', 'Failed to open edit modal');
    }
}

// ===== ANALYTICS =====
async function loadAnalytics() {
    try {
        const documentsResponse = await fetch('/api/documents');
        const videosResponse = await fetch('/api/videos');
        const quizzesResponse = await fetch('/api/quizzes');
        
        const documentsData = await documentsResponse.json();
        const videosData = await videosResponse.json();
        const quizzesData = await quizzesResponse.json();
        
        const materialsData = [...documentsData, ...videosData, ...quizzesData];
        
        updateAnalyticsCharts(materialsData);
    } catch (error) {
        console.error('Error loading analytics:', error);
        showToast('error', 'Error', 'Failed to load analytics');
    }
}

function updateAnalyticsCharts(materials) {
    // Upload trends
    const uploadTrendsCtx = document.getElementById('upload-trends-chart');
    if (uploadTrendsCtx) {
        // Destroy existing chart if it exists
        if (uploadTrendsChartInstance) {
            uploadTrendsChartInstance.destroy();
        }
        
        const data = getActivityChartData(materials);
        uploadTrendsChartInstance = new Chart(uploadTrendsCtx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                resizeDelay: 100,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 0
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            precision: 0
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            }
        });
    }
    
    // Content categories
    const contentCategoriesCtx = document.getElementById('content-categories-chart');
    if (contentCategoriesCtx) {
        // Destroy existing chart if it exists
        if (contentCategoriesChartInstance) {
            contentCategoriesChartInstance.destroy();
        }
        
        const data = getDistributionChartData(materials);
        contentCategoriesChartInstance = new Chart(contentCategoriesCtx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                resizeDelay: 100,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Grade distribution
    const gradeDistributionCtx = document.getElementById('grade-distribution-chart');
    if (gradeDistributionCtx) {
        // Destroy existing chart if it exists
        if (gradeDistributionChartInstance) {
            gradeDistributionChartInstance.destroy();
        }
        
        const gradeData = getGradeDistributionData(materials);
        gradeDistributionChartInstance = new Chart(gradeDistributionCtx, {
            type: 'bar',
            data: gradeData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                resizeDelay: 100,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            precision: 0
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 0
                        }
                    }
                }
            }
        });
    }
    
    // Subject popularity
    const subjectPopularityCtx = document.getElementById('subject-popularity-chart');
    if (subjectPopularityCtx) {
        // Destroy existing chart if it exists
        if (subjectPopularityChartInstance) {
            subjectPopularityChartInstance.destroy();
        }
        
        const subjectData = getSubjectPopularityData(materials);
        subjectPopularityChartInstance = new Chart(subjectPopularityCtx, {
            type: 'bar',
            data: subjectData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                resizeDelay: 100,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            precision: 0
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
}

function getGradeDistributionData(materials) {
    const gradeCounts = {};
    
    materials.forEach(material => {
        const grade = material.grade || 'Unknown';
        gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
    });
    
    return {
        labels: Object.keys(gradeCounts),
        datasets: [{
            label: 'Materials by Grade',
            data: Object.values(gradeCounts),
            backgroundColor: '#667eea'
        }]
    };
}

function getSubjectPopularityData(materials) {
    const subjectCounts = {};
    
    materials.forEach(material => {
        const subject = material.subject || 'Unknown';
        subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
    });
    
    return {
        labels: Object.keys(subjectCounts),
        datasets: [{
            label: 'Materials by Subject',
            data: Object.values(subjectCounts),
            backgroundColor: '#f093fb'
        }]
    };
}

// ===== STUDENT PORTAL =====
function loadStudentPortal() {
    const portalUrl = document.getElementById('portal-url');
    if (portalUrl) {
        portalUrl.value = `${window.location.origin}/home.html`;
    }
    
    // Generate QR code (simplified - in production, use a QR code library)
    const qrCode = document.getElementById('qr-code');
    if (qrCode) {
        const studentPortalUrl = `${window.location.origin}/home.html`;
        qrCode.innerHTML = `<div style="font-family: monospace; font-size: 8px; line-height: 1;">
            ${generateSimpleQRCode(studentPortalUrl)}
        </div>`;
    }
}

function generateSimpleQRCode(text) {
    // This is a simplified placeholder - use a proper QR code library in production
    return `<div style="text-align: center; padding: 20px;">
        <i class="fas fa-qrcode" style="font-size: 100px; color: #667eea;"></i>
        <p style="margin-top: 10px; font-size: 12px;">QR Code</p>
    </div>`;
}

// ===== FORM DEPENDENCIES =====
function setupFormDependencies(type) {
    // Setup cascading dropdowns for forms
    if (type === 'document') {
        setupDocumentFormDependencies();
    } else if (type === 'video') {
        setupVideoFormDependencies();
    } else if (type === 'quiz') {
        setupQuizFormDependencies();
    }
}

function setupDocumentFormDependencies() {
    const phaseSelect = document.getElementById('doc-phase');
    const gradeSelect = document.getElementById('doc-grade');
    const categorySelect = document.getElementById('doc-category');
    const termSelect = document.getElementById('doc-term');
    const subjectSelect = document.getElementById('doc-subject');
    const topicSelect = document.getElementById('doc-topic');
    const folderSelect = document.getElementById('doc-folder');
    
    // Populate categories initially
    if (categorySelect) {
        loadCategoriesForDropdown(categorySelect);
    }
    
    if (phaseSelect) {
        phaseSelect.addEventListener('change', async function() {
            await loadGradesByPhase(this.value, gradeSelect);
            subjectSelect.innerHTML = '<option value="">Select Subject</option>';
            topicSelect.innerHTML = '<option value="">Select Topic</option>';
            folderSelect.innerHTML = '<option value="">Select Folder</option>';
        });
    }
    
    if (gradeSelect) {
        gradeSelect.addEventListener('change', async function() {
            // Reload categories for the selected grade
            await loadCategoriesForDropdown(categorySelect);
            subjectSelect.innerHTML = '<option value="">Select Subject</option>';
            topicSelect.innerHTML = '<option value="">Select Topic</option>';
            folderSelect.innerHTML = '<option value="">Select Folder</option>';
        });
    }
    
    if (categorySelect) {
        categorySelect.addEventListener('change', async function() {
            await loadSubjectsByCategory(this.value, subjectSelect);
            topicSelect.innerHTML = '<option value="">Select Topic</option>';
            folderSelect.innerHTML = '<option value="">Select Folder</option>';
        });
    }
    
    if (termSelect) {
        termSelect.addEventListener('change', async function() {
            // Reload subjects based on term and category
            const selectedCategory = categorySelect ? categorySelect.value : '';
            if (selectedCategory) {
                await loadSubjectsByCategory(selectedCategory, subjectSelect);
            }
            // Reload topics if subject is already selected
            const selectedSubject = subjectSelect ? subjectSelect.value : '';
            if (selectedSubject) {
                await loadTopicsForSubject(selectedSubject, topicSelect, this.value);
            } else {
                topicSelect.innerHTML = '<option value="">Select Topic</option>';
            }
            folderSelect.innerHTML = '<option value="">Select Folder</option>';
        });
    }
    
    if (subjectSelect) {
        subjectSelect.addEventListener('change', async function() {
            const selectedTerm = termSelect ? termSelect.value : '';
            await loadTopicsForSubject(this.value, topicSelect, selectedTerm);
            folderSelect.innerHTML = '<option value="">Select Folder</option>';
        });
    }
    
    if (topicSelect) {
        topicSelect.addEventListener('change', async function() {
            const topicId = this.value;
            if (topicId) {
                await loadFoldersForDropdown(folderSelect, topicId);
            } else {
                folderSelect.innerHTML = '<option value="">Select Folder</option>';
            }
        });
    }
}

function setupVideoFormDependencies() {
    const phaseSelect = document.getElementById('vid-phase');
    const gradeSelect = document.getElementById('vid-grade');
    const categorySelect = document.getElementById('vid-category');
    const folderSelect = document.getElementById('vid-folder');
    const subjectSelect = document.getElementById('vid-subject');
    const topicSelect = document.getElementById('vid-topic');
    
    // Populate categories initially
    if (categorySelect) {
        loadCategoriesForDropdown(categorySelect);
    }
    
    // Don't load folders initially - they will be loaded based on topic selection
    
    if (phaseSelect) {
        phaseSelect.addEventListener('change', async function() {
            await loadGradesByPhase(this.value, gradeSelect);
            subjectSelect.innerHTML = '<option value="">Select Subject</option>';
            topicSelect.innerHTML = '<option value="">Select Topic</option>';
            folderSelect.innerHTML = '<option value="">Select Folder</option>';
        });
    }
    
    if (gradeSelect) {
        gradeSelect.addEventListener('change', async function() {
            // Reload categories for the selected grade
            await loadCategoriesForDropdown(categorySelect);
            subjectSelect.innerHTML = '<option value="">Select Subject</option>';
            topicSelect.innerHTML = '<option value="">Select Topic</option>';
            folderSelect.innerHTML = '<option value="">Select Folder</option>';
        });
    }
    
    if (categorySelect) {
        categorySelect.addEventListener('change', async function() {
            await loadSubjectsByCategory(this.value, subjectSelect);
            topicSelect.innerHTML = '<option value="">Select Topic</option>';
            folderSelect.innerHTML = '<option value="">Select Folder</option>';
        });
    }
    
    if (subjectSelect) {
        subjectSelect.addEventListener('change', async function() {
            // Get the term value from the form
            const termSelect = document.getElementById('vid-term');
            const selectedTerm = termSelect ? termSelect.value : '';
            await loadTopicsForSubject(this.value, topicSelect, selectedTerm);
            folderSelect.innerHTML = '<option value="">Select Folder</option>';
        });
    }
    
    if (topicSelect) {
        topicSelect.addEventListener('change', async function() {
            const topicId = this.value;
            if (topicId) {
                await loadFoldersForDropdown(folderSelect, topicId);
            } else {
                folderSelect.innerHTML = '<option value="">Select Folder</option>';
            }
        });
    }
}

function setupQuizFormDependencies() {
    const phaseSelect = document.getElementById('quiz-phase');
    const gradeSelect = document.getElementById('quiz-grade');
    const categorySelect = document.getElementById('quiz-category');
    const subjectSelect = document.getElementById('quiz-subject');
    const termSelect = document.getElementById('quiz-term');
    const topicSelect = document.getElementById('quiz-topic');
    const folderSelect = document.getElementById('quiz-folder');

    // Populate categories and subjects initially
    if (categorySelect) {
        loadCategoriesForDropdown(categorySelect);
    }
    if (subjectSelect) {
        loadSubjectsForDropdown(subjectSelect);
    }

    if (phaseSelect) {
        phaseSelect.addEventListener('change', async function() {
            await loadGradesByPhase(this.value, gradeSelect);
            if (subjectSelect) subjectSelect.innerHTML = '<option value="">Select Subject</option>';
            if (topicSelect) topicSelect.innerHTML = '<option value="">Select Topic</option>';
            if (folderSelect) folderSelect.innerHTML = '<option value="">Select Folder</option>';
            // Reload subjects
            await loadSubjectsForDropdown(subjectSelect);
        });
    }

    if (gradeSelect) {
        gradeSelect.addEventListener('change', async function() {
            // Reload categories for the selected grade
            await loadCategoriesForDropdown(categorySelect);
            if (subjectSelect) subjectSelect.innerHTML = '<option value="">Select Subject</option>';
            if (topicSelect) topicSelect.innerHTML = '<option value="">Select Topic</option>';
            if (folderSelect) folderSelect.innerHTML = '<option value="">Select Folder</option>';
            // Reload subjects
            await loadSubjectsForDropdown(subjectSelect);
        });
    }

    if (categorySelect) {
        categorySelect.addEventListener('change', async function() {
            if (topicSelect) topicSelect.innerHTML = '<option value="">Select Topic</option>';
            if (folderSelect) folderSelect.innerHTML = '<option value="">Select Folder</option>';
            if (subjectSelect && this.value) {
                await loadSubjectsByCategory(this.value, subjectSelect);
            }
        });
    }

    if (termSelect) {
        termSelect.addEventListener('change', async function() {
            // Reload topics if subject is already selected
            const selectedSubject = subjectSelect ? subjectSelect.value : '';
            if (selectedSubject) {
                await loadTopicsForSubject(selectedSubject, topicSelect, this.value);
            } else {
                topicSelect.innerHTML = '<option value="">Select Topic</option>';
            }
            if (folderSelect) folderSelect.innerHTML = '<option value="">Select Folder</option>';
        });
    }

    if (subjectSelect) {
        subjectSelect.addEventListener('change', async function() {
            const selectedTerm = termSelect ? termSelect.value : '';
            await loadTopicsForSubject(this.value, topicSelect, selectedTerm);
            if (folderSelect) folderSelect.innerHTML = '<option value="">Select Folder</option>';
        });
    }

    if (topicSelect) {
        topicSelect.addEventListener('change', async function() {
            // Load folders for the selected topic
            if (this.value && folderSelect) {
                await loadFoldersForDropdown(folderSelect, {
                    phase: phaseSelect ? phaseSelect.value : '',
                    grade: gradeSelect ? gradeSelect.value : '',
                    subject: subjectSelect ? subjectSelect.value : '',
                    term: termSelect ? termSelect.value : '',
                    topic: this.value
                });
            } else if (folderSelect) {
                folderSelect.innerHTML = '<option value="">Select Folder</option>';
            }
        });
    }

    if (termSelect) {
        termSelect.addEventListener('change', async function() {
            // Clear folders when term changes
            if (folderSelect) folderSelect.innerHTML = '<option value="">Select Folder</option>';
        });
    }
}

// ===== API HELPER FUNCTIONS =====
async function loadFoldersForTerm(termId, selectElement) {
    try {
        console.log('loadFoldersForTerm called with termId:', termId);
        const selectedRole = localStorage.getItem('selectedAdminRole');
        const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';

        // Try fetching without type filter first
        const apiUrl = `/api/materials?targetAudience=${targetAudience}&term=${termId}`;
        console.log('Fetching folders from:', apiUrl);
        const response = await fetch(apiUrl);
        console.log('Folder response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const materials = await response.json();
        console.log('Materials received:', materials);

        // Log each material to see its structure
        materials.forEach((m, i) => {
            console.log(`Material ${i}:`, { name: m.name, type: m.type, description: m.description, contentTypes: m.contentTypes });
        });

        // Show all materials with names (simplified filter)
        const folders = materials.filter(m => m.name);
        console.log('Filtered folders:', folders);

        selectElement.innerHTML = '<option value="">Select Folder</option>';
        folders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder._id || folder.id;
            option.textContent = folder.name;
            selectElement.appendChild(option);
        });

        console.log(`Loaded ${folders.length} folders for term: ${termId}`);
    } catch (error) {
        console.error('Error loading folders:', error);
        selectElement.innerHTML = '<option value="">Error loading folders</option>';
    }
}

async function loadFoldersForTopic(topicId, selectElement) {
    try {
        console.log('loadFoldersForTopic called with topicId:', topicId);
        const selectedRole = localStorage.getItem('selectedAdminRole');
        const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';

        // Fetch all materials with targetAudience and topic filter (try topicId parameter)
        const apiUrl = `/api/materials?targetAudience=${targetAudience}&topicId=${topicId}`;
        console.log('Fetching materials from:', apiUrl);
        const response = await fetch(apiUrl);
        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const materials = await response.json();
        console.log('Materials received:', materials);

        // Log each material to see its structure
        materials.forEach((m, i) => {
            console.log(`Material ${i}:`, {
                name: m.name,
                type: m.type,
                description: m.description,
                topic: m.topic,
                targetAudience: m.targetAudience,
                _id: m._id
            });
        });

        // Show all materials (folders don't have type field)
        const folders = materials.filter(m => m.name);
        console.log('Filtered folders:', folders);

        selectElement.innerHTML = '<option value="">Select Folder</option>';
        folders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder._id || folder.id;
            option.textContent = folder.name;
            selectElement.appendChild(option);
        });

        console.log(`Loaded ${folders.length} folders for topic: ${topicId}`);
    } catch (error) {
        console.error('Error loading folders:', error);
        selectElement.innerHTML = '<option value="">Error loading folders</option>';
    }
}

async function loadSubjectsForTerm(termId, selectElement) {
    try {
        const response = await fetch(`/api/content/subjects?term=${termId}`);
        const subjects = await response.json();
        
        selectElement.innerHTML = '<option value="">Select Subject</option>';
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject._id;
            option.textContent = subject.name;
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading subjects:', error);
    }
}

async function loadTopicsForSubject(subjectId, selectElement, termId = null) {
    try {
        const selectedRole = localStorage.getItem('selectedAdminRole');
        const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        
        let apiUrl = `/api/content/topics?subject=${subjectId}&targetAudience=${targetAudience}`;
        if (termId) {
            apiUrl += `&term=${termId}`;
        }
        
        const response = await fetch(apiUrl);
        const topics = await response.json();
        
        selectElement.innerHTML = '<option value="">Select Topic</option>';
        topics.forEach(topic => {
            const option = document.createElement('option');
            option.value = topic._id;
            option.textContent = topic.name;
            selectElement.appendChild(option);
        });
        
        console.log(`Loaded ${topics.length} topics for subject: ${subjectId}, term: ${termId}`);
    } catch (error) {
        console.error('Error loading topics:', error);
        selectElement.innerHTML = '<option value="">Error loading topics</option>';
    }
}

async function loadTopicsForFolder(phase, grade, subject, term, topicSelect) {
    try {
        const selectedRole = localStorage.getItem('selectedAdminRole');
        const targetAudience = selectedRole === 'teachers-admin' ? 'teacher' : 'student';
        
        let apiUrl = `/api/content/topics?targetAudience=${targetAudience}`;
        if (phase) apiUrl += `&phase=${phase}`;
        if (grade) apiUrl += `&grade=${grade}`;
        if (subject) apiUrl += `&subject=${subject}`;
        if (term) apiUrl += `&term=${term}`;
        
        const response = await fetch(apiUrl);
        const topics = await response.json();
        
        topicSelect.innerHTML = '<option value="">Select Topic</option>';
        topics.forEach(topic => {
            const option = document.createElement('option');
            option.value = topic._id;
            option.textContent = topic.name;
            topicSelect.appendChild(option);
        });
        
        console.log(`Loaded ${topics.length} topics for folder`);
    } catch (error) {
        console.error('Error loading topics for folder:', error);
        topicSelect.innerHTML = '<option value="">Error loading topics</option>';
    }
}

async function loadGradesForPhase(phase, selectElement) {
    try {
        const response = await fetch(`/api/content/grades?phase=${phase}`);
        const grades = await response.json();
        
        selectElement.innerHTML = '<option value="">Select Grade</option>';
        grades.forEach(grade => {
            const option = document.createElement('option');
            option.value = grade._id;
            option.textContent = `${grade.value} (${grade.phase})`;
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading grades:', error);
    }
}

async function loadSubjectsForGrade(gradeId, selectElement) {
    try {
        const response = await fetch(`/api/content/subjects?grade=${gradeId}`);
        const subjects = await response.json();
        
        selectElement.innerHTML = '<option value="">Select Subject</option>';
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject._id;
            option.textContent = subject.name;
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading subjects:', error);
    }
}

async function loadCategoriesForGrade(gradeId, selectElement) {
    // Similar to subjects for quizzes
    await loadSubjectsForGrade(gradeId, selectElement);
}

async function loadTopicsForCategory(categoryId, selectElement) {
    // Similar to topics for subjects
    await loadTopicsForSubject(categoryId, selectElement);
}

// ===== MATERIAL ACTIONS =====
async function viewMaterial(id) {
    const material = materials.find(m => m._id === id);
    if (material && material.url) {
        window.open(material.url, '_blank');
    } else {
        showToast('info', 'Info', 'No preview available for this material');
    }
}

async function editMaterial(id) {
    const material = materials.find(m => m._id === id);
    if (material) {
        openEditModal('material', material);
    }
}

async function deleteMaterial(id) {
    if (confirm('Are you sure you want to delete this material?')) {
        try {
            const response = await fetch(`/api/documents/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showToast('success', 'Success', 'Material deleted successfully');
                await loadMaterials();
            } else {
                const error = await response.json();
                showToast('error', 'Error', error.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showToast('error', 'Error', 'Network error during delete');
        }
    }
}

// ===== CONTENT SETTINGS ACTIONS =====
async function editGrade(id) {
    const grade = grades.find(g => g._id === id);
    if (grade) {
        openEditModal('grade', grade);
    }
}

async function deleteGrade(id) {
    if (confirm('Are you sure you want to delete this grade?')) {
        try {
            const response = await fetch(`/api/content/grades/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showToast('success', 'Success', 'Grade deleted successfully');
                await loadGrades();
            } else {
                const error = await response.json();
                showToast('error', 'Error', error.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showToast('error', 'Error', 'Network error during delete');
        }
    }
}

async function editSubject(id) {
    const subject = subjects.find(s => s._id === id);
    if (subject) {
        openEditModal('subject', subject);
    }
}

async function deleteSubject(id) {
    if (confirm('Are you sure you want to delete this subject?')) {
        try {
            const response = await fetch(`/api/content/subjects/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showToast('success', 'Success', 'Subject deleted successfully');
                await loadSubjects();
            } else {
                const error = await response.json();
                showToast('error', 'Error', error.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showToast('error', 'Error', 'Network error during delete');
        }
    }
}

async function deleteCategory(id) {
    if (confirm('Are you sure you want to delete this category?')) {
        try {
            const response = await fetch(`/api/content/categories/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showToast('success', 'Success', 'Category deleted successfully');
                await loadCategories();
            } else {
                const error = await response.json();
                showToast('error', 'Error', error.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showToast('error', 'Error', 'Network error during delete');
        }
    }
}

async function editTopic(id) {
    const topic = topics.find(t => t._id === id);
    if (topic) {
        openEditModal('topic', topic);
    }
}

async function deleteTopic(id) {
    if (confirm('Are you sure you want to delete this topic?')) {
        try {
            const response = await fetch(`/api/content/topics/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showToast('success', 'Success', 'Topic deleted successfully');
                await loadTopics();
            } else {
                const error = await response.json();
                showToast('error', 'Error', error.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showToast('error', 'Error', 'Network error during delete');
        }
    }
}

// ===== FOLDER ACTIONS =====
async function openFolder(id) {
    const folder = folders.find(f => f._id === id);
    if (folder) {
        showToast('info', 'Info', `Opening folder: ${folder.name}`);
        // Implement folder content loading
    }
}


async function deleteFolder(id) {
    if (confirm('Are you sure you want to delete this folder?')) {
        try {
            const response = await fetch(`/api/folders/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showToast('success', 'Success', 'Folder deleted successfully');
                await loadFolders();
            } else {
                const error = await response.json();
                showToast('error', 'Error', error.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showToast('error', 'Error', 'Network error during delete');
        }
    }
}

// ===== MODAL FUNCTIONS =====

function closeModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('edit-modal');
    
    if (modalOverlay) {
        modalOverlay.classList.remove('active');
    }
    if (modal) {
        modal.style.display = 'none';
    }
    
    console.log('Modal closed');
}

function generateEditForm(type, data) {
    // Generate form fields based on type
    switch (type) {
        case 'material':
            return `
                <div class="form-group">
                    <label for="edit-title">Title</label>
                    <input type="text" id="edit-title" value="${data.title || ''}" required>
                </div>
                <div class="form-group">
                    <label for="edit-description">Description</label>
                    <textarea id="edit-description" rows="4">${data.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="edit-type">Type</label>
                    <select id="edit-type" required>
                        <option value="document" ${data.type === 'document' ? 'selected' : ''}>Document</option>
                        <option value="video" ${data.type === 'video' ? 'selected' : ''}>Video</option>
                        <option value="quiz" ${data.type === 'quiz' ? 'selected' : ''}>Quiz</option>
                    </select>
                </div>
            `;
        case 'grade':
            return `
                <div class="form-group">
                    <label for="edit-value">Grade Value</label>
                    <input type="text" id="edit-value" value="${data.value || ''}" required>
                </div>
                <div class="form-group">
                    <label for="edit-phase">Phase</label>
                    <select id="edit-phase" required>
                        <option value="Foundation" ${data.phase === 'Foundation' ? 'selected' : ''}>Foundation</option>
                        <option value="Intermediate" ${data.phase === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
                        <option value="Senior" ${data.phase === 'Senior' ? 'selected' : ''}>Senior</option>
                        <option value="FET" ${data.phase === 'FET' ? 'selected' : ''}>FET</option>
                    </select>
                </div>
            `;
        case 'subject':
            return `
                <div class="form-group">
                    <label for="edit-name">Subject Name</label>
                    <input type="text" id="edit-name" value="${data.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="edit-icon">Icon</label>
                    <input type="text" id="edit-icon" value="${data.icon || ''}" placeholder="e.g., fas fa-book">
                </div>
                <div class="form-group">
                    <label for="edit-phase">Phase</label>
                    <select id="edit-phase" required>
                        <option value="Foundation" ${data.phase === 'Foundation' ? 'selected' : ''}>Foundation</option>
                        <option value="Intermediate" ${data.phase === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
                        <option value="Senior" ${data.phase === 'Senior' ? 'selected' : ''}>Senior</option>
                        <option value="FET" ${data.phase === 'FET' ? 'selected' : ''}>FET</option>
                    </select>
                </div>
                <input type="hidden" id="edit-subject-id" value="${data._id}">
            `;
        case 'category':
            return `
                <div class="form-group">
                    <label for="edit-name">Category Name</label>
                    <input type="text" id="edit-name" value="${data.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="edit-description">Description</label>
                    <textarea id="edit-description" rows="4">${data.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="edit-phase">Phase</label>
                    <select id="edit-phase" required>
                        <option value="Foundation" ${data.phase === 'Foundation' ? 'selected' : ''}>Foundation</option>
                        <option value="Intermediate" ${data.phase === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
                        <option value="Senior" ${data.phase === 'Senior' ? 'selected' : ''}>Senior</option>
                        <option value="FET" ${data.phase === 'FET' ? 'selected' : ''}>FET</option>
                    </select>
                </div>
                <input type="hidden" id="edit-category-id" value="${data._id}">
            `;
        case 'topic':
            return `
                <div class="form-group">
                    <label for="edit-name">Topic Name</label>
                    <input type="text" id="edit-name" value="${data.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="edit-description">Description</label>
                    <textarea id="edit-description" rows="4">${data.description || ''}</textarea>
                </div>
                <input type="hidden" id="edit-topic-id" value="${data._id}">
            `;
        case 'folder':
            return `
                <div class="form-group">
                    <label for="edit-name">Folder Name</label>
                    <input type="text" id="edit-name" value="${data.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="edit-description">Description</label>
                    <textarea id="edit-description" rows="4">${data.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="edit-order">Order</label>
                    <input type="number" id="edit-order" value="${data.order || 0}" min="0">
                </div>
                <input type="hidden" id="edit-folder-id" value="${data._id}">
            `;
        default:
            return '<p>Form not available for this type</p>';
    }
}

// ===== TAB FUNCTIONS =====
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// ===== UTILITY FUNCTIONS =====
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    sidebar.classList.toggle('active');
    mainContent.classList.toggle('sidebar-collapsed');
}

async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminInfo');
        localStorage.removeItem('selectedAdminRole');
        window.location.href = '/admin-role-selection.html';
    }
}

async function refreshCurrentPage() {
    showToast('info', 'Info', 'Refreshing page...');
    await loadPageData(currentPage);
    showToast('success', 'Success', 'Page refreshed successfully');
}

function showToast(type, title, message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${icons[type] || icons.info}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

// ===== COPY LINK FUNCTION =====
document.addEventListener('DOMContentLoaded', function() {
    const copyLinkBtn = document.getElementById('copy-link-btn');
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', function() {
            const portalUrl = document.getElementById('portal-url');
            if (portalUrl) {
                portalUrl.select();
                document.execCommand('copy');
                showToast('success', 'Success', 'Link copied to clipboard!');
            }
        });
    }
});

// ===== QUESTION MANAGEMENT FOR QUIZZES =====
document.addEventListener('DOMContentLoaded', function() {
    const addQuestionBtn = document.getElementById('add-question');
    if (addQuestionBtn) {
        addQuestionBtn.addEventListener('click', addQuestionField);
    }
    
    // Remove question handlers
    document.addEventListener('click', function(e) {
        if (e.target.closest('.remove-question')) {
            e.target.closest('.question-item').remove();
        }
    });
});

function addQuestionField() {
    const container = document.getElementById('questions-container');
    if (!container) return;
    
    const questionCount = container.children.length + 1;
    const questionItem = document.createElement('div');
    questionItem.className = 'question-item';
    
    questionItem.innerHTML = `
        <input type="text" placeholder="Question ${questionCount}" class="question-input" required>
        <input type="text" placeholder="Answer ${questionCount}" class="answer-input" required>
        <button type="button" class="btn btn-small btn-danger remove-question">
            <i class="fas fa-trash"></i>
        </button>
    `;
}

// ===== FILTER FUNCTIONS =====
function filterCategories() {
    const phaseFilter = document.getElementById('category-phase-filter').value;
    const gradeFilter = document.getElementById('category-grade-filter').value;
    
    // Re-fetch categories with filters
    loadCategoriesWithFilters(phaseFilter, gradeFilter);
}

function filterSubjects() {
    const phaseFilter = document.getElementById('subject-phase-filter').value;
    const gradeFilter = document.getElementById('subject-grade-filter').value;
    const categoryFilter = document.getElementById('subject-category-filter').value;
    
    // Re-fetch subjects with filters
    loadSubjects();
}

function filterTopics() {
    const phaseFilter = document.getElementById('topic-phase-filter').value;
    const gradeFilter = document.getElementById('topic-grade-filter').value;
    const categoryFilter = document.getElementById('topic-category-filter').value;
    const subjectFilter = document.getElementById('topic-subject-filter').value;
    const termFilter = document.getElementById('topic-term-filter').value;
    
    // Re-fetch topics with filters
    loadTopics();
}

function clearCategoryFilters() {
    document.getElementById('category-phase-filter').value = '';
    document.getElementById('category-grade-filter').value = '';
    loadCategories();
}

function clearSubjectFilters() {
    document.getElementById('subject-phase-filter').value = '';
    document.getElementById('subject-grade-filter').value = '';
    document.getElementById('subject-category-filter').value = '';
    loadSubjects();
}

function clearTopicFilters() {
    document.getElementById('topic-phase-filter').value = '';
    document.getElementById('topic-grade-filter').value = '';
    document.getElementById('topic-category-filter').value = '';
    document.getElementById('topic-subject-filter').value = '';
    document.getElementById('topic-term-filter').value = '';
    loadTopics();
}

async function loadCategoriesWithFilters(phase, grade) {
    try {
        let url = '/api/content/categories';
        const params = new URLSearchParams();
        if (phase) params.append('phase', phase);
        if (grade) params.append('grade', grade);
        if (params.toString()) url += '?' + params.toString();
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const categories = await response.json();
        
        displayCategories(categories);
    } catch (error) {
        console.error('Error loading filtered categories:', error);
        showToast('error', 'Error', 'Failed to load filtered categories');
        displayCategories([]);
    }
}

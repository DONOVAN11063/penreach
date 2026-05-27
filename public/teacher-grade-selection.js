// API Base URL
const API_BASE = '/api';

// Global state
let currentSelection = {
    phase: '',
    grade: '',
    category: '',
    term: '',
    subject: '',
    topic: '',
    folder: ''
};

let grades = [];
let categories = [];
let subjects = [];
let topics = [];
let folders = [];
let materials = [];
let teacherPhases = [];

// Initialize teacher grade selection page
document.addEventListener('DOMContentLoaded', function() {
    checkTeacherAuth();
    initializePage();
});

function checkTeacherAuth() {
    const teacherToken = localStorage.getItem('teacherToken');
    if (!teacherToken) {
        window.location.href = 'teacher-auth.html';
    }
}

function initializePage() {
    loadTeacherInfo();
    loadSelectedPhase();
    setupEventListeners();
}

// Load teacher information
function loadTeacherInfo() {
    const teacherInfo = localStorage.getItem('teacherInfo');
    if (teacherInfo) {
        const teacher = JSON.parse(teacherInfo);
        teacherPhases = teacher.phases || [];
        console.log('Teacher phases:', teacherPhases);
    }
}

// Load selected phase from sessionStorage
function loadSelectedPhase() {
    const selectedPhase = sessionStorage.getItem('selectedPhase');
    if (selectedPhase) {
        currentSelection.phase = selectedPhase;
        updatePhaseInfo(selectedPhase);
        loadGrades(selectedPhase);
    } else {
        // If no phase selected, redirect back to teachers-home
        window.location.href = 'teachers-home.html';
    }
}

// Update phase info in sidebar header
function updatePhaseInfo(phaseName) {
    const phaseInfo = document.getElementById('selected-phase-info');
    phaseInfo.textContent = `${phaseName} Phase Selected`;
}

// Setup event listeners
function setupEventListeners() {
    // Grade selection change
    document.getElementById('grade-select').addEventListener('change', function(e) {
        currentSelection.grade = e.target.value;
        currentSelection.category = '';
        currentSelection.term = '';
        currentSelection.subject = '';
        currentSelection.topic = '';
        currentSelection.folder = '';
        
        resetCategories();
        resetTerms();
        hideSubjects();
        hideTopics();
        hideFolders();
        hideContent();
        
        if (currentSelection.grade) {
            loadCategories(currentSelection.grade);
            enableCategorySelect();
            enableTermSelect();
        } else {
            disableCategorySelect();
            disableTermSelect();
        }
    });
    
    // Category selection change
    document.getElementById('category-select').addEventListener('change', function(e) {
        currentSelection.category = e.target.value;
        currentSelection.term = '';
        currentSelection.subject = '';
        currentSelection.topic = '';
        currentSelection.folder = '';
        
        resetTerms();
        hideSubjects();
        hideTopics();
        hideFolders();
        hideContent();
        
        if (currentSelection.category) {
            enableTermSelect();
            // Load subjects immediately when category is selected
            loadSubjects();
        }
    });
    
    // Term selection change
    document.getElementById('term-select').addEventListener('change', function(e) {
        currentSelection.term = e.target.value;
        currentSelection.subject = '';
        currentSelection.topic = '';
        currentSelection.folder = '';
        
        hideSubjects();
        hideTopics();
        hideFolders();
        hideContent();
        
        if (currentSelection.grade && currentSelection.category && currentSelection.term) {
            loadSubjects();
        }
    });
}

// Load grades from API
async function loadGrades(phase) {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/grades?phase=${phase}&targetAudience=teacher`);
        if (!response.ok) throw new Error('Failed to load grades');
        
        grades = await response.json();
        populateGradesSelect();
        hideLoading();
    } catch (error) {
        console.error('Error loading grades:', error);
        showError('Failed to load grades. Please try again.');
        hideLoading();
    }
}

// Load categories based on selected grade
async function loadCategories(gradeId) {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/categories?grade=${gradeId}&targetAudience=teacher`);
        if (!response.ok) throw new Error('Failed to load categories');
        
        categories = await response.json();
        populateCategoriesSelect();
        hideLoading();
    } catch (error) {
        console.error('Error loading categories:', error);
        showError('Failed to load categories. Please try again.');
        hideLoading();
    }
}

// Load subjects based on current selections
async function loadSubjects() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/subjects?phase=${currentSelection.phase}&grade=${currentSelection.grade}&category=${currentSelection.category}&targetAudience=teacher&t=${Date.now()}`);
        if (!response.ok) throw new Error('Failed to load subjects');
        
        subjects = await response.json();
        displaySubjects();
        hideLoading();
        updateContentHeader('Subjects', `${subjects.length} subjects found`);
    } catch (error) {
        console.error('Error loading subjects:', error);
        showError('Failed to load subjects. Please try again.');
        hideLoading();
    }
}

// Load topics based on current selections
async function loadTopics() {
    try {
        showLoading();
        
        console.log('Loading topics with selections:', currentSelection);
        
        const apiUrl = `${API_BASE}/topics?phase=${currentSelection.phase}&grade=${currentSelection.grade}&subject=${currentSelection.subject}&term=${currentSelection.term}&isActive=true&targetAudience=teacher&t=${Date.now()}`;
        console.log('API URL:', apiUrl);
        
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to load topics');
        
        topics = await response.json();
        console.log('Topics loaded:', topics.length, 'topics');
        
        displayTopics();
        hideLoading();
        updateContentHeader('Topics', `${topics.length} topics found`);
    } catch (error) {
        console.error('Error loading topics:', error);
        showError('Failed to load topics. Please try again.');
        hideLoading();
    }
}

// Load folders based on selected topic
async function loadFolders(topicId) {
    try {
        showLoading();
        
        console.log('Loading folders with selections:', currentSelection);
        console.log('Topic ID:', topicId);
        
        const apiUrl = `${API_BASE}/folders?grade=${currentSelection.grade}&subject=${currentSelection.subject}&phase=${currentSelection.phase}&term=${currentSelection.term}&topic=${topicId}&targetAudience=teacher`;
        console.log('Folders API URL:', apiUrl);
        
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to load folders');
        
        const data = await response.json();
        folders = Array.isArray(data) ? data : (data.folders || []);
        console.log('Folders loaded:', folders.length, 'folders');
        
        displayFolders();
        hideLoading();
        updateContentHeader('Folders', `${folders.length} folders found`);
    } catch (error) {
        console.error('Error loading folders:', error);
        showError('Failed to load folders. Please try again.');
        hideLoading();
    }
}

// Load materials based on selected folder
async function loadMaterials(folderId) {
    try {
        showLoading();
        
        console.log('Loading materials with selections:', currentSelection);
        console.log('Folder ID:', folderId);
        
        // Get type filter value
        const typeFilter = document.getElementById('material-type-filter');
        const selectedType = typeFilter ? typeFilter.value : '';
        
        // Build API URL with filters for teachers
        let apiUrl = `${API_BASE}/materials?phase=${currentSelection.phase}&grade=${currentSelection.grade}&subject=${currentSelection.subject}&term=${currentSelection.term}&folder=${folderId}&targetAudience=teacher&t=${Date.now()}`;
        
        // Add teacher phases filter
        if (teacherPhases.length > 0) {
            apiUrl += `&teacherPhases=${JSON.stringify(teacherPhases)}`;
        }
        
        // Add type filter if selected
        if (selectedType) {
            apiUrl += `&type=${selectedType}`;
        }
        
        console.log('Materials API URL:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('Fetch response status:', response.status);
        if (!response.ok) throw new Error('Failed to load materials');
        
        materials = await response.json();
        console.log('Materials loaded:', materials.length, 'materials');
        
        displayMaterials();
        hideLoading();
        updateContentHeader('Materials', `${materials.length} materials found`);
    } catch (error) {
        console.error('Error loading materials:', error);
        showError('Failed to load materials. Please try again.');
        hideLoading();
    }
}

// Populate grades dropdown
function populateGradesSelect() {
    const select = document.getElementById('grade-select');
    select.innerHTML = '<option value="">Select Grade...</option>';
    
    grades.forEach(grade => {
        const option = document.createElement('option');
        option.value = grade._id;
        option.textContent = grade.value;
        select.appendChild(option);
    });
}

// Populate categories dropdown
function populateCategoriesSelect() {
    const select = document.getElementById('category-select');
    select.innerHTML = '<option value="">Select Category...</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category._id;
        option.textContent = category.name;
        select.appendChild(option);
    });
    
    enableCategorySelect();
}

// Display subjects in main content area
function displaySubjects() {
    const contentGrid = document.getElementById('content-grid');
    const emptyState = document.getElementById('empty-state');
    
    if (subjects.length === 0) {
        contentGrid.style.display = 'none';
        emptyState.style.display = 'block';
        emptyState.innerHTML = `
            <i class="fas fa-book-open"></i>
            <h3>No Subjects Available</h3>
            <p>No subjects found for your current selections</p>
        `;
    } else {
        emptyState.style.display = 'none';
        contentGrid.style.display = 'grid';
        contentGrid.innerHTML = '';
        
        subjects.forEach(subject => {
            const card = createSubjectCard(subject);
            contentGrid.appendChild(card);
        });
    }
    
    updateContentHeader('Subjects', `${subjects.length} subjects found`);
}

// Display topics in main content area
function displayTopics() {
    const contentGrid = document.getElementById('content-grid');
    const emptyState = document.getElementById('empty-state');
    
    if (topics.length === 0) {
        contentGrid.style.display = 'none';
        emptyState.style.display = 'block';
        emptyState.innerHTML = `
            <i class="fas fa-lightbulb"></i>
            <h3>No Topics Available</h3>
            <p>No topics found for this subject and term</p>
        `;
    } else {
        emptyState.style.display = 'none';
        contentGrid.style.display = 'grid';
        contentGrid.innerHTML = '';
        
        topics.forEach(topic => {
            const card = createTopicCard(topic);
            contentGrid.appendChild(card);
        });
    }
    
    updateContentHeader('Topics', `${topics.length} topics found`);
}

// Display folders in sidebar
function displayFolders() {
    const foldersList = document.getElementById('folders-list');
    const foldersSection = document.getElementById('folders-section');
    
    if (folders.length === 0) {
        foldersList.innerHTML = '<li class="nav-item"><div class="nav-link"><i class="fas fa-info-circle"></i> No folders available</div></li>';
    } else {
        foldersList.innerHTML = '';
        folders.forEach(folder => {
            const li = document.createElement('li');
            li.className = 'nav-item';
            li.innerHTML = `
                <div class="nav-link" onclick="selectFolder('${folder._id}', '${folder.name}')">
                    <i class="fas fa-folder"></i>
                    <span>${folder.name}</span>
                    ${folder.description ? `<span class="badge">${folder.description}</span>` : ''}
                </div>
            `;
            foldersList.appendChild(li);
        });
    }
    
    foldersSection.style.display = 'block';
}

// Display materials in main content area
function displayMaterials() {
    const contentGrid = document.getElementById('content-grid');
    const emptyState = document.getElementById('empty-state');
    
    if (materials.length === 0) {
        contentGrid.style.display = 'none';
        emptyState.style.display = 'block';
        emptyState.innerHTML = `
            <i class="fas fa-folder-open"></i>
            <h3>No Materials Available</h3>
            <p>There are no materials in this folder yet.</p>
        `;
    } else {
        emptyState.style.display = 'none';
        contentGrid.style.display = 'grid';
        contentGrid.innerHTML = '';
        
        materials.forEach(material => {
            const card = createMaterialCard(material);
            contentGrid.appendChild(card);
        });
    }
}

// Create subject card
function createSubjectCard(subject) {
    const card = document.createElement('div');
    card.className = 'content-card';
    card.onclick = () => selectSubject(subject._id, subject.name);
    
    const icon = getSubjectIcon(subject.name);
    const termLabel = subject.term ? `Term ${subject.term}` : 'All Terms';
    
    card.innerHTML = `
        <div class="content-icon">
            <i class="${icon}"></i>
        </div>
        <h3 class="content-title">${subject.name}</h3>
        <p class="content-description">${subject.description || 'Explore teaching materials for this subject'}</p>
        <div class="content-meta">
            <div class="content-type">
                <i class="fas fa-book-open"></i>
                <span>${termLabel}</span>
            </div>
            <div class="content-date">
                <i class="fas fa-chalkboard-teacher"></i>
                <span>${subject.phase || 'All Phases'}</span>
            </div>
        </div>
    `;
    
    return card;
}

// Create topic card
function createTopicCard(topic) {
    const card = document.createElement('div');
    card.className = 'content-card';
    card.onclick = () => selectTopic(topic._id, topic.name);
    
    const icon = getTopicIcon(topic.name);
    const termLabel = topic.term ? `Term ${topic.term}` : 'All Terms';
    const orderLabel = topic.order ? `Order ${topic.order}` : '';
    
    card.innerHTML = `
        <div class="content-icon">
            <i class="${icon}"></i>
        </div>
        <h3 class="content-title">${topic.name}</h3>
        <p class="content-description">${topic.description || 'Explore teaching materials for this topic'}</p>
        <div class="content-meta">
            <div class="content-type">
                <i class="fas fa-lightbulb"></i>
                <span>${termLabel}</span>
            </div>
            <div class="content-date">
                ${orderLabel ? `<i class="fas fa-sort-numeric-up"></i><span>${orderLabel}</span>` : ''}
            </div>
        </div>
    `;
    
    return card;
}

// Create material card
function createMaterialCard(material) {
    const card = document.createElement('div');
    card.className = 'content-card';
    card.onclick = () => openMaterial(material);
    
    const icon = getMaterialIcon(material.type);
    const typeLabel = getMaterialTypeLabel(material.type);
    const date = new Date(material.createdAt || material.uploadedAt).toLocaleDateString();
    
    card.innerHTML = `
        <div class="content-icon">
            <i class="${icon}"></i>
        </div>
        <h3 class="content-title">${material.title}</h3>
        <p class="content-description">${material.description || 'No description available'}</p>
        <div class="content-meta">
            <div class="content-type">
                <i class="fas fa-file"></i>
                <span>${typeLabel}</span>
            </div>
            <div class="content-date">
                <i class="fas fa-calendar"></i>
                <span>${date}</span>
            </div>
        </div>
    `;
    
    return card;
}

// Handle subject selection
function selectSubject(subjectId, subjectName) {
    currentSelection.subject = subjectId;
    currentSelection.topic = '';
    currentSelection.folder = '';
    
    hideTopics();
    hideFolders();
    hideContent();
    
    loadTopics();
}

// Handle topic selection
function selectTopic(topicId, topicName) {
    currentSelection.topic = topicId;
    currentSelection.folder = '';
    
    hideFolders();
    hideContent();
    
    loadFolders(topicId);
}

// Handle folder selection
function selectFolder(folderId, folderName) {
    currentSelection.folder = folderId;
    
    updateActiveState('folders-list', folderId);
    hideContent();
    
    loadMaterials(folderId);
}

// Open material for viewing
function openMaterial(material) {
    if (material.url) {
        window.open(material.url, '_blank');
    } else if (material.filePath) {
        const fileUrl = material.filePath.startsWith('/') ? material.filePath : `/${material.filePath}`;
        window.open(fileUrl, '_blank');
    } else {
        showError('Material file not found');
    }
}

// Helper functions
function getSubjectIcon(subjectName) {
    const name = subjectName.toLowerCase();
    if (name.includes('math') || name.includes('mathematics')) return 'fas fa-calculator';
    if (name.includes('science')) return 'fas fa-flask';
    if (name.includes('english') || name.includes('language')) return 'fas fa-language';
    if (name.includes('history')) return 'fas fa-history';
    if (name.includes('geography')) return 'fas fa-globe';
    if (name.includes('art')) return 'fas fa-palette';
    if (name.includes('music')) return 'fas fa-music';
    if (name.includes('sport') || name.includes('physical')) return 'fas fa-running';
    if (name.includes('technology') || name.includes('computer')) return 'fas fa-laptop';
    if (name.includes('business') || name.includes('commerce')) return 'fas fa-briefcase';
    if (name.includes('life') || name.includes('orientation')) return 'fas fa-heart';
    return 'fas fa-book-open';
}

function getTopicIcon(topicName) {
    const name = topicName.toLowerCase();
    if (name.includes('introduction') || name.includes('intro')) return 'fas fa-door-open';
    if (name.includes('basic') || name.includes('foundation')) return 'fas fa-cube';
    if (name.includes('advanced') || name.includes('complex')) return 'fas fa-layer-group';
    if (name.includes('numbers') || name.includes('counting')) return 'fas fa-hashtag';
    if (name.includes('algebra') || name.includes('equation')) return 'fas fa-equals';
    if (name.includes('geometry') || name.includes('shape')) return 'fas fa-shapes';
    if (name.includes('measurement')) return 'fas fa-ruler';
    if (name.includes('data') || name.includes('statistics')) return 'fas fa-chart-bar';
    if (name.includes('physics')) return 'fas fa-atom';
    if (name.includes('chemistry')) return 'fas fa-vial';
    if (name.includes('biology') || name.includes('life')) return 'fas fa-dna';
    if (name.includes('reading') || name.includes('literature')) return 'fas fa-book-reader';
    if (name.includes('writing') || name.includes('composition')) return 'fas fa-pen';
    if (name.includes('grammar')) return 'fas fa-spell-check';
    if (name.includes('vocabulary')) return 'fas fa-spell-check';
    if (name.includes('earth') || name.includes('planet')) return 'fas fa-globe-africa';
    if (name.includes('weather') || name.includes('climate')) return 'fas fa-cloud-sun';
    if (name.includes('energy') || name.includes('power')) return 'fas fa-bolt';
    if (name.includes('force') || name.includes('motion')) return 'fas fa-arrows-alt';
    return 'fas fa-lightbulb';
}

function getMaterialIcon(type) {
    const icons = {
        'video': 'fas fa-video',
        'document': 'fas fa-file-pdf',
        'pdf': 'fas fa-file-pdf',
        'image': 'fas fa-image',
        'audio': 'fas fa-audio',
        'quiz': 'fas fa-question-circle',
        'presentation': 'fas fa-presentation'
    };
    return icons[type] || 'fas fa-file';
}

function getMaterialTypeLabel(type) {
    const labels = {
        'video': 'Video',
        'document': 'Document',
        'pdf': 'PDF',
        'image': 'Image',
        'audio': 'Audio',
        'quiz': 'Quiz',
        'presentation': 'Presentation'
    };
    return labels[type] || 'File';
}

// UI State Management
function enableCategorySelect() {
    document.getElementById('category-select').disabled = false;
}

function disableCategorySelect() {
    document.getElementById('category-select').disabled = true;
}

function enableTermSelect() {
    document.getElementById('term-select').disabled = false;
}

function disableTermSelect() {
    document.getElementById('term-select').disabled = true;
}

function resetCategories() {
    document.getElementById('category-select').innerHTML = '<option value="">Select Category...</option>';
    disableCategorySelect();
}

function resetTerms() {
    document.getElementById('term-select').value = '';
}

function hideSubjects() {
    document.getElementById('content-grid').style.display = 'none';
    document.getElementById('empty-state').style.display = 'block';
    document.getElementById('empty-state').innerHTML = `
        <i class="fas fa-chalkboard-teacher"></i>
        <h3>Select from Sidebar</h3>
        <p>Choose grade, category, and term to view subjects</p>
    `;
}

function hideTopics() {
    document.getElementById('content-grid').style.display = 'none';
    document.getElementById('empty-state').style.display = 'block';
    document.getElementById('empty-state').innerHTML = `
        <i class="fas fa-lightbulb"></i>
        <h3>Select a Subject First</h3>
        <p>Choose a subject to view available topics</p>
    `;
}

function hideFolders() {
    document.getElementById('folders-section').style.display = 'none';
    document.getElementById('folders-list').innerHTML = '';
}

function hideContent() {
    document.getElementById('content-grid').style.display = 'none';
    document.getElementById('empty-state').style.display = 'block';
    document.getElementById('empty-state').innerHTML = `
        <i class="fas fa-chalkboard-teacher"></i>
        <h3>Select from Sidebar</h3>
        <p>Choose a subject, topic, or folder from the sidebar to view materials</p>
    `;
}

function updateActiveState(listId, selectedId) {
    const allLinks = document.querySelectorAll(`#${listId} .nav-link`);
    allLinks.forEach(link => link.classList.remove('active'));
    
    const selectedLink = Array.from(allLinks).find(link => 
        link.onclick && link.onclick.toString().includes(selectedId)
    );
    if (selectedLink) {
        selectedLink.classList.add('active');
    }
}

function updateContentHeader(title, description) {
    document.getElementById('content-title').textContent = title;
    document.getElementById('content-description').textContent = description;
    
    const filterContainer = document.getElementById('material-filter-container');
    if (title === 'Materials') {
        filterContainer.style.display = 'block';
        const typeFilter = document.getElementById('material-type-filter');
        if (typeFilter && !typeFilter.hasAttribute('data-listener')) {
            typeFilter.setAttribute('data-listener', 'true');
            typeFilter.addEventListener('change', loadMaterials);
        }
    } else {
        filterContainer.style.display = 'none';
    }
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #dc2626;
        padding: 15px;
        border-radius: 8px;
        z-index: 10000;
        max-width: 300px;
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

// Mobile sidebar toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.querySelector('.mobile-menu-toggle');
    
    if (window.innerWidth <= 768 && 
        !sidebar.contains(event.target) && 
        !toggle.contains(event.target) &&
        sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
    }
});

// Handle window resize
window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
});

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
let currentQuiz = null;
let currentQuizIndex = 0;
let quizAnswers = {};

// Initialize grade selection page
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

function initializePage() {
    loadSelectedPhase();
    setupEventListeners();
}

// Load selected phase from sessionStorage
function loadSelectedPhase() {
    const selectedPhase = sessionStorage.getItem('selectedPhase');
    if (selectedPhase) {
        currentSelection.phase = selectedPhase;
        updatePhaseInfo(selectedPhase);
        loadGrades(selectedPhase);
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
        const response = await fetch(`${API_BASE}/grades?phase=${phase}&targetAudience=student`);
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
        const response = await fetch(`${API_BASE}/categories?grade=${gradeId}&targetAudience=student`);
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
        const response = await fetch(`${API_BASE}/subjects?phase=${currentSelection.phase}&grade=${currentSelection.grade}&category=${currentSelection.category}&targetAudience=student&t=${Date.now()}`);
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
        
        // Debug: Log the current selections
        console.log('Loading topics with selections:', currentSelection);
        
        const apiUrl = `${API_BASE}/topics?phase=${currentSelection.phase}&grade=${currentSelection.grade}&subject=${currentSelection.subject}&term=${currentSelection.term}&isActive=true&targetAudience=student&t=${Date.now()}`;
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
        
        // Debug: Log the current selections and topic
        console.log('Loading folders with selections:', currentSelection);
        console.log('Topic ID:', topicId);
        
        const apiUrl = `${API_BASE}/folders/student?grade=${currentSelection.grade}&subject=${currentSelection.subject}&phase=${currentSelection.phase}&term=${currentSelection.term}&topic=${topicId}&targetAudience=student`;
        console.log('Folders API URL:', apiUrl);
        
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to load folders');
        
        const data = await response.json();
        folders = data.folders || [];
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
async function loadMaterials(folderId = currentSelection.folder) {
    try {
        showLoading();
        const selectedFolderId = typeof folderId === 'string' ? folderId : currentSelection.folder;
        
        // Debug: Log the current selections and folder
        console.log('Loading materials with selections:', currentSelection);
        console.log('Folder ID:', selectedFolderId);
        
        // Get type filter value
        const typeFilter = document.getElementById('material-type-filter');
        const selectedType = typeFilter ? typeFilter.value : '';
        
        // Build API URL with filters for students
        let apiUrl = `${API_BASE}/materials?phase=${currentSelection.phase}&grade=${currentSelection.grade}&subject=${currentSelection.subject}&term=${currentSelection.term}&folder=${selectedFolderId}&targetAudience=student&t=${Date.now()}`;
        
        // Add type filter if selected
        if (selectedType) {
            apiUrl += `&type=${selectedType}`;
        }
        
        console.log('Materials API URL:', apiUrl);
        console.log('About to make fetch call to:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('Fetch response status:', response.status);
        if (!response.ok) throw new Error('Failed to load materials');
        
        const loadedMaterials = await response.json();
        let loadedQuizzes = [];

        if (!selectedType || selectedType === 'quiz') {
            const quizUrl = `${API_BASE}/quizzes?phase=${currentSelection.phase}&grade=${currentSelection.grade}&subject=${currentSelection.subject}&term=${currentSelection.term}&folder=${selectedFolderId}&targetAudience=student&t=${Date.now()}`;
            const quizResponse = await fetch(quizUrl);
            loadedQuizzes = quizResponse.ok ? await quizResponse.json() : [];
        }

        const materialMap = new Map();
        [...loadedMaterials, ...loadedQuizzes].forEach(item => {
            if (!selectedType || item.type === selectedType) {
                materialMap.set(item._id, item);
            }
        });

        materials = Array.from(materialMap.values());
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
    const date = new Date(subject.createdAt).toLocaleDateString();
    
    card.innerHTML = `
        <div class="content-icon">
            <i class="${icon}"></i>
        </div>
        <h3 class="content-title">${subject.name}</h3>
        <p class="content-description">${subject.description || 'Explore learning materials for this subject'}</p>
        <div class="content-meta">
            <div class="content-type">
                <i class="fas fa-book-open"></i>
                <span>${termLabel}</span>
            </div>
            <div class="content-date">
                <i class="fas fa-graduation-cap"></i>
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
        <p class="content-description">${topic.description || 'Explore learning materials for this topic'}</p>
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
    if (material.type === 'quiz') {
        return createQuizCard(material);
    }

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

function createQuizCard(quiz) {
    const card = document.createElement('div');
    card.className = 'content-card quiz-card';

    const questionCount = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
    const duration = quiz.duration ? `${quiz.duration} min` : 'Untimed';
    const gradeLabel = quiz.grade && (quiz.grade.value || quiz.grade.name) ? (quiz.grade.value || quiz.grade.name) : 'Current grade';

    card.innerHTML = `
        <div class="content-icon">
            <i class="fas fa-clipboard-question"></i>
        </div>
        <h3 class="content-title">${escapeHtml(quiz.title || 'Untitled Quiz')}</h3>
        <p class="content-description">${escapeHtml(quiz.description || 'Attempt this quiz when you are ready.')}</p>
        <div class="quiz-activity-meta">
            <span><i class="fas fa-list-ol"></i> ${questionCount} question${questionCount === 1 ? '' : 's'}</span>
            <span><i class="fas fa-clock"></i> ${duration}</span>
            <span><i class="fas fa-graduation-cap"></i> ${escapeHtml(gradeLabel)}</span>
        </div>
        <button type="button" class="quiz-attempt-button" onclick="startQuiz('${quiz._id}')">
            <i class="fas fa-play"></i> Attempt quiz now
        </button>
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
    if (material.type === 'quiz') {
        startQuiz(material._id);
        return;
    }

    if (material.url) {
        window.open(material.url, '_blank');
    } else if (material.filePath) {
        // Try opening with filePath if url is not available
        const fileUrl = material.filePath.startsWith('/') ? material.filePath : `/${material.filePath}`;
        window.open(fileUrl, '_blank');
    } else {
        showError('Material file not found');
    }
}

async function startQuiz(quizId) {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/quizzes/${quizId}`);
        if (!response.ok) throw new Error('Failed to load quiz');

        currentQuiz = await response.json();
        currentQuizIndex = 0;
        quizAnswers = {};
        hideLoading();
        showQuizIntro();
    } catch (error) {
        console.error('Error loading quiz:', error);
        hideLoading();
        showError('Failed to load quiz. Please try again.');
    }
}

function showQuizIntro() {
    const questions = getQuizQuestions();
    const duration = currentQuiz.duration ? `${currentQuiz.duration} minutes` : 'No time limit';
    const modal = document.getElementById('quiz-modal');
    const inner = document.getElementById('quiz-modal-inner');

    inner.innerHTML = `
        <div class="quiz-moodle-header">
            <div>
                <h2>${escapeHtml(currentQuiz.title || 'Quiz')}</h2>
                <p class="content-description">Quiz activity</p>
            </div>
            <button class="quiz-nav-button secondary" onclick="closeQuizModal()">
                <i class="fas fa-times"></i> Close
            </button>
        </div>
        <div class="quiz-moodle-body">
            <p>${escapeHtml(currentQuiz.description || 'Complete the questions below and submit your attempt when you are done.')}</p>
            <div class="quiz-info-table">
                <div class="quiz-info-row"><strong>Attempts allowed</strong><span>1</span></div>
                <div class="quiz-info-row"><strong>Time limit</strong><span>${duration}</span></div>
                <div class="quiz-info-row"><strong>Questions</strong><span>${questions.length}</span></div>
                <div class="quiz-info-row"><strong>Grading method</strong><span>Highest grade</span></div>
            </div>
            <div class="quiz-nav">
                <button class="quiz-nav-button secondary" onclick="closeQuizModal()">Cancel</button>
                <button class="quiz-nav-button primary" onclick="beginQuizAttempt()">Attempt quiz now</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

function beginQuizAttempt() {
    currentQuizIndex = 0;
    renderQuizQuestion();
}

function renderQuizQuestion() {
    const questions = getQuizQuestions();
    const question = questions[currentQuizIndex];
    const inner = document.getElementById('quiz-modal-inner');

    if (!question) {
        showQuizResults();
        return;
    }

    const answers = getQuestionAnswers(question);
    const selectedAnswer = quizAnswers[currentQuizIndex];

    inner.innerHTML = `
        <div class="quiz-moodle-header">
            <div>
                <h2>${escapeHtml(currentQuiz.title || 'Quiz')}</h2>
                <p class="content-description">Question ${currentQuizIndex + 1} of ${questions.length}</p>
            </div>
            <button class="quiz-nav-button secondary" onclick="closeQuizModal()">
                <i class="fas fa-times"></i> Close
            </button>
        </div>
        <div class="quiz-moodle-body">
            <div class="quiz-question-panel">
                <div class="quiz-question-title">
                    <span>Question ${currentQuizIndex + 1}</span>
                    <span>Not yet graded</span>
                </div>
                <div class="quiz-question-content">
                    <p>${escapeHtml(getQuestionText(question))}</p>
                    <div>
                        ${answers.map((answer, index) => `
                            <label class="quiz-answer-option">
                                <input type="radio" name="quiz-answer" value="${index}" ${selectedAnswer === index ? 'checked' : ''} onchange="selectQuizAnswer(${index})">
                                <span>${escapeHtml(getAnswerText(answer))}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="quiz-nav">
                <button class="quiz-nav-button secondary" onclick="previousQuizQuestion()" ${currentQuizIndex === 0 ? 'disabled' : ''}>
                    <i class="fas fa-arrow-left"></i> Previous page
                </button>
                ${currentQuizIndex === questions.length - 1 ? `
                    <button class="quiz-nav-button primary" onclick="showQuizSummary()">Finish attempt</button>
                ` : `
                    <button class="quiz-nav-button primary" onclick="nextQuizQuestion()">Next page <i class="fas fa-arrow-right"></i></button>
                `}
            </div>
        </div>
    `;
}

function selectQuizAnswer(answerIndex) {
    quizAnswers[currentQuizIndex] = answerIndex;
}

function nextQuizQuestion() {
    const questions = getQuizQuestions();
    if (currentQuizIndex < questions.length - 1) {
        currentQuizIndex++;
        renderQuizQuestion();
    }
}

function previousQuizQuestion() {
    if (currentQuizIndex > 0) {
        currentQuizIndex--;
        renderQuizQuestion();
    }
}

function showQuizSummary() {
    const questions = getQuizQuestions();
    const answered = Object.keys(quizAnswers).length;
    const inner = document.getElementById('quiz-modal-inner');

    inner.innerHTML = `
        <div class="quiz-moodle-header">
            <div>
                <h2>Summary of attempt</h2>
                <p class="content-description">${escapeHtml(currentQuiz.title || 'Quiz')}</p>
            </div>
            <button class="quiz-nav-button secondary" onclick="closeQuizModal()">
                <i class="fas fa-times"></i> Close
            </button>
        </div>
        <div class="quiz-moodle-body">
            <div class="quiz-info-table">
                ${questions.map((question, index) => `
                    <div class="quiz-info-row">
                        <strong>Question ${index + 1}</strong>
                        <span>${quizAnswers[index] === undefined ? 'Not yet answered' : 'Answer saved'}</span>
                    </div>
                `).join('')}
            </div>
            <p>${answered} of ${questions.length} questions answered.</p>
            <div class="quiz-nav">
                <button class="quiz-nav-button secondary" onclick="renderQuizQuestion()">Return to attempt</button>
                <button class="quiz-nav-button primary" onclick="submitQuizAttempt()">Submit all and finish</button>
            </div>
        </div>
    `;
}

function submitQuizAttempt() {
    showQuizResults();
}

function showQuizResults() {
    const results = calculateQuizResults();
    const inner = document.getElementById('quiz-modal-inner');

    inner.innerHTML = `
        <div class="quiz-moodle-header">
            <div>
                <h2>Review of attempt</h2>
                <p class="content-description">${escapeHtml(currentQuiz.title || 'Quiz')}</p>
            </div>
            <button class="quiz-nav-button secondary" onclick="closeQuizModal()">
                <i class="fas fa-times"></i> Close
            </button>
        </div>
        <div class="quiz-moodle-body">
            <div class="quiz-result-summary">
                <h3>Grade: ${results.percentage}%</h3>
                <p>${results.correct} correct, ${results.incorrect} incorrect, ${results.skipped} not answered.</p>
            </div>
            ${getQuizQuestions().map((question, index) => renderReviewQuestion(question, index)).join('')}
            <div class="quiz-nav">
                <button class="quiz-nav-button primary" onclick="closeQuizModal()">Finish review</button>
            </div>
        </div>
    `;
}

function renderReviewQuestion(question, index) {
    const answers = getQuestionAnswers(question);
    const userAnswer = quizAnswers[index];
    const correctAnswer = getCorrectAnswerIndex(question);
    const status = userAnswer === undefined ? 'Not answered' : userAnswer === correctAnswer ? 'Correct' : 'Incorrect';

    return `
        <div class="quiz-question-panel">
            <div class="quiz-question-title">
                <span>Question ${index + 1}</span>
                <span>${status}</span>
            </div>
            <div class="quiz-question-content">
                <p>${escapeHtml(getQuestionText(question))}</p>
                ${answers.map((answer, answerIndex) => {
                    const label = answerIndex === userAnswer ? 'Your answer' : answerIndex === correctAnswer ? 'Correct answer' : '';
                    return `<div class="quiz-answer-option"><span>${escapeHtml(getAnswerText(answer))}</span>${label ? `<strong>${label}</strong>` : ''}</div>`;
                }).join('')}
            </div>
        </div>
    `;
}

function calculateQuizResults() {
    const questions = getQuizQuestions();
    let correct = 0;
    let skipped = 0;

    questions.forEach((question, index) => {
        if (quizAnswers[index] === undefined) {
            skipped++;
        } else if (quizAnswers[index] === getCorrectAnswerIndex(question)) {
            correct++;
        }
    });

    const total = questions.length || 1;
    const incorrect = total - correct - skipped;
    return {
        correct,
        incorrect,
        skipped,
        total,
        percentage: Math.round((correct / total) * 100)
    };
}

function closeQuizModal() {
    document.getElementById('quiz-modal').style.display = 'none';
    currentQuiz = null;
    currentQuizIndex = 0;
    quizAnswers = {};
}

function getQuizQuestions() {
    return Array.isArray(currentQuiz && currentQuiz.questions) ? currentQuiz.questions : [];
}

function getQuestionText(question) {
    return question.question || question.text || 'Question';
}

function getQuestionAnswers(question) {
    return Array.isArray(question.answers) ? question.answers : (Array.isArray(question.options) ? question.options : []);
}

function getAnswerText(answer) {
    return typeof answer === 'string' ? answer : (answer.text || answer.answer || '');
}

function getCorrectAnswerIndex(question) {
    if (question.correctAnswer !== undefined) return Number(question.correctAnswer);
    if (question.correct !== undefined) return Number(question.correct);
    const answers = getQuestionAnswers(question);
    const foundIndex = answers.findIndex(answer => answer && typeof answer === 'object' && answer.isCorrect);
    return foundIndex >= 0 ? foundIndex : -1;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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
    // Subjects are now displayed in main content, so just hide the content grid
    document.getElementById('content-grid').style.display = 'none';
    document.getElementById('empty-state').style.display = 'block';
    document.getElementById('empty-state').innerHTML = `
        <i class="fas fa-graduation-cap"></i>
        <h3>Select from Sidebar</h3>
        <p>Choose grade, category, and term to view subjects</p>
    `;
}

function hideTopics() {
    // Topics are now displayed in main content, so just hide the content grid
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
        <i class="fas fa-graduation-cap"></i>
        <h3>Select from Sidebar</h3>
        <p>Choose a subject, topic, or folder from the sidebar to view materials</p>
    `;
}

function updateActiveState(listId, selectedId) {
    // Remove active class from all items
    const allLinks = document.querySelectorAll(`#${listId} .nav-link`);
    allLinks.forEach(link => link.classList.remove('active'));
    
    // Add active class to selected item
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
    
    // Show/hide material type filter based on content type
    const filterContainer = document.getElementById('material-filter-container');
    if (title === 'Materials') {
        filterContainer.style.display = 'block';
        // Add event listener for type filter if not already added
        const typeFilter = document.getElementById('material-type-filter');
        if (typeFilter && !typeFilter.hasAttribute('data-listener')) {
            typeFilter.setAttribute('data-listener', 'true');
            typeFilter.addEventListener('change', () => loadMaterials(currentSelection.folder));
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
    // Create error notification
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

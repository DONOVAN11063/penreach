// API Base URL
const API_BASE = '/api';

// Initialize the homepage
document.addEventListener('DOMContentLoaded', function() {
    initializeHomepage();
});

function initializeHomepage() {
    loadLearningPhases();
    loadStatistics();
    loadMaterials();
    setupSmoothScrolling();
    setupNavigation();
    setupMaterialsFilters();
}

// Load learning phases from API
async function loadLearningPhases() {
    try {
        const response = await fetch(`${API_BASE}/grades?targetAudience=student`);
        if (!response.ok) throw new Error('Failed to load grades');
        
        const grades = await response.json();
        displayLearningPhases(grades);
    } catch (error) {
        console.error('Error loading learning phases:', error);
        displayErrorPhases();
    }
}

// Display learning phases in cards
function displayLearningPhases(grades) {
    const loadingElement = document.getElementById('phases-loading');
    const gridElement = document.getElementById('phases-grid');
    
    // Group grades by phase
    const phases = {
        'Foundation': [],
        'Intermediate': [],
        'Senior': [],
        'FET': []
    };
    
    grades.forEach(grade => {
        if (phases[grade.phase]) {
            phases[grade.phase].push(grade);
        }
    });
    
    // Hide loading and show grid
    loadingElement.style.display = 'none';
    gridElement.style.display = 'grid';
    
    // Create phase cards
    const phaseData = [
        {
            name: 'Foundation',
            icon: 'fa-child',
            description: 'Building strong foundations for early learning',
            grades: phases['Foundation']
        },
        {
            name: 'Intermediate',
            icon: 'fa-school',
            description: 'Developing core skills and knowledge',
            grades: phases['Intermediate']
        },
        {
            name: 'Senior',
            icon: 'fa-user-graduate',
            description: 'Advanced learning and specialization',
            grades: phases['Senior']
        },
        {
            name: 'FET',
            icon: 'fa-university',
            description: 'Further Education and Training preparation',
            grades: phases['FET']
        }
    ];
    
    gridElement.innerHTML = '';
    
    phaseData.forEach(phase => {
        const phaseCard = createPhaseCard(phase);
        gridElement.appendChild(phaseCard);
    });
}

// Create individual phase card
function createPhaseCard(phase) {
    const card = document.createElement('div');
    card.className = 'phase-card';
    card.onclick = () => navigateToPhase(phase.name);
    
    const gradeCount = phase.grades ? phase.grades.length : 0;
    
    card.innerHTML = `
        <div class="phase-icon">
            <i class="fas ${phase.icon}"></i>
        </div>
        <h3>${phase.name} Phase</h3>
        <p>${phase.description}</p>
        <p style="margin-top: 10px; font-weight: 600; color: #667eea;">
            ${gradeCount} grade level${gradeCount !== 1 ? 's' : ''} available
        </p>
    `;
    
    return card;
}

// Navigate to phase selection
async function navigateToPhase(phaseName) {
    try {
        const response = await fetch(`${API_BASE}/grades?targetAudience=student`);
        if (!response.ok) throw new Error('Failed to load grades');

        const grades = await response.json();
        const phaseGrades = grades.filter(g => g.phase === phaseName);

        if (phaseGrades.length === 0) {
            showToast('error', 'Error', 'No grades found for this phase');
            return;
        }

        showGradeSelection(phaseName, phaseGrades);
    } catch (error) {
        console.error('Error loading grades:', error);
        showToast('error', 'Error', 'Failed to load grades');
    }
}

// Show grade selection modal
function showGradeSelection(phaseName, grades) {
    const phasesSection = document.getElementById('phases');
    const phasesGrid = document.getElementById('phases-grid');

    // Replace phase grid with grade selection
    phasesGrid.innerHTML = `
        <div class="grade-selection-header">
            <button onclick="backToPhases()" class="btn btn-secondary">
                <i class="fas fa-arrow-left"></i> Back to Phases
            </button>
            <h2>${phaseName} Phase - Select Grade</h2>
        </div>
        <div class="grades-grid">
            ${grades.map(grade => `
                <div class="grade-card" onclick="navigateToGrade('${grade._id}', '${grade.value}', '${phaseName}')">
                    <div class="grade-icon">
                        <i class="fas fa-graduation-cap"></i>
                    </div>
                    <h3>${grade.value}</h3>
                    <p>Grade ${grade.value}</p>
                </div>
            `).join('')}
        </div>
    `;
}

// Back to phases
function backToPhases() {
    loadLearningPhases();
}

// Navigate to grade selection
async function navigateToGrade(gradeId, gradeValue, phaseName) {
    try {
        const response = await fetch(`${API_BASE}/content/topics?targetAudience=student&grade=${gradeId}`);
        if (!response.ok) throw new Error('Failed to load topics');

        const topics = await response.json();

        if (topics.length === 0) {
            showToast('error', 'Error', 'No topics found for this grade');
            return;
        }

        showTopicSelection(phaseName, gradeValue, topics);
    } catch (error) {
        console.error('Error loading topics:', error);
        showToast('error', 'Error', 'Failed to load topics');
    }
}

// Show topic selection modal
function showTopicSelection(phaseName, gradeValue, topics) {
    const phasesSection = document.getElementById('phases');
    const phasesGrid = document.getElementById('phases-grid');

    // Replace grade grid with topic selection
    phasesGrid.innerHTML = `
        <div class="topic-selection-header">
            <button onclick="navigateToPhase('${phaseName}')" class="btn btn-secondary">
                <i class="fas fa-arrow-left"></i> Back to Grades
            </button>
            <h2>${phaseName} Phase - Grade ${gradeValue} - Select Topic</h2>
        </div>
        <div class="topics-grid">
            ${topics.map(topic => `
                <div class="topic-card" onclick="navigateToTopic('${topic._id}', '${topic.name}', '${phaseName}', '${gradeValue}')">
                    <div class="topic-icon">
                        <i class="fas fa-book"></i>
                    </div>
                    <h3>${topic.name}</h3>
                    <p>${topic.name}</p>
                </div>
            `).join('')}
        </div>
    `;
}

// Navigate to topic selection
async function navigateToTopic(topicId, topicName, phaseName, gradeValue) {
    try {
        console.log('navigateToTopic called with:', { topicId, topicName, phaseName, gradeValue });

        // Fetch folders for this topic
        const foldersResponse = await fetch(`${API_BASE}/materials?targetAudience=student&type=folder&topic=${topicId}`);
        const folders = foldersResponse.ok ? await foldersResponse.json() : [];
        console.log('Folders loaded:', folders.length);

        // Fetch quizzes for this topic
        let quizzesResponse = await fetch(`${API_BASE}/quizzes?targetAudience=student&topic=${topicId}`);
        console.log('Quiz response status:', quizzesResponse.status);
        let quizzes = quizzesResponse.ok ? await quizzesResponse.json() : [];
        console.log('Quizzes by topic:', quizzes.length, quizzes);

        // If no quizzes found for this topic, try fetching by phase
        if (quizzes.length === 0) {
            console.log('No quizzes found for topic, fetching by phase');
            quizzesResponse = await fetch(`${API_BASE}/quizzes?targetAudience=student&phase=${phaseName}`);
            console.log('Quiz by phase response status:', quizzesResponse.status);
            quizzes = quizzesResponse.ok ? await quizzesResponse.json() : [];
            console.log(`Found ${quizzes.length} quizzes by phase`, quizzes);
        }

        // If still no quizzes, fetch all quizzes for students
        if (quizzes.length === 0) {
            console.log('No quizzes found by phase, fetching all quizzes');
            quizzesResponse = await fetch(`${API_BASE}/quizzes?targetAudience=student`);
            console.log('All quizzes response status:', quizzesResponse.status);
            quizzes = quizzesResponse.ok ? await quizzesResponse.json() : [];
            console.log(`Found ${quizzes.length} quizzes total`, quizzes);
        }

        showTopicContent(phaseName, gradeValue, topicName, folders, quizzes);
    } catch (error) {
        console.error('Error loading topic content:', error);
        showToast('error', 'Error', 'Failed to load topic content');
    }
}

// Show topic content (folders only)
function showTopicContent(phaseName, gradeValue, topicName, folders, quizzes) {
    const phasesSection = document.getElementById('phases');
    const phasesGrid = document.getElementById('phases-grid');

    // Replace topic grid with content
    phasesGrid.innerHTML = `
        <div class="topic-content-header">
            <button onclick="navigateToGrade('', '${gradeValue}', '${phaseName}')" class="btn btn-secondary">
                <i class="fas fa-arrow-left"></i> Back to Topics
            </button>
            <h2>${phaseName} Phase - Grade ${gradeValue} - ${topicName}</h2>
        </div>
        <div class="topic-content-grid">
            ${folders.length === 0 ? `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h3>No Folders Found</h3>
                    <p>No folders available for this topic.</p>
                </div>
            ` : `
                ${folders.map(folder => `
                    <div class="folder-card" onclick="openFolder('${folder._id}', '${folder.name}')">
                        <div class="folder-icon">
                            <i class="fas fa-folder"></i>
                        </div>
                        <h3>${folder.name}</h3>
                        <p>Folder</p>
                    </div>
                `).join('')}
            `}
        </div>
    `;
}

// Open folder and display its contents
async function openFolder(folderId, folderName) {
    try {
        // Fetch materials in this folder (documents, videos, quizzes)
        const materialsResponse = await fetch(`${API_BASE}/materials?targetAudience=student&folder=${folderId}`);
        const materials = materialsResponse.ok ? await materialsResponse.json() : [];

        // Display folder contents
        showFolderContents(folderId, folderName, materials);
    } catch (error) {
        console.error('Error loading folder contents:', error);
        showToast('error', 'Error', 'Failed to load folder contents');
    }
}

// Show folder contents
function showFolderContents(folderId, folderName, materials) {
    const phasesSection = document.getElementById('phases');
    const phasesGrid = document.getElementById('phases-grid');

    // Separate materials by type
    const documents = materials.filter(m => m.type === 'document');
    const videos = materials.filter(m => m.type === 'video');
    const quizzes = materials.filter(m => m.type === 'quiz');

    phasesGrid.innerHTML = `
        <div class="folder-content-header">
            <button onclick="navigateToTopic('', '${folderName}', '', '')" class="btn btn-secondary">
                <i class="fas fa-arrow-left"></i> Back to Folders
            </button>
            <h2>Folder: ${folderName}</h2>
        </div>
        <div class="folder-content-grid">
            ${materials.length === 0 ? `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h3>Folder is Empty</h3>
                    <p>No materials found in this folder.</p>
                </div>
            ` : `
                ${documents.map(doc => `
                    <div class="material-card" onclick="openMaterial('${doc._id}', '${doc.type}')">
                        <div class="material-icon document">
                            <i class="fas fa-file-pdf"></i>
                        </div>
                        <div class="material-title">${doc.title}</div>
                        <div class="material-meta">Document</div>
                    </div>
                `).join('')}
                ${videos.map(video => `
                    <div class="material-card" onclick="openMaterial('${video._id}', '${video.type}')">
                        <div class="material-icon video">
                            <i class="fas fa-video"></i>
                        </div>
                        <div class="material-title">${video.title}</div>
                        <div class="material-meta">Video</div>
                    </div>
                `).join('')}
                ${quizzes.map(quiz => `
                    <div class="quiz-folder-card" onclick="startQuiz('${quiz._id}')">
                        <div class="quiz-folder-icon">
                            <i class="fas fa-question-circle"></i>
                        </div>
                        <h3>${quiz.title}</h3>
                        <p>Quiz ${quiz.duration ? `(${quiz.duration} min)` : ''}</p>
                    </div>
                `).join('')}
            `}
        </div>
    `;
}

// Open material (placeholder for documents and videos)
function openMaterial(materialId, type) {
    if (type === 'quiz') {
        startQuiz(materialId);
    } else {
        alert(`Opening ${type}: ${materialId}\n\nMaterial will be displayed here.`);
    }
}

// Load statistics for the platform
async function loadStatistics() {
    try {
        // Load grades count
        const gradesResponse = await fetch(`${API_BASE}/grades?targetAudience=student`);
        if (gradesResponse.ok) {
            const grades = await gradesResponse.json();
            animateCounter('grades-count', grades.length);
        }
        
        // Load subjects count
        const subjectsResponse = await fetch(`${API_BASE}/subjects?targetAudience=student`);
        if (subjectsResponse.ok) {
            const subjects = await subjectsResponse.json();
            animateCounter('subjects-count', subjects.length);
        }
        
        // Load topics count
        const topicsResponse = await fetch(`${API_BASE}/topics?targetAudience=student`);
        if (topicsResponse.ok) {
            const topics = await topicsResponse.json();
            animateCounter('topics-count', topics.length);
        }
        
        // Load materials count from materials collection
        const materialsResponse = await fetch(`${API_BASE}/materials`);
        let totalMaterials = 0;
        
        if (materialsResponse.ok) {
            const materials = await materialsResponse.json();
            totalMaterials = materials.length;
        }
        
        animateCounter('materials-count', totalMaterials);
        
    } catch (error) {
        console.error('Error loading statistics:', error);
        // Set default values if API fails
        animateCounter('grades-count', 12);
        animateCounter('subjects-count', 8);
        animateCounter('topics-count', 45);
        animateCounter('materials-count', 120);
    }
}

// Load materials from API
async function loadMaterials() {
    console.log('loadMaterials() called');
    
    try {
        const loadingElement = document.getElementById('materials-loading');
        const gridElement = document.getElementById('materials-grid');
        const emptyElement = document.getElementById('materials-empty');
        
        console.log('Elements found:', {
            loading: !!loadingElement,
            grid: !!gridElement,
            empty: !!emptyElement
        });
        
        if (!loadingElement || !gridElement || !emptyElement) {
            console.error('Missing elements in materials section');
            return;
        }
        
        // Show loading
        loadingElement.style.display = 'block';
        gridElement.style.display = 'none';
        emptyElement.style.display = 'none';
        
        console.log('Fetching materials from:', `${API_BASE}/materials`);
        
        // Get filter values
        const typeFilter = document.getElementById('material-type-filter');
        const phaseFilter = document.getElementById('material-phase-filter');
        const selectedType = typeFilter ? typeFilter.value : '';
        const selectedPhase = phaseFilter ? phaseFilter.value : '';
        
        // Build API URL with filters
        let apiUrl = `${API_BASE}/materials`;
        const params = new URLSearchParams();
        
        if (selectedType) params.append('type', selectedType);
        if (selectedPhase) params.append('phase', selectedPhase);
        
        if (params.toString()) {
            apiUrl += '?' + params.toString();
        }
        
        console.log('Fetching materials from:', apiUrl);

        // Fetch filtered materials from the materials collection
        const materialsResponse = await fetch(apiUrl);

        console.log('Materials response status:', materialsResponse.status);

        const materials = [];

        if (materialsResponse.ok) {
            const filteredMaterials = await materialsResponse.json();
            console.log('Filtered materials loaded:', filteredMaterials);
            console.log('Materials count:', filteredMaterials.length);

            materials.push(...filteredMaterials);
            console.log('Total materials to display:', materials.length);
        } else {
            console.error('Materials API failed:', materialsResponse.statusText);
        }

        console.log('Final materials array:', materials);
        
        // Hide loading
        loadingElement.style.display = 'none';
        
        if (materials.length === 0) {
            console.log('No materials found, showing empty state');
            emptyElement.style.display = 'block';
            gridElement.style.display = 'none';
        } else {
            console.log('Materials found, displaying grid');
            emptyElement.style.display = 'none';
            gridElement.style.display = 'grid';
            displayMaterials(materials);
        }
        
    } catch (error) {
        console.error('Error loading materials:', error);
        document.getElementById('materials-loading').style.display = 'none';
        document.getElementById('materials-empty').style.display = 'block';
    }
}

// Display materials in grid
function displayMaterials(materials) {
    console.log('displayMaterials() called with:', materials);
    
    const gridElement = document.getElementById('materials-grid');
    console.log('Grid element found:', !!gridElement);
    
    if (!gridElement) {
        console.error('Materials grid element not found');
        return;
    }
    
    gridElement.innerHTML = '';
    console.log('Grid cleared, adding materials...');
    
    materials.forEach((material, index) => {
        console.log(`Creating card ${index + 1} for material:`, material);
        const card = createMaterialCard(material);
        console.log(`Card ${index + 1} created:`, card);
        gridElement.appendChild(card);
        console.log(`Card ${index + 1} added to grid`);
    });
    
    console.log('All materials displayed in grid');
}

// Create material card element
function createMaterialCard(material) {
    console.log('createMaterialCard() called with:', material);
    
    const card = document.createElement('div');
    card.className = 'material-card';
    
    const iconClass = material.type === 'document' ? 'fa-file-pdf' : 
                     material.type === 'video' ? 'fa-video' : 'fa-question-circle';
    
    const iconColor = material.type === 'document' ? 'document' : 
                      material.type === 'video' ? 'video' : 'quiz';
    
    const gradeValue = material.grade ? (material.grade.value || (material.grade._id ? 'Grade Available' : material.grade)) : '';
    
    const cardHTML = `
        <div class="material-header">
            <div class="material-icon ${iconColor}">
                <i class="fas ${iconClass}"></i>
            </div>
            <div>
                <div class="material-title">${material.title || 'Untitled'}</div>
                <div class="material-meta">
                    ${material.phase ? `Phase: ${material.phase}` : ''} 
                    ${gradeValue ? ` • Grade: ${gradeValue}` : ''}
                </div>
            </div>
        </div>
        ${material.description ? `<div class="material-description">${material.description}</div>` : ''}
        <div class="material-actions">
            ${material.url ? `<a href="${material.url}" target="_blank" class="btn btn-primary">
                <i class="fas fa-external-link-alt"></i> Open
            </a>` : ''}
            ${material.type === 'quiz' ? `<button class="btn btn-secondary" onclick="startQuiz('${material._id}')">
                <i class="fas fa-play"></i> Start Quiz
            </button>` : ''}
        </div>
    `;
    
    console.log('Card HTML generated:', cardHTML);
    card.innerHTML = cardHTML;
    
    console.log('Card element created:', card);
    return card;
}

// Setup materials filters
function setupMaterialsFilters() {
    const typeFilter = document.getElementById('material-type-filter');
    const phaseFilter = document.getElementById('material-phase-filter');
    const refreshBtn = document.getElementById('refresh-materials');
    
    if (typeFilter) {
        typeFilter.addEventListener('change', loadMaterials);
    }
    
    if (phaseFilter) {
        phaseFilter.addEventListener('change', loadMaterials);
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadMaterials);
    }
}

// Quiz state variables
let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = {};
let quizTimer = null;
let timeRemaining = 0;

// Start quiz function
async function startQuiz(quizId) {
    try {
        const response = await fetch(`${API_BASE}/quizzes/${quizId}`);
        if (!response.ok) throw new Error('Failed to load quiz');
        
        const quiz = await response.json();
        currentQuiz = quiz;
        currentQuestionIndex = 0;
        userAnswers = {};
        
        // Show quiz modal with intro screen
        showQuizIntro(quiz);
    } catch (error) {
        console.error('Error loading quiz:', error);
        alert('Failed to load quiz. Please try again.');
    }
}

// Show quiz introduction screen
function showQuizIntro(quiz) {
    const modal = document.getElementById('quiz-modal');
    const introScreen = document.getElementById('quiz-intro');
    const questionScreen = document.getElementById('quiz-question');
    const resultsScreen = document.getElementById('quiz-results');
    const reviewScreen = document.getElementById('quiz-review');
    
    // Hide all screens
    introScreen.style.display = 'block';
    questionScreen.style.display = 'none';
    resultsScreen.style.display = 'none';
    reviewScreen.style.display = 'none';
    
    // Populate intro screen
    document.getElementById('quiz-intro-title').textContent = quiz.title || 'Quiz';
    document.getElementById('quiz-intro-description').textContent = quiz.description || 'Test your knowledge with this quiz.';
    document.getElementById('quiz-intro-duration').textContent = quiz.duration ? `Duration: ${quiz.duration} minutes` : 'Duration: Unlimited';
    document.getElementById('quiz-intro-questions').textContent = `Questions: ${quiz.questions ? quiz.questions.length : 0}`;
    
    // Show modal
    modal.style.display = 'flex';
}

// Start quiz session
function startQuizSession() {
    const introScreen = document.getElementById('quiz-intro');
    const questionScreen = document.getElementById('quiz-question');
    
    introScreen.style.display = 'none';
    questionScreen.style.display = 'block';
    
    // Start timer if duration is set
    if (currentQuiz.duration) {
        timeRemaining = currentQuiz.duration * 60; // Convert to seconds
        startTimer();
    }
    
    // Display first question
    displayQuestion();
}

// Display current question
function displayQuestion() {
    if (!currentQuiz || !currentQuiz.questions || currentQuestionIndex >= currentQuiz.questions.length) {
        return;
    }
    
    const question = currentQuiz.questions[currentQuestionIndex];
    const questionText = document.getElementById('quiz-question-text');
    const answersContainer = document.getElementById('quiz-answers');
    const progressText = document.getElementById('quiz-progress-text');
    const progressFill = document.getElementById('quiz-progress-fill');
    const prevBtn = document.getElementById('quiz-prev-btn');
    const nextBtn = document.getElementById('quiz-next-btn');
    const submitBtn = document.getElementById('quiz-submit-btn');
    
    // Update question text
    questionText.textContent = question.question || question.text || 'Question text';
    
    // Update progress
    const progress = ((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100;
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `Question ${currentQuestionIndex + 1} of ${currentQuiz.questions.length}`;
    
    // Clear and populate answers
    answersContainer.innerHTML = '';
    
    const answers = question.answers || question.options || [];
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    
    answers.forEach((answer, index) => {
        const answerDiv = document.createElement('div');
        answerDiv.className = 'quiz-answer';
        if (userAnswers[currentQuestionIndex] === index) {
            answerDiv.classList.add('selected');
        }
        
        answerDiv.innerHTML = `
            <div class="quiz-answer-letter">${letters[index] || ''}</div>
            <span>${answer.text || answer}</span>
        `;
        
        answerDiv.onclick = () => selectAnswer(index);
        answersContainer.appendChild(answerDiv);
    });
    
    // Update navigation buttons
    prevBtn.style.display = currentQuestionIndex === 0 ? 'none' : 'block';
    
    if (currentQuestionIndex === currentQuiz.questions.length - 1) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'block';
    } else {
        nextBtn.style.display = 'block';
        submitBtn.style.display = 'none';
    }
}

// Select answer
function selectAnswer(answerIndex) {
    userAnswers[currentQuestionIndex] = answerIndex;
    
    // Update visual selection
    const answersContainer = document.getElementById('quiz-answers');
    const answerDivs = answersContainer.querySelectorAll('.quiz-answer');
    
    answerDivs.forEach((div, index) => {
        if (index === answerIndex) {
            div.classList.add('selected');
        } else {
            div.classList.remove('selected');
        }
    });
}

// Navigate to next question
function nextQuestion() {
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
    }
}

// Navigate to previous question
function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
    }
}

// Start timer
function startTimer() {
    const timerElement = document.getElementById('quiz-timer');
    const timerText = document.getElementById('quiz-timer-text');
    
    timerElement.style.display = 'flex';
    updateTimerDisplay();
    
    quizTimer = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 0) {
            clearInterval(quizTimer);
            submitQuiz();
        } else if (timeRemaining <= 60) {
            timerElement.classList.add('warning');
        }
    }, 1000);
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timerText = document.getElementById('quiz-timer-text');
    timerText.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Submit quiz
function submitQuiz() {
    // Stop timer
    if (quizTimer) {
        clearInterval(quizTimer);
    }
    
    // Calculate results
    const results = calculateResults();
    
    // Show results screen
    showResults(results);
}

// Calculate quiz results
function calculateResults() {
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;
    
    currentQuiz.questions.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const correctAnswer = question.correctAnswer || question.correct;
        
        if (userAnswer === undefined) {
            skipped++;
        } else if (userAnswer === correctAnswer) {
            correct++;
        } else {
            incorrect++;
        }
    });
    
    const total = currentQuiz.questions.length;
    const percentage = Math.round((correct / total) * 100);
    
    return {
        correct,
        incorrect,
        skipped,
        total,
        percentage
    };
}

// Show results screen
function showResults(results) {
    const questionScreen = document.getElementById('quiz-question');
    const resultsScreen = document.getElementById('quiz-results');
    
    questionScreen.style.display = 'none';
    resultsScreen.style.display = 'block';
    
    // Update results display
    document.getElementById('quiz-score-percentage').textContent = `${results.percentage}%`;
    document.getElementById('quiz-score-text').textContent = `You scored ${results.correct} out of ${results.total}`;
    document.getElementById('quiz-correct-count').textContent = results.correct;
    document.getElementById('quiz-incorrect-count').textContent = results.incorrect;
    document.getElementById('quiz-skipped-count').textContent = results.skipped;
    
    // Update message based on performance
    const messageElement = document.getElementById('quiz-results-message');
    if (results.percentage >= 80) {
        messageElement.textContent = 'Excellent work! You have a strong understanding of this topic.';
    } else if (results.percentage >= 60) {
        messageElement.textContent = 'Good job! Keep practicing to improve your score.';
    } else if (results.percentage >= 40) {
        messageElement.textContent = 'You\'re making progress. Review the material and try again.';
    } else {
        messageElement.textContent = 'Keep studying! Review the topic and retake the quiz for better results.';
    }
}

// Review answers
function reviewAnswers() {
    const resultsScreen = document.getElementById('quiz-results');
    const reviewScreen = document.getElementById('quiz-review');
    
    resultsScreen.style.display = 'none';
    reviewScreen.style.display = 'block';
    
    const reviewBody = document.getElementById('quiz-review-body');
    reviewBody.innerHTML = '';
    
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    
    currentQuiz.questions.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const correctAnswer = question.correctAnswer || question.correct;
        const answers = question.answers || question.options || [];
        
        let status = 'skipped';
        if (userAnswer === undefined) {
            status = 'skipped';
        } else if (userAnswer === correctAnswer) {
            status = 'correct';
        } else {
            status = 'incorrect';
        }
        
        const reviewItem = document.createElement('div');
        reviewItem.className = `quiz-review-item ${status}`;
        
        let userAnswerText = userAnswer !== undefined ? answers[userAnswer].text || answers[userAnswer] : 'No answer selected';
        let correctAnswerText = answers[correctAnswer].text || answers[correctAnswer];
        
        reviewItem.innerHTML = `
            <div class="quiz-review-question">Question ${index + 1}: ${question.question || question.text}</div>
            <div class="quiz-review-answer user-answer">Your answer: ${userAnswerText}</div>
            <div class="quiz-review-answer correct-answer">Correct answer: ${correctAnswerText}</div>
        `;
        
        reviewBody.appendChild(reviewItem);
    });
}

// Show results screen (from review)
function showResultsScreen() {
    const reviewScreen = document.getElementById('quiz-review');
    const resultsScreen = document.getElementById('quiz-results');
    
    reviewScreen.style.display = 'none';
    resultsScreen.style.display = 'block';
}

// Close quiz modal
function closeQuizModal() {
    const modal = document.getElementById('quiz-modal');
    modal.style.display = 'none';
    
    // Stop timer if running
    if (quizTimer) {
        clearInterval(quizTimer);
    }
    
    // Reset state
    currentQuiz = null;
    currentQuestionIndex = 0;
    userAnswers = {};
    timeRemaining = 0;
    
    // Reset timer display
    const timerElement = document.getElementById('quiz-timer');
    timerElement.classList.remove('warning');
}

// Animate counter from 0 to target value
function animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = targetValue / steps;
    let current = 0;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= targetValue) {
            current = targetValue;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current);
    }, duration / steps);
}

// Display error state for phases
function displayErrorPhases() {
    const loadingElement = document.getElementById('phases-loading');
    const gridElement = document.getElementById('phases-grid');
    
    loadingElement.style.display = 'none';
    gridElement.style.display = 'grid';
    
    gridElement.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f59e0b; margin-bottom: 20px;"></i>
            <h3>Unable to Load Learning Phases</h3>
            <p>Please check your internet connection and refresh the page.</p>
            <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">
                <i class="fas fa-sync"></i> Refresh
            </button>
        </div>
    `;
}

// Setup smooth scrolling for navigation links
function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Setup navigation active state
function setupNavigation() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-menu a[href^="#"]');
    
    function updateActiveNav() {
        const scrollY = window.pageYOffset;
        
        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - 100;
            const sectionId = section.getAttribute('id');
            
            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }
    
    window.addEventListener('scroll', updateActiveNav);
    updateActiveNav(); // Initial call
}

// Add some interactive features
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effect to feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Add ripple effect to CTA button
    const ctaButton = document.querySelector('.cta-button');
    if (ctaButton) {
        ctaButton.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.5);
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                animation: ripple 0.6s ease-out;
                pointer-events: none;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    }
});

// Add CSS animation for ripple effect
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .nav-menu a.active {
        background: rgba(255, 255, 255, 0.3) !important;
    }
`;
document.head.appendChild(style);

// Student logout function
function studentLogout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = 'role-selection.html';
    }
}

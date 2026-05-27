// API Base URL
const API_BASE = '/api';

// Initialize the teacher homepage
document.addEventListener('DOMContentLoaded', function() {
    checkTeacherAuth();
    initializeTeacherHomepage();
});

async function checkTeacherAuth() {
    const teacherToken = localStorage.getItem('teacherToken');
    if (!teacherToken) {
        window.location.href = 'teacher-auth.html';
        return;
    }
    
    // Verify token is still valid
    try {
        const response = await fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${teacherToken}`
            }
        });
        
        if (!response.ok) {
            const data = await response.json();
            // Token is invalid or expired, remove it
            localStorage.removeItem('teacherToken');
            localStorage.removeItem('teacherInfo');
            
            // Log appropriate message based on error code
            if (data.code === 'TOKEN_EXPIRED') {
                console.log('Session expired. Please login again.');
            }
            
            window.location.href = 'teacher-auth.html';
        }
    } catch (error) {
        console.error('Token verification error:', error);
        localStorage.removeItem('teacherToken');
        localStorage.removeItem('teacherInfo');
        window.location.href = 'teacher-auth.html';
    }
}

function initializeTeacherHomepage() {
    loadTeacherInfo();
    loadLearningPhases();
    setupSmoothScrolling();
    setupNavigation();
    setupMaterialsFilters();
}

// Load teacher information
function loadTeacherInfo() {
    const teacherInfo = localStorage.getItem('teacherInfo');
    if (teacherInfo) {
        const teacher = JSON.parse(teacherInfo);
        console.log('Teacher info loaded:', teacher);
    }
}

// Load learning phases from API
async function loadLearningPhases() {
    try {
        const response = await fetch(`${API_BASE}/grades?targetAudience=teacher`);
        if (!response.ok) throw new Error('Failed to load grades');
        
        const grades = await response.json();
        displayLearningPhases(grades);
    } catch (error) {
        console.error('Error loading learning phases:', error);
        displayErrorPhases();
    }
}

// Display learning phases in cards (filtered by teacher's selected phases)
function displayLearningPhases(grades) {
    const loadingElement = document.getElementById('phases-loading');
    const gridElement = document.getElementById('phases-grid');
    
    // Get teacher's selected phases
    const teacherInfo = localStorage.getItem('teacherInfo');
    const teacher = teacherInfo ? JSON.parse(teacherInfo) : null;
    const selectedPhases = teacher ? teacher.phases : [];
    
    console.log('Teacher selected phases:', selectedPhases);
    
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
    
    // Create phase cards (only for teacher's selected phases)
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
    
    // Only show phases that the teacher has selected
    phaseData.forEach(phase => {
        if (selectedPhases.includes(phase.name)) {
            const phaseCard = createPhaseCard(phase);
            gridElement.appendChild(phaseCard);
        }
    });
    
    // If no phases selected, show message
    if (selectedPhases.length === 0) {
        gridElement.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <i class="fas fa-info-circle" style="font-size: 3rem; color: #667eea; margin-bottom: 20px;"></i>
                <h3>No Teaching Phases Selected</h3>
                <p>Please contact an administrator to update your teaching phases.</p>
            </div>
        `;
    }
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

// Navigate to teacher grade selection
function navigateToPhase(phaseName) {
    // Store selected phase in sessionStorage for use in grade selection
    sessionStorage.setItem('selectedPhase', phaseName);
    
    // Navigate to teacher grade selection page
    window.location.href = 'teacher-grade-selection.html';
}

// Load statistics for the platform
async function loadStatistics() {
    try {
        // Load grades count
        const gradesResponse = await fetch(`${API_BASE}/grades?targetAudience=teacher`);
        if (gradesResponse.ok) {
            const grades = await gradesResponse.json();
            animateCounter('grades-count', grades.length);
        }
        
        // Load subjects count
        const subjectsResponse = await fetch(`${API_BASE}/subjects?targetAudience=teacher`);
        if (subjectsResponse.ok) {
            const subjects = await subjectsResponse.json();
            animateCounter('subjects-count', subjects.length);
        }
        
        // Load topics count
        const topicsResponse = await fetch(`${API_BASE}/topics?targetAudience=teacher`);
        if (topicsResponse.ok) {
            const topics = await topicsResponse.json();
            animateCounter('topics-count', topics.length);
        }
        
        // Load materials count from materials collection (filtered for teachers)
        const teacherInfo = localStorage.getItem('teacherInfo');
        const teacher = teacherInfo ? JSON.parse(teacherInfo) : null;
        const selectedPhases = teacher ? teacher.phases : [];
        
        let apiUrl = `${API_BASE}/materials?targetAudience=teacher`;
        if (selectedPhases.length > 0) {
            apiUrl += `&teacherPhases=${JSON.stringify(selectedPhases)}`;
        }
        
        const materialsResponse = await fetch(apiUrl);
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

// Load materials from API (filtered for teachers)
async function loadMaterials() {
    try {
        const loadingElement = document.getElementById('materials-loading');
        const gridElement = document.getElementById('materials-grid');
        const emptyElement = document.getElementById('materials-empty');
        
        if (!loadingElement || !gridElement || !emptyElement) {
            return;
        }
        
        // Show loading
        loadingElement.style.display = 'block';
        gridElement.style.display = 'none';
        emptyElement.style.display = 'none';
        
        // Get teacher's selected phases
        const teacherInfo = localStorage.getItem('teacherInfo');
        const teacher = teacherInfo ? JSON.parse(teacherInfo) : null;
        const selectedPhases = teacher ? teacher.phases : [];
        
        console.log('Teacher selected phases:', selectedPhases);
        
        // Get filter values
        const typeFilter = document.getElementById('material-type-filter');
        const phaseFilter = document.getElementById('material-phase-filter');
        const selectedType = typeFilter ? typeFilter.value : '';
        const selectedPhase = phaseFilter ? phaseFilter.value : '';
        
        // Build API URL with filters
        let apiUrl = `${API_BASE}/materials`;
        const params = new URLSearchParams();
        
        // Always filter for teacher audience
        params.append('targetAudience', 'teacher');
        
        // Filter by teacher's selected phases
        if (selectedPhases.length > 0) {
            params.append('teacherPhases', JSON.stringify(selectedPhases));
        }
        
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

// Start quiz function (placeholder)
function startQuiz(quizId) {
    alert(`Starting quiz with ID: ${quizId}. This feature will be implemented in the next update.`);
}

// Animate counter from 0 to target value
function animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) {
        return;
    }
    
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

// Teacher logout function
function teacherLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('teacherToken');
        localStorage.removeItem('teacherInfo');
        window.location.href = 'role-selection.html';
    }
}

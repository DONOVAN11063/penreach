// API Base URL
const API_BASE = '/api';

// Initialize phase selection page
document.addEventListener('DOMContentLoaded', function() {
    loadPhases();
});

// Load phases and grades from API
async function loadPhases() {
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error-state');
    const gridElement = document.getElementById('phases-grid');
    
    // Show loading, hide error and grid
    loadingElement.style.display = 'block';
    errorElement.style.display = 'none';
    gridElement.style.display = 'none';
    
    try {
        // Load grades from API
        const response = await fetch(`${API_BASE}/grades?targetAudience=student`);
        if (!response.ok) throw new Error('Failed to load grades');
        
        const grades = await response.json();
        displayPhases(grades);
        
        // Hide loading, show grid
        loadingElement.style.display = 'none';
        gridElement.style.display = 'grid';
        
    } catch (error) {
        console.error('Error loading phases:', error);
        showError();
    }
}

// Display phases with their grades
function displayPhases(grades) {
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
    
    // Define phase information
    const phaseData = [
        {
            name: 'Foundation',
            icon: 'fa-child',
            subtitle: 'Early Learning',
            description: 'Building strong foundations for lifelong learning through play-based education and fundamental skills development.',
            grades: phases['Foundation'],
            color: '#10b981'
        },
        {
            name: 'Intermediate',
            icon: 'fa-school',
            subtitle: 'Primary School',
            description: 'Developing core academic skills and critical thinking through structured learning experiences.',
            grades: phases['Intermediate'],
            color: '#3b82f6'
        },
        {
            name: 'Senior',
            icon: 'fa-user-graduate',
            subtitle: 'High School',
            description: 'Advanced learning preparing students for higher education and career pathways.',
            grades: phases['Senior'],
            color: '#8b5cf6'
        },
        {
            name: 'FET',
            icon: 'fa-university',
            subtitle: 'Further Education',
            description: 'Specialized training and education for career readiness and professional development.',
            grades: phases['FET'],
            color: '#f59e0b'
        }
    ];
    
    // Clear existing content
    gridElement.innerHTML = '';
    
    // Create phase cards
    phaseData.forEach(phase => {
        const phaseCard = createPhaseCard(phase);
        gridElement.appendChild(phaseCard);
    });
}

// Create individual phase card
function createPhaseCard(phase) {
    const card = document.createElement('div');
    card.className = 'phase-card';
    card.onclick = () => selectPhase(phase.name);
    
    const gradeCount = phase.grades ? phase.grades.length : 0;
    const gradeList = phase.grades ? phase.grades.map(grade => grade.value).sort() : [];
    
    card.innerHTML = `
        <div class="phase-icon">
            <i class="fas ${phase.icon}" style="color: ${phase.color}"></i>
        </div>
        <h2>${phase.name}</h2>
        <div class="phase-subtitle">${phase.subtitle}</div>
        <p class="phase-description">${phase.description}</p>
        
        <div class="grade-info">
            <h3>Available Grades (${gradeCount})</h3>
            <div class="grade-list">
                ${gradeList.map(grade => `<span class="grade-badge">${grade}</span>`).join('')}
            </div>
        </div>
        
        <button class="select-button">
            <i class="fas fa-arrow-right"></i> Select ${phase.name} Phase
        </button>
    `;
    
    return card;
}

// Handle phase selection
function selectPhase(phaseName) {
    // Store selected phase in sessionStorage for use in next pages
    sessionStorage.setItem('selectedPhase', phaseName);
    
    // Show loading feedback
    showLoadingFeedback(phaseName);
    
    // Navigate to grade selection page
    setTimeout(() => {
        window.location.href = 'grade-selection.html';
    }, 1000);
}

// Show loading feedback when phase is selected
function showLoadingFeedback(phaseName) {
    const cards = document.querySelectorAll('.phase-card');
    cards.forEach(card => {
        if (card.textContent.includes(phaseName)) {
            card.style.opacity = '0.7';
            card.style.pointerEvents = 'none';
            const button = card.querySelector('.select-button');
            if (button) {
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            }
        }
    });
}

// Show phase selection message (temporary until grade selection page is created)
function showPhaseSelectionMessage(phaseName) {
    const phaseDescriptions = {
        'Foundation': 'Foundation Phase includes Grade R to Grade 3, focusing on fundamental literacy, numeracy, and life skills.',
        'Intermediate': 'Intermediate Phase includes Grade 4 to Grade 6, building on foundational knowledge with more complex concepts.',
        'Senior': 'Senior Phase includes Grade 7 to Grade 9, preparing students for senior secondary education.',
        'FET': 'FET Phase includes Grade 10 to Grade 12, specializing in subject areas for career and higher education preparation.'
    };
    
    // Create modal overlay
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            padding: 40px;
            border-radius: 20px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        ">
            <div style="font-size: 3rem; color: #667eea; margin-bottom: 20px;">
                <i class="fas fa-check-circle"></i>
            </div>
            <h2 style="color: #333; margin-bottom: 15px;">${phaseName} Phase Selected!</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                ${phaseDescriptions[phaseName] || 'You have selected the ' + phaseName + ' learning phase.'}
            </p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button onclick="this.closest('div[style*=fixed]').remove()" style="
                    background: #6b7280;
                    color: white;
                    border: none;
                    padding: 12px 25px;
                    border-radius: 25px;
                    cursor: pointer;
                    font-weight: 600;
                ">
                    <i class="fas fa-arrow-left"></i> Back
                </button>
                <button onclick="this.closest('div[style*=fixed]').remove()" style="
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                    border: none;
                    padding: 12px 25px;
                    border-radius: 25px;
                    cursor: pointer;
                    font-weight: 600;
                ">
                    <i class="fas fa-check"></i> Continue
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Remove modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Show error state
function showError() {
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error-state');
    
    loadingElement.style.display = 'none';
    errorElement.style.display = 'block';
}

// Add some interactive features
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effects to phase cards
    const cards = document.querySelectorAll('.phase-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
});

// Add keyboard navigation
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // Close any open modals
        const modals = document.querySelectorAll('div[style*="position: fixed"]');
        modals.forEach(modal => modal.remove());
    }
});

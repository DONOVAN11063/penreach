document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    const loading = document.getElementById('loading');

    // Hide messages initially
    hideMessage(errorMessage);
    hideMessage(successMessage);

    // Form submission handler
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form data
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        // Basic validation
        if (!username || !password) {
            showError('Please enter both username and password');
            return;
        }
        
        // Show loading state
        setLoading(true);
        hideMessage(errorMessage);
        hideMessage(successMessage);
        
        try {
            // Send login request to backend
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Login successful
                showSuccess('Login successful! Redirecting...');
                
                // Store token if provided
                if (data.token) {
                    localStorage.setItem('adminToken', data.token);
                }
                
                // Store admin info
                if (data.admin) {
                    localStorage.setItem('adminInfo', JSON.stringify(data.admin));
                }
                
                // Redirect to admin role selection after 1 second
                setTimeout(() => {
                    window.location.href = '/admin-role-selection.html';
                }, 1000);
                
            } else {
                // Login failed
                showError(data.message || 'Login failed. Please check your credentials.');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            showError('Network error. Please try again later.');
        } finally {
            setLoading(false);
        }
    });

    // Helper functions
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        hideMessage(successMessage);
    }

    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        hideMessage(errorMessage);
    }

    function hideMessage(element) {
        if (element) {
            element.style.display = 'none';
        }
    }

    function setLoading(isLoading) {
        loginBtn.disabled = isLoading;
        loginBtn.textContent = isLoading ? 'Logging in...' : 'Login';
        loading.style.display = isLoading ? 'block' : 'none';
    }

    // Check if already logged in
    function checkExistingAuth() {
        const token = localStorage.getItem('adminToken');
        if (token) {
            // Verify token is still valid
            fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(async response => {
                if (response.ok) {
                    // Token is valid, redirect to role selection
                    window.location.href = '/admin-role-selection.html';
                } else {
                    const data = await response.json();
                    // Token is invalid or expired, remove it
                    localStorage.removeItem('adminToken');
                    localStorage.removeItem('adminInfo');
                    
                    // Log appropriate message based on error code
                    if (data.code === 'TOKEN_EXPIRED') {
                        console.log('Session expired. Please login again.');
                    }
                }
            })
            .catch(error => {
                console.error('Token verification error:', error);
                // Remove invalid token
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminInfo');
            });
        }
    }

    // Check existing authentication on page load
    checkExistingAuth();
});

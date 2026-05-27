// Simple test to verify auth routes are working
const express = require('express');
const app = express();

app.use(express.json());

// Test auth route
app.post('/api/auth/login', (req, res) => {
    console.log('Auth login route hit!');
    res.json({ message: 'Auth route working!' });
});

app.listen(3001, () => {
    console.log('Test server running on port 3001');
});

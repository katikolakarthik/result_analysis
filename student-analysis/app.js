require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const path = require('path');

const app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Routes
app.use('/', require('./routes/analysis'));

// Error handler
app.use((err, req, res, next) => {
    console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body ? 'Request body present' : 'No request body'
    });
    
    // Handle specific types of errors
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ 
            error: 'Invalid JSON',
            message: 'The request contains invalid JSON data'
        });
    }

    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            error: 'Request Entity Too Large',
            message: 'The file or data you are trying to upload is too large'
        });
    }

    res.status(err.status || 500).json({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Port configuration
const PORT = process.env.PORT || process.env.RENDER_PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});

// Export for Render
module.exports = app; 
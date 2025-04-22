const express = require('express');
const router = express.Router();
const multer = require('multer');
const analysisController = require('../controllers/analysisController');

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
            file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files are allowed!'), false);
        }
    }
}).single('file');

// Error handling middleware
const handleErrors = (fn) => {
    return async (req, res, next) => {
        try {
            await fn(req, res, next);
        } catch (error) {
            console.error('Route error:', {
                path: req.path,
                error: error.message,
                stack: error.stack
            });
            res.status(500).json({
                error: 'Internal Server Error',
                message: error.message
            });
        }
    };
};

// Routes with error handling
router.get('/', handleErrors(analysisController.getHomePage));

// Handle file upload with custom error handling
router.post('/upload', (req, res) => {
    upload(req, res, function(err) {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ error: err.message });
        }
        handleErrors(analysisController.uploadFile)(req, res);
    });
});

router.post('/get-stats', handleErrors(analysisController.getStats));
router.post('/get-all-subjects-graph', handleErrors(analysisController.getAllSubjectsGraph));
router.post('/get-fail-counts', handleErrors(analysisController.getFailCounts));
router.post('/get-overall-pass-fail', handleErrors(analysisController.getOverallPassFail));
router.post('/generate-pdf', handleErrors(analysisController.generatePDF));

module.exports = router; 
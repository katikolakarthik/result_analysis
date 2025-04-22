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
});

// Routes
router.get('/', analysisController.getHomePage);
router.post('/upload', upload.single('file'), analysisController.uploadFile);
router.post('/get-stats', analysisController.getStats);
router.get('/get-all-subjects-graph', analysisController.getAllSubjectsGraph);
router.get('/get-fail-counts', analysisController.getFailCounts);
router.get('/get-overall-pass-fail', analysisController.getOverallPassFail);
router.post('/generate-pdf', analysisController.generatePDF);

module.exports = router; 
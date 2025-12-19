const express = require('express');
const router = express.Router();
const controller = require('../controllers/scan.controller');

router.post('/analyze-image', controller.analyzeImage);
router.post('/analyze-barcode', controller.analyzeBarcode);
router.get('/debug-models', controller.debugModels);

module.exports = router;

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const apiRoutes = require('./src/routes/api.routes');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Trust Proxy (Required for Render/Netlify/Heroku)
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Security Middleware: Disabled to resolve blocking issues
/* 
app.use(helmet({
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'", "*"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "*"],
            styleSrc: ["'self'", "'unsafe-inline'", "*"],
            imgSrc: ["'self'", "data:", "blob:", "*"],
            connectSrc: ["'self'", "*"],
            upgradeInsecureRequests: null,
        },
    },
}));
*/

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000, // Increased limit to prevent false positives
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

app.use(express.static('.')); // Serve static files from current directory

// Mount specific API routes
app.use(require('./server/aggregator.express.js')); // Fast Barcode Aggregator
app.use('/api', apiRoutes);
app.use('/.netlify/functions/api', apiRoutes); // For Netlify Functions path
app.use('/', apiRoutes); // Fallback

// Export app for Netlify Functions
module.exports = app;

// Only listen if running locally (not imported)
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}

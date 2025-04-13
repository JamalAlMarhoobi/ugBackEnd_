// Import required Node.js modules
const express = require('express'); // Import Express.js framework
const mongoose = require('mongoose'); // Import Mongoose for MongoDB interaction
const cors = require('cors'); // Import CORS middleware for handling cross-origin requests
const path = require('path'); // Import path module for file path operations
const app = express(); // Create an Express application instance

// Configure CORS with specific options
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3000',
            'https://smart-tourism-jgps.onrender.com',
            'https://jamalalmarhoobi.github.io'
        ];

        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    maxAge: 86400 // 24 hours
};

// Configure middleware for the Express application
app.use(cors(corsOptions)); // Enable CORS for all routes
app.use(express.json()); // Parse incoming JSON requests
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Serve static files from the current directory
app.use(express.static(__dirname));
// Serve images from the images directory
app.use('/images', express.static(path.join(__dirname, 'images')));

// Get port from environment variable or use default
const PORT = process.env.PORT || 3000;

// MongoDB connection string from environment variable
const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://JamalMar:Shon%40tives95@cluster0.vr3h8ps.mongodb.net/smartTourism?retryWrites=true&w=majority';

// Define the Spot schema for MongoDB collection
const spotSchema = new mongoose.Schema({
    spotId: Number, // Unique identifier for the spot
    title: String, // Name of the tourist spot
    category: [String], // Array of categories the spot belongs to
    description: String, // Detailed description of the spot
    location: { // Nested object for location details
        city: String, // City where the spot is located
        googleMaps: String // Google Maps URL for the location
    },
    price: Number, // Entry price or cost of the spot
    googleReviews: { // Nested object for Google reviews
        rating: Number, // Average rating from Google
        reviewCount: Number // Total number of reviews
    },
    website: String, // Official website URL
    createdAt: String, // Creation timestamp
    updatedAt: String, // Last update timestamp
    image: {
        type: String,
        get: function (image) {
            if (!image) return null;
            // If the image is already a full URL, return it as is
            if (image.startsWith('http')) return image;
            // Otherwise, construct the full URL using the backend URL
            return `${process.env.BACKEND_URL || 'https://smart-tourism-jgps.onrender.com'}/images/${image}`;
        }
    }
}, { collection: 'spots' }); // Specify the collection name

// Configure schema transformation for JSON responses
spotSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString(); // Convert _id to id
        delete returnedObject._id; // Remove _id field
        delete returnedObject.__v; // Remove version key
    }
});

// Create Spot model from the schema
const Spot = mongoose.model('Spot', spotSchema);

// Define User schema for MongoDB collection
const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true }, // User's full name
    email: { type: String, required: true, unique: true, lowercase: true }, // Unique email address
    password: { type: String, required: true }, // User's password (should be hashed in production)
    destinationCity: { type: String, required: true }, // User's chosen destination city
    preferences: { type: [String], required: true, default: [] } // User's preferred categories
});

// Create User model from the schema
const User = mongoose.model('User', userSchema);

// Define Itinerary schema for MongoDB collection
const itinerarySchema = new mongoose.Schema({
    emailId: { type: String, required: true, unique: true }, // User's email as unique identifier
    spots: [{ // Array of spots in the itinerary
        spotId: { type: Number, required: true }, // Reference to the spot
        title: { type: String, required: true }, // Spot's title
        price: { type: Number, required: true }, // Spot's price
        date: { type: String, required: true }, // Planned visit date
        status: { type: String, required: true } // Current status (pending/booked/completed)
    }],
    totalCost: { type: Number, required: true }, // Total cost of the itinerary
    createdAt: { type: String, required: true }, // Creation timestamp
    updatedAt: { type: String, required: true } // Last update timestamp
});

// Create Itinerary model from the schema
const Itinerary = mongoose.model('Itinerary', itinerarySchema);

// Define Review schema for MongoDB collection
const reviewSchema = new mongoose.Schema({
    emailId: { type: String, required: true }, // Reviewer's email
    spotId: { type: Number, required: true }, // Reviewed spot's ID
    rating: { type: Number, required: true, min: 1, max: 5 }, // Rating (1-5 stars)
    comment: { type: String, required: true }, // Review text
    createdAt: { type: String, required: true } // Review timestamp
});

// Create Review model from the schema
const Review = mongoose.model('Review', reviewSchema);

// Response formatter middleware for consistent API responses
const formatResponse = (res, data, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({
        status: statusCode, // HTTP status code
        message: message, // Response message
        data: data, // Response data
        timestamp: new Date().toISOString() // Current timestamp
    });
};

// Error handler middleware for consistent error responses
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err); // Log error to console
    formatResponse(res, null, err.message || 'Internal Server Error', err.status || 500);
};

// Connect to MongoDB with detailed configuration
mongoose.connect(mongoURI, {
    useNewUrlParser: true, // Use new URL parser
    useUnifiedTopology: true, // Use new server discovery and monitoring engine
    serverSelectionTimeoutMS: 30000, // Timeout for server selection
    socketTimeoutMS: 45000, // Socket timeout
    family: 4, // Use IPv4
    retryWrites: true, // Enable retryable writes
    w: 'majority' // Write concern
})
    .then(async () => {
        console.log('Connected to MongoDB');

        try {
            // Drop all existing indexes for clean setup
            await User.collection.dropIndexes();
            console.log('Dropped all existing indexes');

            // Create unique index on email field
            await User.collection.createIndex({ email: 1 }, { unique: true });
            console.log('Created new unique index on email field');

            // Log available collections for debugging
            const collections = await mongoose.connection.db.listCollections().toArray();
            console.log('Available collections:', collections.map(c => c.name));
        } catch (error) {
            console.error('Error setting up indexes:', error);
        }
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1); // Exit process on connection failure
    });

// Root route to serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoint to fetch all spots
app.get('/api/spots', async (req, res) => {
    try {
        // Check database connection
        if (!mongoose.connection.readyState) {
            throw new Error('Database connection not established');
        }
        // Fetch all spots from database
        const spots = await Spot.find().lean();
        console.log('Found spots:', spots.length);
        // Send formatted response
        formatResponse(res, spots, 'Spots retrieved successfully');
    } catch (error) {
        console.error('Error fetching spots:', error);
        // Handle different types of errors
        if (error.name === 'MongoError') {
            formatResponse(res, null, 'Database error: ' + error.message, 500);
        } else {
            formatResponse(res, null, error.message, 500);
        }
    }
});

// Test endpoint for database connection
app.get('/api/test', async (req, res) => {
    try {
        // Check database connection
        if (!mongoose.connection.readyState) {
            throw new Error('Database connection not established');
        }
        // Get collection information and spot count
        const collections = await mongoose.connection.db.listCollections().toArray();
        const spotCount = await Spot.countDocuments();
        // Send test results
        formatResponse(res, {
            collections: collections.map(c => c.name),
            spotCount,
            dbName: mongoose.connection.db.databaseName,
            connectionState: mongoose.connection.readyState
        }, 'Database connection test successful');
    } catch (error) {
        console.error('Test endpoint error:', error);
        // Handle different types of errors
        if (error.name === 'MongoError') {
            formatResponse(res, null, 'Database error: ' + error.message, 500);
        } else {
            formatResponse(res, null, error.message, 500);
        }
    }
});

// User registration endpoint
app.post('/api/register', async (req, res) => {
    try {
        // Extract user data from request body
        const { fullName, email, password, destinationCity, preferences } = req.body;

        // Validate required fields
        if (!fullName || !email || !password || !destinationCity || !preferences || !Array.isArray(preferences)) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required and preferences must be an array'
            });
        }

        // Check for existing user
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Create new user document
        const user = new User({
            fullName,
            email: email.toLowerCase(),
            password, // Note: In production, hash the password
            destinationCity,
            preferences
        });

        // Save user to database
        await user.save();

        // Send success response
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                email: user.email,
                fullName: user.fullName,
                destinationCity: user.destinationCity,
                preferences: user.preferences
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        // Send error response
        res.status(500).json({
            success: false,
            message: error.message || 'Registration failed'
        });
    }
});

// Update user preferences endpoint
app.put('/api/users/:email/preferences', async (req, res) => {
    try {
        // Extract email and preferences from request
        const { email } = req.params;
        const { preferences } = req.body;

        console.log('Updating preferences for user:', email);
        console.log('New preferences:', preferences);

        // Validate preferences data
        if (!preferences || !Array.isArray(preferences)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid preferences data'
            });
        }

        // Update user preferences in database
        const updatedUser = await User.findOneAndUpdate(
            { email },
            { preferences },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log('Preferences updated successfully for user:', email);
        res.json({
            success: true,
            message: 'Preferences updated successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update preferences',
            error: error.message
        });
    }
});

// User login endpoint
app.post('/api/login', async (req, res) => {
    try {
        // Extract login credentials from request
        const { email, password } = req.body;

        console.log('Login attempt for email:', email);

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user by email in database
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'The Email you have entered is Not Registered, Please Sign Up'
            });
        }

        // Note: In production, use proper password hashing
        if (user.password !== password) {
            return res.status(401).json({
                success: false,
                message: 'The Password you have entered is Incorrect'
            });
        }

        // Return success response with user data
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                email: user.email,
                fullName: user.fullName,
                preferences: user.preferences
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during login'
        });
    }
});

// Get user data by email endpoint
app.get('/api/users/:email', async (req, res) => {
    try {
        // Extract email from request parameters
        const { email } = req.params;
        // Find user in database
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Return user data
        res.json({
            success: true,
            data: {
                email: user.email,
                fullName: user.fullName,
                destinationCity: user.destinationCity,
                preferences: user.preferences
            }
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch user data'
        });
    }
});

// Save or update user itinerary endpoint
app.post('/api/itineraries', async (req, res) => {
    try {
        // Extract itinerary data from request
        const { emailId, spots, totalCost, createdAt, updatedAt } = req.body;

        // Check for existing itinerary
        let itinerary = await Itinerary.findOne({ emailId });

        if (itinerary) {
            // Update existing itinerary
            itinerary.spots = spots;
            itinerary.totalCost = totalCost;
            itinerary.updatedAt = updatedAt;
        } else {
            // Create new itinerary
            itinerary = new Itinerary({
                emailId,
                spots,
                totalCost,
                createdAt,
                updatedAt
            });
        }

        // Save itinerary to database
        await itinerary.save();
        res.json({ success: true, message: 'Itinerary saved successfully' });
    } catch (error) {
        console.error('Error saving itinerary:', error);
        res.status(500).json({ success: false, message: 'Failed to save itinerary' });
    }
});

// Get user's itinerary endpoint
app.get('/api/itineraries/:emailId', async (req, res) => {
    try {
        // Extract email ID from request parameters
        const { emailId } = req.params;
        console.log('Fetching itinerary for email:', emailId);
        
        // Find itinerary in database
        const itinerary = await Itinerary.findOne({ emailId });

        if (!itinerary) {
            console.log('No itinerary found for email:', emailId);
            return res.json({ 
                success: true, 
                data: { 
                    spots: [], 
                    totalCost: 0 
                } 
            });
        }

        console.log('Found itinerary:', itinerary);
        // Return itinerary data
        res.json({ success: true, data: itinerary });
    } catch (error) {
        console.error('Error fetching itinerary:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch itinerary' });
    }
});

// Submit review endpoint
app.post('/api/reviews', async (req, res) => {
    try {
        // Extract review data from request
        const { emailId, spotId, rating, comment } = req.body;

        // Validate required fields
        if (!emailId || !spotId || !rating || !comment) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Validate rating range
        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        // Create new review document
        const review = new Review({
            emailId,
            spotId,
            rating,
            comment,
            createdAt: new Date().toLocaleDateString('en-GB')
        });

        // Save review to database
        await review.save();

        // Update user's itinerary
        const itinerary = await Itinerary.findOne({ emailId });
        if (itinerary) {
            // Remove reviewed spot from itinerary
            itinerary.spots = itinerary.spots.filter(spot => spot.spotId !== spotId);

            // Recalculate total cost
            itinerary.totalCost = itinerary.spots.reduce((total, spot) => total + spot.price, 0);

            // Update timestamp
            itinerary.updatedAt = new Date().toLocaleDateString('en-GB');

            // Save updated itinerary
            await itinerary.save();
        }

        // Return success response
        res.status(201).json({
            success: true,
            message: 'Review submitted successfully and spot removed from itinerary',
            review: review
        });
    } catch (error) {
        console.error('Review submission error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to submit review'
        });
    }
});

// Get reviews for a specific spot endpoint
app.get('/api/reviews/:spotId', async (req, res) => {
    try {
        // Extract spot ID from request parameters
        const spotId = parseInt(req.params.spotId);

        // Validate spot ID format
        if (isNaN(spotId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid spot ID'
            });
        }

        // Find and sort reviews by creation date (newest first)
        const reviews = await Review.find({ spotId }).sort({ createdAt: -1 });

        // Return reviews data
        res.status(200).json({
            success: true,
            reviews: reviews
        });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch reviews'
        });
    }
});

// Apply global error handler middleware
app.use(errorHandler);

// Update the server start code
const startServer = async () => {
    try {
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            family: 4,
            retryWrites: true,
            w: 'majority'
        });
        console.log('Connected to MongoDB');

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

// Export the app for testing
module.exports = app;
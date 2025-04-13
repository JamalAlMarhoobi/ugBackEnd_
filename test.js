const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
const app = require('./server');
const mongoose = require('mongoose');

chai.use(chaiHttp);

describe('Smart Tourism Platform Tests', () => {
    // Test user data
    const testUser = {
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'Test@123',
        confirmPassword: 'Test@123',
        destinationCity: 'Dubai',
        preferences: ['Religious', 'Architecture']
    };

    // Test spot data
    const testSpot = {
        spotId: 999,
        title: 'Test Attraction',
        category: ['Test', 'Tourist'],
        description: 'A test attraction for testing purposes',
        location: {
            city: 'Dubai',
            googleMaps: 'https://maps.google.com/test'
        },
        price: 100,
        googleReviews: {
            rating: 4.5,
            reviewCount: 100
        },
        website: 'https://test.com'
    };

    // Setup and teardown
    before(async () => {
        // Connect to test database
        const testDbUri = 'mongodb+srv://JamalMar:Shon%40tives95@cluster0.vr3h8ps.mongodb.net/smartTourism_test?retryWrites=true&w=majority';
        await mongoose.connect(testDbUri);
        
        // Clear test database
        await mongoose.connection.dropDatabase();
    });

    after(async () => {
        // Clean up test database
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    });

    // Authentication Tests
    describe('Authentication Tests', () => {
        it('should register a new user successfully', (done) => {
            chai.request(app)
                .post('/api/register')
                .send(testUser)
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res).to.have.status(201);
                    expect(res.body).to.have.property('success').equal(true);
                    expect(res.body).to.have.property('message').equal('User registered successfully');
                    expect(res.body.user).to.have.property('email').equal(testUser.email.toLowerCase());
                    done();
                });
        });

        it('should not register a user with existing email', (done) => {
            chai.request(app)
                .post('/api/register')
                .send(testUser)
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('success').equal(false);
                    expect(res.body).to.have.property('message').equal('Email already registered');
                    done();
                });
        });

        it('should login successfully with correct credentials', (done) => {
            chai.request(app)
                .post('/api/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                })
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('success').equal(true);
                    expect(res.body).to.have.property('message').equal('Login successful');
                    expect(res.body.user).to.have.property('email').equal(testUser.email.toLowerCase());
                    done();
                });
        });

        it('should not login with incorrect password', (done) => {
            chai.request(app)
                .post('/api/login')
                .send({
                    email: testUser.email,
                    password: 'WrongPassword123'
                })
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res).to.have.status(401);
                    expect(res.body).to.have.property('success').equal(false);
                    expect(res.body).to.have.property('message').equal('The Password you have entered is Incorrect');
                    done();
                });
        });
    });

    // Spots Management Tests
    describe('Spots Management Tests', () => {
        before(async () => {
            // Create a test spot
            const Spot = mongoose.model('Spot');
            await Spot.create(testSpot);
        });

        it('should fetch all spots successfully', (done) => {
            chai.request(app)
                .get('/api/spots')
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('status').equal(200);
                    expect(res.body).to.have.property('message').equal('Spots retrieved successfully');
                    expect(res.body).to.have.property('data').that.is.an('array');
                    expect(res.body).to.have.property('timestamp');
                    done();
                });
        });

        it('should fetch recommended spots for a user', (done) => {
            chai.request(app)
                .get('/api/spots')
                .end((err, res) => {
                    if (err) {
                        console.error('Error in recommended spots test:', err);
                        return done(err);
                    }
                    console.log('Recommended spots response:', res.body);
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('status').equal(200);
                    expect(res.body).to.have.property('message').equal('Spots retrieved successfully');
                    expect(res.body).to.have.property('data').that.is.an('array');
                    expect(res.body).to.have.property('timestamp');
                    done();
                });
        });

        it('should search spots successfully', (done) => {
            chai.request(app)
                .get('/api/spots')
                .end((err, res) => {
                    if (err) {
                        console.error('Error in search spots test:', err);
                        return done(err);
                    }
                    console.log('Search spots response:', res.body);
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('status').equal(200);
                    expect(res.body).to.have.property('message').equal('Spots retrieved successfully');
                    expect(res.body).to.have.property('data').that.is.an('array');
                    expect(res.body).to.have.property('timestamp');
                    done();
                });
        });
    });

    // Itinerary Management Tests
    describe('Itinerary Management Tests', () => {
        it('should add spot to itinerary', (done) => {
            const itineraryData = {
                emailId: testUser.email,
                spots: [{
                    spotId: testSpot.spotId,
                    title: testSpot.title,
                    price: testSpot.price,
                    date: new Date().toLocaleDateString('en-GB'),
                    status: 'pending'
                }],
                totalCost: testSpot.price,
                createdAt: new Date().toLocaleDateString('en-GB'),
                updatedAt: new Date().toLocaleDateString('en-GB')
            };

            chai.request(app)
                .post('/api/itineraries')
                .send(itineraryData)
                .end((err, res) => {
                    if (err) {
                        console.error('Error in add spot to itinerary test:', err);
                        return done(err);
                    }
                    console.log('Add spot to itinerary response:', res.body);
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('success').equal(true);
                    expect(res.body).to.have.property('message').equal('Itinerary saved successfully');
                    done();
                });
        });

        it('should fetch user itinerary', (done) => {
            chai.request(app)
                .get(`/api/itineraries/${testUser.email}`)
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('success').equal(true);
                    expect(res.body.data).to.have.property('spots').that.is.an('array');
                    done();
                });
        });

        it('should update spot status in itinerary', (done) => {
            const updateData = {
                emailId: testUser.email,
                spots: [{
                    spotId: testSpot.spotId,
                    title: testSpot.title,
                    price: testSpot.price,
                    date: new Date().toLocaleDateString('en-GB'),
                    status: 'booked'
                }],
                totalCost: testSpot.price,
                createdAt: new Date().toLocaleDateString('en-GB'),
                updatedAt: new Date().toLocaleDateString('en-GB')
            };

            console.log('Making request to update spot status...');
            console.log('Endpoint:', '/api/itineraries');
            console.log('Request data:', updateData);

            chai.request(app)
                .post('/api/itineraries')
                .send(updateData)
                .end((err, res) => {
                    if (err) {
                        console.error('Error in update spot status test:', err);
                        console.error('Error response:', err.response?.body);
                        return done(err);
                    }
                    
                    console.log('Update spot status response status:', res.status);
                    console.log('Update spot status response body:', res.body);
                    
                    if (res.status !== 200) {
                        console.error('Unexpected status code:', res.status);
                        console.error('Response body:', res.body);
                    }

                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('success').equal(true);
                    expect(res.body).to.have.property('message').equal('Itinerary saved successfully');
                    done();
                });
        });
    });

    // Reviews Management Tests
    describe('Reviews Management Tests', () => {
        it('should submit a review successfully', (done) => {
            chai.request(app)
                .post('/api/reviews')
                .send({
                    emailId: testUser.email,
                    spotId: testSpot.spotId,
                    rating: 5,
                    comment: 'Great test spot!',
                    createdAt: new Date().toLocaleDateString('en-GB')
                })
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res).to.have.status(201);
                    expect(res.body).to.have.property('success').equal(true);
                    done();
                });
        });

        it('should fetch reviews for a spot', (done) => {
            chai.request(app)
                .get(`/api/reviews/${testSpot.spotId}`)
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('success').equal(true);
                    expect(res.body.reviews).to.be.an('array');
                    done();
                });
        });

        it('should sort reviews by date and rating', (done) => {
            chai.request(app)
                .get(`/api/reviews/${testSpot.spotId}?sortBy=date&order=desc`)
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('success').equal(true);
                    expect(res.body.reviews).to.be.an('array');
                    done();
                });
        });
    });

    // User Preferences Tests
    describe('User Preferences Tests', () => {
        it('should update user preferences', (done) => {
            chai.request(app)
                .put(`/api/users/${testUser.email}/preferences`)
                .send({
                    preferences: ['Religious', 'Architecture', 'History']
                })
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('success').equal(true);
                    done();
                });
        });

        it('should fetch user preferences', (done) => {
            chai.request(app)
                .get(`/api/users/${testUser.email}`)
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('success').equal(true);
                    expect(res.body.data).to.have.property('preferences').that.is.an('array');
                    done();
                });
        });
    });

    // Error Handling Tests
    describe('Error Handling Tests', () => {
        it('should handle invalid route', (done) => {
            chai.request(app)
                .get('/api/invalid-route')
                .end((err, res) => {
                    if (err) {
                        console.error('Error in invalid route test:', err);
                        return done(err);
                    }
                    console.log('Invalid route response:', res.body);
                    expect(res).to.have.status(404);
                    expect(res.body).to.be.an('object');
                    done();
                });
        });

        it('should handle server errors gracefully', (done) => {
            chai.request(app)
                .post('/api/register')
                .send({}) // Invalid data
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('success').equal(false);
                    done();
                });
        });
    });
}); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');

require('dotenv').config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection using environment variable
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

const bookingSchema = new mongoose.Schema({
    _id: String,
    name: String,
    total_booking_amount: Number,
    status: String,
});

const Booking = mongoose.model('Booking', bookingSchema);

// Routes
app.get('/bookings', async (req, res) => {
    try {
        const bookings = await Booking.find();
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.put('/bookings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await Booking.updateOne({ _id: id }, { status });
        res.json({ message: 'Booking updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Setup HTTP and Socket.IO servers
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
    }
});

// Real-time updates using MongoDB Change Streams
mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB');
    const bookingChangeStream = Booking.watch();

    bookingChangeStream.on('change', async (change) => {
        console.log('Change detected:', change);

        if (change.operationType === 'update') {
            const updatedFields = change.updateDescription.updatedFields;
            const newStatus = updatedFields.status;
            const docId = change.documentKey._id;

            try {
                const doc = await Booking.findById(docId);
                if (doc) {
                    const prevStatus = change.fullDocumentBeforeChange ? change.fullDocumentBeforeChange.status : null;

                    // Check if the status is being changed from "finished" to "pending"
                    if (prevStatus === 'finished' && newStatus === 'pending') {
                        console.log(`Skipping GST calculation and log for booking ${docId} as it was changed from 'finished' to 'pending'`);
                        return;  // Don't calculate GST or emit logs if status is changed from 'finished' to 'pending'
                    }

                    // If status is "finished", calculate GST and log
                    if (newStatus === 'finished') {
                        const totalBookingAmount = doc.total_booking_amount;
                        const gstDetails = await calculateGstViaApi(totalBookingAmount);

                        io.emit('logMessage', {
                            log: `Booking ${docId} status updated to 'finished'. GST Calculated: ${JSON.stringify(gstDetails)}`
                        });

                        io.emit('bookingUpdated', {
                            id: docId,
                            updatedFields: { ...updatedFields, gstDetails }
                        });
                    } else {
                        // Emit log for other status updates
                        io.emit('logMessage', {
                            log: `Booking ${docId} status updated to '${newStatus}'`
                        });

                        io.emit('bookingUpdated', {
                            id: docId,
                            updatedFields
                        });
                    }
                } else {
                    console.error(`Booking not found for id ${docId}`);
                }
            } catch (error) {
                console.error(`Error processing booking ${docId}:`, error);
                io.emit('logMessage', { log: `Error processing booking ${docId}: ${error.message}` });
            }
        }
    });
});

// Function to calculate GST via API using environment variable
async function calculateGstViaApi(totalBookingAmount) {
    try {
        const response = await axios.post(process.env.GST_API_URL, {
            total_booking_amount: totalBookingAmount
        });

        if (response.status === 200) {
            return response.data;
        } else {
            console.error('Error calculating GST via API:', response.data);
            return null;
        }
    } catch (error) {
        console.error('Error making API call:', error);
        return null;
    }
}

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

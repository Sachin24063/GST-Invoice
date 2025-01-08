import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Select, MenuItem, Box, Typography, Paper } from '@mui/material';
import { styled } from '@mui/system';

const BookingsTable = () => {
    const [bookings, setBookings] = useState([]);
    const [logs, setLogs] = useState([]);  // New state to hold logs

    useEffect(() => {
        axios.get('http://localhost:5001/bookings')
            .then(response => setBookings(response.data))
            .catch(error => console.error('Error fetching bookings:', error));

        const socket = io('http://localhost:5001');

        // Listen for booking updates
        socket.on('bookingUpdated', ({ id, updatedFields }) => {
            setBookings(prevBookings => prevBookings.map(booking =>
                booking._id === id ? { ...booking, ...updatedFields } : booking
            ));
        });

        // Listen for log messages
        socket.on('logMessage', (data) => {
            setLogs(prevLogs => [...prevLogs, data.log]);  // Append new log to the logs state
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const handleStatusChange = (id, status) => {
        axios.put(`http://localhost:5001/bookings/${id}`, { status })
            .then(() => {
                // The real-time update will be handled by the socket listener
            })
            .catch(error => console.error('Error updating status:', error));
    };

    return (
        <Box sx={{ padding: 2, backgroundColor: '#f4f7fc', borderRadius: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#2e3b5f', marginBottom: 2 }}>Bookings</Typography>

            <TableContainer component={Paper} sx={{ maxHeight: 400, borderRadius: 1, boxShadow: 3 }}>
                <Table size="small">
                    <TableHead sx={{ backgroundColor: '#3f51b5', color: '#fff' }}>
                        <TableRow>
                            <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Name</TableCell>
                            <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Total Booking Amount</TableCell>
                            <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {bookings.map(booking => (
                            <TableRow key={booking._id} sx={{
                                '&:hover': {
                                    backgroundColor: '#f1f3f8', // subtle hover effect
                                },
                                backgroundColor: booking.status === 'finished' ? '#e8f5e9' : '#fff' // color-coded status
                            }}>
                                <TableCell>{booking.name}</TableCell>
                                <TableCell>{booking.total_booking_amount}</TableCell>
                                <TableCell>{booking.status}</TableCell>
                                <TableCell>
                                    <Select
                                        value={booking.status}
                                        onChange={(e) => handleStatusChange(booking._id, e.target.value)}
                                        fullWidth
                                        size="small"
                                        sx={{
                                            backgroundColor: '#f4f7fc',
                                            borderRadius: 1,
                                            '&:focus': {
                                                borderColor: '#3f51b5',
                                            },
                                            '&.Mui-focused': {
                                                backgroundColor: '#fff',
                                            }
                                        }}
                                    >
                                        <MenuItem value="pending" sx={{ backgroundColor: '#fff' }}>Pending</MenuItem>
                                        <MenuItem value="finished" sx={{ backgroundColor: '#fff' }}>Finished</MenuItem>
                                    </Select>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ marginTop: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2e3b5f' }}>Logs</Typography>
                <Box sx={{
                    border: '1px solid #ddd',
                    padding: 1,
                    maxHeight: 200,
                    overflowY: 'auto',
                    fontSize: '0.875rem',
                    backgroundColor: '#f9f9f9',
                    borderRadius: 1
                }}>
                    {logs.map((log, index) => (
                        <Typography key={index} sx={{ marginBottom: 0.5, color: '#333' }}>
                            {log}
                        </Typography>
                    ))}
                </Box>
            </Box>
        </Box>
    );
};

export default BookingsTable;
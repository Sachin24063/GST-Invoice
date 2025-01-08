import React from 'react';
import BookingsTable from './BookingsTable';
import { Container, CssBaseline } from '@mui/material';

function App() {
    return (
        <div className="App">
            <CssBaseline />
            <Container maxWidth="lg">
                <BookingsTable />
            </Container>
        </div>
    );
}

export default App;

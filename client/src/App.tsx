import './App.css';
import { Container } from '@mui/material';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Schedule from './pages/Schedule';
import { BottomAppBar } from './components/BottomNavBar';

function App() {
  return (
    <Router>
      {/* Main content */}
      <Container sx={{ padding: 0, pb: 10 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/schedule" element={<Schedule />} />
        </Routes>
      </Container>

      {/* Bottom App Bar */}
      <BottomAppBar />
    </Router>
  );
}

export default App;

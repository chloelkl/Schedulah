import './App.css';
import { Container } from '@mui/material';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Schedule from './pages/Schedule';
import { BottomAppBar } from './components/BottomNavBar';
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import NewHangout from "./pages/NewHangout";
import NewGroup from "./pages/NewGroup";

function App() {
  return (
    <Router>
      {/* Main content */}
      <Container sx={{ padding: 0, pb: 10 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/schedule" element={<Schedule />} />

          {/* Group */}
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/:groupId" element={<GroupDetail />} />
          <Route path="/groups/:groupId/new-hangout" element={<NewHangout />} />
          <Route path="/groups/new" element={<NewGroup />} />
  


        </Routes>
      </Container>

      {/* Bottom App Bar */}
      <BottomAppBar />
    </Router>
  );
}

export default App;

import './App.css';
import { Container } from '@mui/material';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import { BottomAppBar } from './components/BottomAppBar';
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import NewHangout from "./pages/NewHangout";
import NewGroup from "./pages/NewGroup";
import { AddEvent } from './pages/AddEvent';

function App() {
  return (
    <Router>
      {/* Main content */}
      <Container sx={{ padding: 0 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Event */}
          <Route path="/events/new" element={<AddEvent />} />

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

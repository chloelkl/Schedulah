import './App.css';
import { Container, AppBar, Toolbar, Typography } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Link }
  from 'react-router-dom';
import Schedule from './pages/Schedule';
function App() {
  return (
    <Router>
      <AppBar position="static" className='AppBar'>
        <Container>
          <Toolbar disableGutters={true}>
            <Link to="/">
              <Typography variant="h6" component="div">
                Schedulah
              </Typography>
            </Link>
            <Link to="/schedule" ><Typography>Schedule</Typography></Link>
          </Toolbar>
        </Container>
      </AppBar>
      <Container>
        <Routes>
          <Route path={"/"} />
          <Route path={"/schedule"} element={<Schedule />} />
        </Routes>
      </Container>
    </Router>
  );
}
export default App;
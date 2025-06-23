
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <LandingPage />
      </div>
    </AuthProvider>
  );
}

export default App;
import './App.css'
import { Link, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { RedirectToSignIn, SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";

import SignInPage from './components/auth/SignInPage';
import SignUpPage from './components/auth/SignUpPage';
import HomePage from './pages/HomePage';
import SessionsPage from './pages/SessionsPage';
import ImportSessionPage from './pages/ImportSessionPage';
import JobDetailPage from './pages/JobDetailPage';
import InstructorDashboard from './components/InstructorDashboard';
import LiveLandingPage from './pages/LiveLandingPage';
import LiveRunPage from './pages/LiveRunPage';

const ProtectedAppLayout = () => (
  <div>
    <header className="top-nav">
      <Link to="/" className="app-title-link">Instructor Dashboard</Link>
      <div className="top-nav-links">
        <Link to="/sessions" className="secondary-link">Sessions</Link>
        <Link to="/sessions/import" className="secondary-link">Import</Link>
        <Link to="/live" className="secondary-link">Live Analysis</Link>
      </div>
      <UserButton />
    </header>
    <Outlet />
  </div>
);

const RequireAuth = () => (
  <>
    <SignedIn>
      <ProtectedAppLayout />
    </SignedIn>
    <SignedOut>
      <RedirectToSignIn redirectUrl="/" />
    </SignedOut>
  </>
);

function App() {
  return (
    <Routes>
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/sessions/import" element={<ImportSessionPage />} />
        <Route path="/live" element={<LiveLandingPage />} />
        <Route path="/live/run" element={<LiveRunPage />} />
        <Route path="/jobs/:jobId" element={<JobDetailPage />} />
        <Route path="/sessions/:sessionId" element={<InstructorDashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App

import './App.css'
import InstructorDashboard from './components/InstructorDashboard'

import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import SignInPage from './components/auth/SignInPage';

function App() {
  return (
    <div>
      <SignedIn>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: 20 }}>
          <UserButton />
        </div>

        <InstructorDashboard />
      </SignedIn>

      <SignedOut>
        <SignInPage />
      </SignedOut>
    </div>
  );
}

export default App

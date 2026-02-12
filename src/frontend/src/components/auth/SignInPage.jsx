import { SignIn } from "@clerk/clerk-react";

export default function SignInPage() {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </div>
  );
}

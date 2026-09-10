import { AuthForm } from "../../components/board/auth-form";

export const metadata = { title: "Sign in — BrainBox" };

export default function SignInPage() {
  return <AuthForm mode="sign-in" />;
}

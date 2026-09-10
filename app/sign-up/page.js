import { AuthForm } from "../../components/board/auth-form";

export const metadata = { title: "Open an account — BrainBox" };

export default function SignUpPage() {
  return <AuthForm mode="sign-up" />;
}

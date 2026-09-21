import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        Sign-up isn&apos;t configured on this deployment yet.
      </p>
    );
  }
  return (
    <div className="flex justify-center py-8">
      <SignUp />
    </div>
  );
}

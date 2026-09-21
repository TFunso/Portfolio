import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

/** Renders Clerk's sign-in/account controls. Only mounted by the layout when
 *  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set, so this never renders outside a
 *  ClerkProvider -- see src/app/layout.tsx. */
export function AuthNav() {
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="text-sm font-medium text-slate-600 hover:text-brand-700">Sign in</button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </>
  );
}

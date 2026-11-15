import type { Metadata } from "next";
import { ProfileView } from "./ProfileView";

export const metadata: Metadata = { title: "Profile" };

// Signed-in pages render on the client once the token is verified, so they opt out of instant-navigation checks.
export const instant = false;

export default function ProfilePage() {
  return <ProfileView />;
}

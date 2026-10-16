import { signOut } from "@/app/actions/auth";

export default async function LogoutPage() {
  await signOut();
}

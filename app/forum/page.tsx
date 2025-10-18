import { redirect } from "next/navigation";

// Forum feature has been removed. Redirect users to the homepage.
export default function Page() {
  redirect("/");
}

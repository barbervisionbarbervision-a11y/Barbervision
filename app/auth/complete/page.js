import { Suspense } from "react";
import CompletarConvite from "@/components/auth/CompletarConvite";

export default function CompletarConvitePage() {
  return (
    <Suspense fallback={null}>
      <CompletarConvite />
    </Suspense>
  );
}

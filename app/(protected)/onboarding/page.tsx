import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import OnboardingWizard from "@/components/onboarding/OnboardingWizard"

export const dynamic = "force-dynamic"

export default async function OnboardingPage() {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect("/auth/login")

  const userId = auth.user.id

  const [{ data: prof }, { count: accountsCount }, { count: txCount }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("username,onboarding_completed,onboarding_step")
        .eq("id", userId)
        .single(),
      supabase.from("accounts").select("*", { count: "exact", head: true }).eq("is_archived", false),
      supabase.from("transactions").select("*", { count: "exact", head: true }),
    ])

  return (
    <div className="p-2">
      <OnboardingWizard
        initial={{
          username: prof?.username ?? "",
          onboarding_completed: prof?.onboarding_completed ?? false,
          onboarding_step: prof?.onboarding_step ?? 0,
          accountsCount: accountsCount ?? 0,
          transactionsCount: txCount ?? 0,
        }}
      />
    </div>
  )
}

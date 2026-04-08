import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import OnboardingWizard from "@/components/onboarding/OnboardingWizard"

export const dynamic = "force-dynamic"

export default async function OnboardingPage() {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect("/auth/login")
  const authName =
    (auth.user.user_metadata?.full_name as string | undefined) ??
    (auth.user.user_metadata?.name as string | undefined)

  const userId = auth.user.id

  const [{ data: nameProf }, { data: onboardingProf }, { count: accountsCount }, { count: txCount }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single(),
      supabase
        .from("profiles")
        .select("onboarding_completed,onboarding_step")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("accounts").select("*", { count: "exact", head: true }).eq("is_archived", false),
      supabase.from("transactions").select("*", { count: "exact", head: true }),
    ])

  return (
    <OnboardingWizard
      initial={{
        name: nameProf?.full_name ?? authName ?? auth.user.email?.split("@")[0] ?? "",
        onboarding_completed: onboardingProf?.onboarding_completed ?? false,
        onboarding_step: onboardingProf?.onboarding_step ?? 0,
        accountsCount: accountsCount ?? 0,
        transactionsCount: txCount ?? 0,
      }}
    />
  )
}

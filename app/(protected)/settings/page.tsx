// This is a Server Component — it just renders client components inside it.
// No "use client" needed here.
import CurrencySettings from "@/components/settings/CurrencySettings"

export default function SettingsPage() {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your preferences for My Wallet.
        </p>
      </div>

      {/* Currency section */}
      <div className="rounded-xl border bg-white p-5 space-y-1">
        <h2 className="font-semibold">Display Currency</h2>
        <p className="text-sm text-gray-500">
          This is used as the default currency for new accounts and for
          dashboard summaries. It does not convert existing transactions.
        </p>
        <div className="pt-2">
          <CurrencySettings />
        </div>
      </div>
    </div>
  )
}

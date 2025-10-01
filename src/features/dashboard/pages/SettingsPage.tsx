const SettingsPage = () => {
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">Workspace settings</h2>
      <p className="text-slate-600">
        Configure business information, register permissions, receipt templates, and integrations.
      </p>
      <p className="text-slate-600">
        Choose a panel on the left to edit company details, payment processors, notification rules, and advanced
        security controls.
      </p>
    </div>
  )
}

export default SettingsPage

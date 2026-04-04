export default function SettingsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
      <p className="mt-1 text-sm text-gray-500">
        Manage your agency account and preferences
      </p>

      <div className="mt-6 space-y-4">
        {[
          { title: "Agency details", description: "Update your agency name, address, and contact information." },
          { title: "Notifications", description: "Configure email alerts for expiring certificates and compliance deadlines." },
          { title: "Team members", description: "Invite and manage staff access to your account." },
        ].map((section) => (
          <div
            key={section.title}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{section.title}</p>
              <p className="mt-0.5 text-sm text-gray-500">{section.description}</p>
            </div>
            <button className="ml-4 shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

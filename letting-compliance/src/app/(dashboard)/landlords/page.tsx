export default function LandlordsPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Landlords</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your landlord portfolio
          </p>
        </div>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          Add landlord
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          No landlords yet. Add your first landlord to get started.
        </div>
      </div>
    </div>
  );
}

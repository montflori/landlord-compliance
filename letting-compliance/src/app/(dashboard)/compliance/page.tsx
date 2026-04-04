export default function CompliancePage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Compliance</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track certificates, licences, and regulatory requirements
          </p>
        </div>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          Add record
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Gas Safety", status: "0 due" },
          { label: "EPC", status: "0 due" },
          { label: "EICR", status: "0 due" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <p className="text-sm font-medium text-gray-900">{item.label}</p>
            <p className="mt-1 text-sm text-gray-500">{item.status}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          No compliance records yet.
        </div>
      </div>
    </div>
  );
}

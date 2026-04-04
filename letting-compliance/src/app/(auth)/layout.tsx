export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="mb-8 text-center">
        <span className="text-2xl font-bold text-indigo-600">
          LettingCompliance
        </span>
        <p className="mt-1 text-sm text-gray-500">
          UK letting agent compliance tracker
        </p>
      </div>
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
        {children}
      </div>
    </div>
  );
}

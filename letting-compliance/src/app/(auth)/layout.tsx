export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="mb-8 flex justify-center">
        <img src="/lucid-let-logo.svg" alt="Lucid Let" className="h-16 w-auto" />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
        {children}
      </div>
    </div>
  );
}

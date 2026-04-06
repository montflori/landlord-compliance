export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="mb-8 flex items-center justify-center gap-3">
        <img src="/let-lucid-logo.png" alt="Let Lucid" className="h-16 w-auto" />
        <span style={{ fontFamily: "var(--font-bebas)" }} className="text-4xl tracking-widest text-gray-900 leading-none">LET LUCID</span>
      </div>
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
        {children}
      </div>
    </div>
  );
}

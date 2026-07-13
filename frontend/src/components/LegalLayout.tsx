import Link from "next/link";

export default function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-leather-900">{title}</h1>
      <p className="text-sm text-leather-500 mt-2">Last updated: {updated}</p>
      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-leather-800 [&_h2]:text-lg [&_h2]:font-medium [&_h2]:text-leather-900 [&_h2]:mt-8 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:text-leather-700 [&_a]:underline">
        {children}
      </div>
      <div className="mt-12 pt-6 border-t border-leather-100 text-sm text-leather-500">
        <Link href="/" className="hover:text-leather-800">
          ← Back to Briefcase
        </Link>
      </div>
    </main>
  );
}

export const metadata = {
  title: "LedgerPro | Amar Bartaula",
};

export default function LedgerProPage() {
  return (
    <main className="fixed inset-0 h-screen w-screen overflow-hidden bg-white">
      <iframe
        title="LedgerPro Accounting System"
        src="https://school-accounting-frontend.onrender.com/"
        className="h-full w-full border-0"
        allow="clipboard-read; clipboard-write"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </main>
  );
}

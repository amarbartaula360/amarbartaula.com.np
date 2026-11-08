export const metadata = {
  title: "Exam Portal | Amar Bartaula",
  description: "Secure Examination and Marksheet portal for United English Boarding School.",
};

export default function ExamPortalPage() {
  return (
    <main className="fixed inset-0 h-screen w-screen overflow-hidden bg-white">
      <iframe
        title="LedgerPro Examination and Marksheet Portal"
        src="https://school-accounting-frontend.onrender.com/?module=exam"
        className="h-full w-full border-0"
        allow="clipboard-read; clipboard-write"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </main>
  );
}

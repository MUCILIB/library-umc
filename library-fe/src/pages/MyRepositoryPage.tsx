import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";
import StudentRepositoryTab from "@/components/StudentRepositoryTab";

export default function MyRepositoryPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans overflow-x-hidden">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-8 w-full">
        <StudentRepositoryTab />
      </main>

      <Footer />
    </div>
  );
}

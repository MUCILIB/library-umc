import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";
import LecturerRecommendationList from "@/components/LecturerRecommendationList";

export default function LecturerRecommendationsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans overflow-x-hidden">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 w-full">
        <LecturerRecommendationList />
      </main>

      <Footer />
    </div>
  );
}

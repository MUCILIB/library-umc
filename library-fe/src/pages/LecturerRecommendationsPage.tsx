import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";
import LecturerRecommendationList from "@/components/LecturerRecommendationList";

export default function LecturerRecommendationsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans overflow-x-hidden">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 w-full">
        <LecturerRecommendationList />
      </main>

      <Footer />
    </div>
  );
}

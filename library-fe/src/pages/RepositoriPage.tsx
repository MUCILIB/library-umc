import React from "react";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";

export default function RepositoriPage() {
  return (
    <div className="min-h-screen bg-muted/30 flex flex-col font-sans" data-testid="repositori-page">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Repositori Karya Ilmiah Mahasiswa
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Arsip tugas akhir, skripsi, dan riset sivitas akademika Universitas Muhammadiyah Cirebon.
        </p>
      </main>
      <Footer />
    </div>
  );
}

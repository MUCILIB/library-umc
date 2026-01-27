import React, { useState } from "react";

const BookList = () => {
  // Data Buku Fisik
  const physicalBooks = [
    {
      id: 1,
      title: "The Psychology Of Money",
      author: "Morgan Housel",
      tags: ["Self-Help", "Personal Finance"],
      status: "Tersedia",
      coverColor: "bg-purple-500",
    },
    {
      id: 2,
      title: "How Innovation Works",
      author: "Matt Ridley",
      tags: ["Business", "Science", "Technology"],
      status: "Dipinjam",
      coverColor: "bg-amber-500",
    },
    {
      id: 3,
      title: "The Picture of Dorian Gray",
      author: "Oscar Wilde",
      tags: ["Fiction", "Fantasy"],
      status: "Tersedia",
      coverColor: "bg-gray-800",
    },
    {
      id: 4,
      title: "Wuthering Heights",
      author: "Emily Bronte",
      tags: ["Romance", "Classic"],
      status: "Tersedia",
      coverColor: "bg-gray-700",
    },
  ];

  // Data E-Book
  const ebookBooks = [
    {
      id: 5,
      title: "Atomic Habits",
      author: "James Clear",
      tags: ["Self-Help", "Productivity"],
      status: "Tersedia",
      coverColor: "bg-blue-500",
    },
    {
      id: 6,
      title: "Deep Work",
      author: "Cal Newport",
      tags: ["Productivity", "Technology"],
      status: "Tersedia",
      coverColor: "bg-indigo-500",
    },
    {
      id: 7,
      title: "Sapiens",
      author: "Yuval Noah Harari",
      tags: ["History", "Science"],
      status: "Dipinjam",
      coverColor: "bg-emerald-500",
    },
    {
      id: 8,
      title: "Thinking, Fast and Slow",
      author: "Daniel Kahneman",
      tags: ["Psychology", "Economics"],
      status: "Tersedia",
      coverColor: "bg-rose-500",
    },
  ];

  const [activeTab, setActiveTab] = useState(0); // 0 = Buku Fisik, 1 = E-Book

  // Fungsi helper untuk status badge
  const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 text-xs rounded-full";
    if (status === "Tersedia") {
      return `${baseClasses} bg-green-100 text-green-800`;
    }
    return `${baseClasses} bg-blue-100 text-blue-800`;
  };

  // Pilih data berdasarkan tab aktif
  const currentBooks = activeTab === 0 ? physicalBooks : ebookBooks;

  return (
    <div className="w-full lg:p-4 lg:px-6  bg-gray-50 rounded-xl shadow-2xl shadow-t-xl max-w-4xl mx-auto rounded-lg">
      {/* Tab Header */}
      <div className="flex border-b border-gray-200 mb-4">
        {["Buku Fisik", "E-Book"].map((tab, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === index
                ? "text-red-700 border-b-2 border-red-700"
                : "text-gray-700 hover:text-red-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Daftar Buku */}
      <div className="max-h-[450px] lg:max-h-[400px] overflow-y-auto space-y-4 px-2 lg:px-8 lg:py-4">
        {currentBooks.map((book) => (
          <div
            key={book.id}
            className="flex items-center p-2 lg:p-4 bg-white rounded-lg shadow-lg hover:shadow-md transition-shadow "
          >
            {/* Cover placeholder */}
            <div
              className={`w-16 h-24 ${book.coverColor} rounded mr-4 flex items-center justify-center`}
            >
              <span className="text-white text-xs text-center px-1">Cover</span>
            </div>

            <div className="flex-1">
              <h3 className="font-semibold lg:text-[17px] text-[10px] text-gray-900">
                {book.title}
              </h3>
              <p className="text-sm text-gray-600 text-[10px] lg:text-[14px]">
                {book.author}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {book.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-[10px] lg:text-[12px] bg-gray-100 text-gray-800 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="ml-4">
              <span className={getStatusBadge(book.status)}>{book.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookList;

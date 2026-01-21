import { Book, MoreVertical } from "lucide-react";

interface Collection {
  id: number;
  title: string;
  author: string;
  publisher: string;
  publicationYear: string;
  type: string;
  category: {
    name: string;
  };
  image: string | null;
}

interface CollectionGridProps {
  collections: Collection[];
}

export default function CollectionGrid({ collections }: CollectionGridProps) {
  if (collections.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
        <Book className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Belum ada koleksi</h3>
        <p className="text-gray-500 mt-1">
          Mulai dengan menambahkan buku baru ke perpustakaan.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {collections.map((book) => (
        <div
          key={book.id}
          className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
        >
          <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
            {book.image ? (
              <img
                src={book.image}
                alt={book.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Book className="w-16 h-16" />
              </div>
            )}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-2 bg-white/90 backdrop-blur rounded-full shadow-lg hover:bg-white text-gray-700">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-xs font-medium">
                {book.category?.name || "Umum"}
              </p>
              <p className="text-xs opacity-80">
                {book.type.replace("_", " ")}
              </p>
            </div>
          </div>
          <div className="p-5 flex-1 flex flex-col">
            <h3
              className="font-bold text-gray-900 line-clamp-1 mb-1"
              title={book.title}
            >
              {book.title}
            </h3>
            <p className="text-sm text-gray-500 mb-4">{book.author}</p>
            <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-gray-500">
              <span>{book.publicationYear}</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">
                {book.publisher}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

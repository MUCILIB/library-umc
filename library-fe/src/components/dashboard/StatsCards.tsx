import { Book, Users, TrendingUp } from "lucide-react";

interface StatsCardsProps {
  totalCollections: number;
  loanedCount: number; // Placeholder for now
}

export default function StatsCards({
  totalCollections,
  loanedCount,
}: StatsCardsProps) {
  const stats = [
    {
      label: "Total Koleksi",
      value: totalCollections,
      icon: Book,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Dipinjam",
      value: loanedCount,
      icon: Users,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Tersedia",
      value:
        totalCollections - loanedCount > 0 ? totalCollections - loanedCount : 0,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">
                {stat.value}
              </h3>
            </div>
            <div className={`p-3 rounded-xl ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

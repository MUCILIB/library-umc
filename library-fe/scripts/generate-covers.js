import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const coversDir = path.join(__dirname, "../public/covers");
if (!fs.existsSync(coversDir)) {
  fs.mkdirSync(coversDir, { recursive: true });
}

const books = [
  {
    filename: "clean-code.svg",
    title: "Clean Code",
    subtitle: "A Handbook of Agile Software Craftsmanship",
    author: "Robert C. Martin",
    category: "INFORMATIKA & ILMU KOMPUTER",
    bgFrom: "#0f172a",
    bgTo: "#0284c7",
    accent: "#38bdf8",
  },
  {
    filename: "teknik-industri.svg",
    title: "Pengantar Teknik Industri",
    subtitle: "Konsep, Perancangan, dan Optimasi Sistem Terintegrasi",
    author: "Prof. Sritomo Wignjosoebroto",
    category: "TEKNIK INDUSTRI & MANUFAKTUR",
    bgFrom: "#1e293b",
    bgTo: "#334155",
    accent: "#f59e0b",
  },
  {
    filename: "peternakan-tropis.svg",
    title: "Manajemen Ternak Tropis",
    subtitle: "Teknologi Produksi, Nutrisi & Agribisnis Berkelanjutan",
    author: "Dr. Bambang Suwignyo",
    category: "PETERNAKAN & AGROSAINS",
    bgFrom: "#064e3b",
    bgTo: "#059669",
    accent: "#34d399",
  },
  {
    filename: "jaringan-komputer.svg",
    title: "Jaringan Komputer Modern",
    subtitle: "Protokol Routing, Switching & Keamanan Jaringan",
    author: "Andrew S. Tanenbaum",
    category: "D3 TEKNIK INFORMATIKA",
    bgFrom: "#1e1b4b",
    bgTo: "#4338ca",
    accent: "#818cf8",
  },
  {
    filename: "akuntansi-keuangan.svg",
    title: "Akuntansi Keuangan Menengah",
    subtitle: "Standar Akuntansi Keuangan (SAK) Berbasis IFRS Terkini",
    author: "Dwi Martani & Tim",
    category: "EKONOMI & AKUNTANSI",
    bgFrom: "#14532d",
    bgTo: "#15803d",
    accent: "#4ade80",
  },
  {
    filename: "manajemen-pemasaran.svg",
    title: "Manajemen Pemasaran",
    subtitle: "Analisis Pasar, Perilaku Konsumen & Strategi Digital",
    author: "Philip Kotler & Kevin Keller",
    category: "MANAJEMEN BISNIS",
    bgFrom: "#1e3a8a",
    bgTo: "#1d4ed8",
    accent: "#60a5fa",
  },
  {
    filename: "hukum-tata-negara.svg",
    title: "Hukum Tata Negara Indonesia",
    subtitle: "Perkembangan Konstitusionalisme Pasca Reformasi",
    author: "Prof. Dr. Jimly Asshiddiqie",
    category: "HUKUM & TATA KENEGARAAN",
    bgFrom: "#450a0a",
    bgTo: "#991b1b",
    accent: "#f87171",
  },
  {
    filename: "fundamental-keperawatan.svg",
    title: "Buku Ajar Keperawatan Klinis",
    subtitle: "Konsep Holistik, Asuhan Keperawatan & Praktik Profesional",
    author: "Patricia A. Potter & Anne Perry",
    category: "ILMU KEPERAWATAN & NERS",
    bgFrom: "#134e4a",
    bgTo: "#0f766e",
    accent: "#2dd4bf",
  },
  {
    filename: "ilmu-gizi-klinis.svg",
    title: "Prinsip Dasar Ilmu Gizi",
    subtitle: "Metabolisme Makronutrien & Terapi Gizi Klinis Masyarakat",
    author: "Sunita Almatsier, M.Sc",
    category: "GIZI & KESEHATAN MASYARAKAT",
    bgFrom: "#701a75",
    bgTo: "#a21caf",
    accent: "#e879f9",
  },
  {
    filename: "fisiologi-olahraga.svg",
    title: "Fisiologi & Pelatihan Olahraga",
    subtitle: "Biomekanika Gerak, Adaptasi Kardiovaskular & Performa Atlet",
    author: "Prof. Dr. Sukadiyanto",
    category: "ILMU KEOLAHRAGAAN",
    bgFrom: "#7c2d12",
    bgTo: "#c2410c",
    accent: "#fb923c",
  },
  {
    filename: "komunikasi-massa.svg",
    title: "Teori Komunikasi Massa",
    subtitle: "Media Siber, Budaya Populer & Dinamika Opini Publik",
    author: "Denis McQuail",
    category: "ILMU KOMUNIKASI & SOSIAL",
    bgFrom: "#312e81",
    bgTo: "#4f46e5",
    accent: "#a5b4fc",
  },
  {
    filename: "humas-pemerintahan.svg",
    title: "Manajemen Public Relations",
    subtitle: "Komunikasi Krisis, Media Relations & Citra Institusi",
    author: "Rosady Ruslan, S.H., M.M.",
    category: "HUBUNGAN MASYARAKAT",
    bgFrom: "#3b0764",
    bgTo: "#6b21a8",
    accent: "#c084fc",
  },
  {
    filename: "pendidikan-matematika.svg",
    title: "Metodologi Pembelajaran Matematika",
    subtitle: "Desain Instruksional, Pemecahan Masalah & Berpikir Kritis",
    author: "Prof. Dr. H. Erman Suherman",
    category: "KEGURUAN & PENDIDIKAN MATEMATIKA",
    bgFrom: "#0c4a6e",
    bgTo: "#0284c7",
    accent: "#38bdf8",
  },
  {
    filename: "ulumul-quran.svg",
    title: "Pengantar Ilmu Al-Qur'an",
    subtitle: "Asbabun Nuzul, Makkiyah-Madaniyah & Kaidah Penafsiran",
    author: "Prof. Dr. TM Hasbi Ash-Shiddieqy",
    category: "STUDI AGAMA ISLAM & TAFSIR",
    bgFrom: "#022c22",
    bgTo: "#047857",
    accent: "#6ee7b7",
  },
];

function generateSvg(book) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${book.bgFrom}" />
      <stop offset="100%" stop-color="${book.bgTo}" />
    </linearGradient>
    <linearGradient id="spineShadow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.4" />
      <stop offset="3%" stop-color="#ffffff" stop-opacity="0.1" />
      <stop offset="7%" stop-color="#000000" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="400" height="600" fill="url(#bgGrad)" />

  <!-- Geometric Decorative Lines -->
  <circle cx="340" cy="90" r="120" fill="none" stroke="${book.accent}" stroke-width="1.5" stroke-opacity="0.15" />
  <circle cx="340" cy="90" r="80" fill="none" stroke="${book.accent}" stroke-width="1" stroke-opacity="0.1" />
  <path d="M 40 480 L 360 480" stroke="${book.accent}" stroke-width="1" stroke-opacity="0.3" />

  <!-- Top Header / Tag -->
  <g transform="translate(45, 60)">
    <rect x="0" y="0" width="6" height="24" fill="${book.accent}" rx="3" />
    <text x="16" y="16" fill="${book.accent}" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" letter-spacing="2">
      ${book.category}
    </text>
    <text x="16" y="32" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="500">
      PERPUSTAKAAN UNIVERSITAS MUHAMMADIYAH CIREBON
    </text>
  </g>

  <!-- Title & Subtitle -->
  <g transform="translate(45, 170)">
    <!-- Multi-line title wrap -->
    <foreignObject x="0" y="0" width="310" height="180">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #ffffff;">
        <h1 style="margin: 0; font-size: 26px; font-weight: 800; line-height: 1.25; letter-spacing: -0.02em; text-shadow: 0 2px 4px rgba(0,0,0,0.4);">
          ${book.title}
        </h1>
        <p style="margin: 12px 0 0 0; font-size: 13px; font-weight: 400; line-height: 1.45; color: #cbd5e1; opacity: 0.95;">
          ${book.subtitle}
        </p>
      </div>
    </foreignObject>
  </g>

  <!-- Author & Meta Footer -->
  <g transform="translate(45, 500)">
    <text x="0" y="16" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="600" letter-spacing="1">
      PENULIS / PENGARANG
    </text>
    <text x="0" y="38" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="700">
      ${book.author}
    </text>
    
    <!-- Mini Badge -->
    <rect x="220" y="10" width="90" height="26" rx="6" fill="#000000" fill-opacity="0.3" stroke="${book.accent}" stroke-width="1" stroke-opacity="0.4" />
    <text x="265" y="27" fill="${book.accent}" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="700" text-anchor="middle" letter-spacing="1">
      KOLEKSI REAL
    </text>
  </g>

  <!-- Realistic Left Spine Shadow -->
  <rect x="0" y="0" width="28" height="600" fill="url(#spineShadow)" />
</svg>`;
}

for (const book of books) {
  const filePath = path.join(coversDir, book.filename);
  fs.writeFileSync(filePath, generateSvg(book), "utf8");
  console.log(`Generated cover: ${book.filename}`);
}

console.log(`Successfully generated ${books.length} book covers in ${coversDir}`);

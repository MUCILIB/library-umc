import { useId } from "react";

interface EmblemProps {
  className?: string;
}

/**
 * Monochrome Universitas Muhammadiyah Cirebon circular seal for library cards.
 */
export const UmcSealEmblem = ({ className = "h-12 w-12" }: EmblemProps) => {
  const uid = useId().replace(/:/g, "");
  const topArcId = `umc-top-${uid}`;
  const bottomArcId = `umc-bottom-${uid}`;

  // 16-scallop lotus outer perimeter
  const outerScallops = Array.from({ length: 16 }, (_, idx) => {
    const angle = (idx * Math.PI * 2) / 16 - Math.PI / 2;
    const nextAngle = ((idx + 1) * Math.PI * 2) / 16 - Math.PI / 2;
    const midAngle = (angle + nextAngle) / 2;
    const rOuter = 46;
    const rPeak = 49.5;
    const x1 = 50 + rOuter * Math.cos(angle);
    const y1 = 50 + rOuter * Math.sin(angle);
    const cx = 50 + rPeak * Math.cos(midAngle);
    const cy = 50 + rPeak * Math.sin(midAngle);
    const x2 = 50 + rOuter * Math.cos(nextAngle);
    const y2 = 50 + rOuter * Math.sin(nextAngle);
    return `${idx === 0 ? `M ${x1.toFixed(2)} ${y1.toFixed(2)}` : ""} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }).join(" ");

  const innerScallops = Array.from({ length: 16 }, (_, idx) => {
    const angle = (idx * Math.PI * 2) / 16 - Math.PI / 2;
    const nextAngle = ((idx + 1) * Math.PI * 2) / 16 - Math.PI / 2;
    const midAngle = (angle + nextAngle) / 2;
    const rOuter = 43;
    const rPeak = 46.2;
    const x1 = 50 + rOuter * Math.cos(angle);
    const y1 = 50 + rOuter * Math.sin(angle);
    const cx = 50 + rPeak * Math.cos(midAngle);
    const cy = 50 + rPeak * Math.sin(midAngle);
    const x2 = 50 + rOuter * Math.cos(nextAngle);
    const y2 = 50 + rOuter * Math.sin(nextAngle);
    return `${idx === 0 ? `M ${x1.toFixed(2)} ${y1.toFixed(2)}` : ""} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }).join(" ");

  const sunRays = Array.from({ length: 12 }, (_, idx) => {
    const deg = idx * 30;
    return (
      <polygon
        key={deg}
        points="50,27 48.2,37 51.8,37"
        fill="currentColor"
        transform={`rotate(${deg} 50 50)`}
      />
    );
  });

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-label="Logo Universitas Muhammadiyah Cirebon"
      role="img"
    >
      <defs>
        <path id={topArcId} d="M 16 53 A 34 34 0 1 1 84 53" />
        <path id={bottomArcId} d="M 21 63 A 33 33 0 0 0 79 63" />
      </defs>

      <path
        d={`${outerScallops} Z`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d={`${innerScallops} Z`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />

      <text
        fill="currentColor"
        fontSize="6.7"
        fontWeight="800"
        letterSpacing="0.5"
        textAnchor="middle"
      >
        <textPath href={`#${topArcId}`} startOffset="50%">
          UNIVERSITAS MUHAMMADIYAH
        </textPath>
      </text>

      <text
        fill="currentColor"
        fontSize="7"
        fontWeight="800"
        letterSpacing="1.6"
        textAnchor="middle"
      >
        <textPath href={`#${bottomArcId}`} startOffset="50%">
          CIREBON
        </textPath>
      </text>

      {/* Side stars */}
      <circle cx="20" cy="60" r="1.5" fill="currentColor" />
      <circle cx="80" cy="60" r="1.5" fill="currentColor" />

      {/* Wheat & cotton garlands */}
      <path
        d="M 48 73 C 30 70 23 55 29 36"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="2.4 2.1"
        strokeLinecap="round"
      />
      <path
        d="M 52 73 C 70 70 77 55 71 36"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="2.4 2.1"
        strokeLinecap="round"
      />

      {/* Muhammadiyah sunburst & inner emblem */}
      {sunRays}
      <circle cx="50" cy="50" r="13.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="50" cy="50" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <text
        x="50"
        y="52.6"
        textAnchor="middle"
        fill="currentColor"
        fontSize="6.6"
        fontWeight="800"
        letterSpacing="0.4"
      >
        UMC
      </text>
    </svg>
  );
};

/**
 * Library owl mascot illustration matching the UMC member card mockup.
 */
export const OwlLibraryMascot = ({ className = "h-36 w-36" }: EmblemProps) => (
  <svg
    viewBox="0 0 220 210"
    className={className}
    aria-hidden="true"
  >
    {/* Ground shadow */}
    <ellipse cx="114" cy="186" rx="56" ry="8.5" fill="#0F172A" />

    {/* Floating doodles */}
    <path
      d="M42 28 C33 32 31 44 39 50 C44 54 51 52 54 48 C46 49 41 44 41 37 C41 33 43 30 46 28 Z"
      fill="none"
      stroke="#F5D76E"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path
      d="M72 16 L75 21 L80 22 L76 25 L77 30 L72 28 L68 30 L69 25 L65 22 L70 21 Z"
      fill="none"
      stroke="#F5D76E"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M148 15 Q150 22 157 24 Q150 26 148 33 Q146 26 139 24 Q146 22 148 15 Z"
      fill="#F5D76E"
    />
    <path
      d="M180 76 L194 72 L198 92 L184 96 Z"
      fill="none"
      stroke="#F5D76E"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M184 79 L192 77 M185 84 L193 82 M186 89 L194 87"
      stroke="#F5D76E"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M34 128 C27 132 30 142 38 140 C43 139 40 132 35 135 C31 138 35 148 45 147"
      fill="none"
      stroke="#F5D76E"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M178 46 C185 45 186 55 178 56 C173 57 174 51 179 52 C186 53 187 63 177 65"
      fill="none"
      stroke="#F5D76E"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path d="M167 166 L181 160 M170 173 L184 172" stroke="#F5D76E" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="48" cy="111" r="2.6" fill="#F5D76E" />
    <circle cx="174" cy="116" r="2.8" fill="#F5D76E" />

    {/* Bottom book (mustard/amber) */}
    <g>
      <rect x="70" y="162" width="90" height="21" rx="6" fill="#C9973B" stroke="#111827" strokeWidth="2.8" />
      <path d="M90 165 H156 V180 H90 C84 180 84 165 90 165 Z" fill="#F5E5B8" stroke="#111827" strokeWidth="2.2" />
      <line x1="94" y1="170" x2="150" y2="170" stroke="#C9973B" strokeWidth="1.4" />
      <line x1="94" y1="175" x2="148" y2="175" stroke="#C9973B" strokeWidth="1.4" />
    </g>

    {/* Top book (coral red) */}
    <g>
      <rect x="66" y="142" width="94" height="21" rx="6" fill="#E3594F" stroke="#111827" strokeWidth="2.8" />
      <path d="M72 145 H140 C145 145 145 160 140 160 H72 Z" fill="#F9E7B6" stroke="#111827" strokeWidth="2.2" />
      <line x1="78" y1="150" x2="136" y2="150" stroke="#D97757" strokeWidth="1.4" />
      <line x1="78" y1="155" x2="134" y2="155" stroke="#D97757" strokeWidth="1.4" />
    </g>

    {/* Owl body */}
    <path
      d="M72 52 C68 35 76 31 85 40 C98 34 126 34 139 40 C148 31 156 35 152 52 C164 68 166 96 154 118 C144 135 128 142 112 142 C96 142 80 135 70 118 C58 96 60 68 72 52 Z"
      fill="#4D5B9E"
      stroke="#111827"
      strokeWidth="3"
      strokeLinejoin="round"
    />

    {/* Cream belly */}
    <path
      d="M81 95 C81 84 95 79 112 79 C129 79 143 84 143 95 C144 121 131 139 112 139 C93 139 80 121 81 95 Z"
      fill="#FBF0C9"
      stroke="#111827"
      strokeWidth="2.5"
    />
    {/* Belly feather arcs */}
    <path
      d="M99 108 Q103 113 107 108 M113 108 Q117 113 121 108 M106 118 Q110 123 114 118"
      fill="none"
      stroke="#D7BE82"
      strokeWidth="2.2"
      strokeLinecap="round"
    />

    {/* Right wing (viewer right, tucked) */}
    <path
      d="M148 82 C163 92 167 115 155 129 C147 134 140 126 141 114 C142 103 142 92 148 82 Z"
      fill="#43508E"
      stroke="#111827"
      strokeWidth="2.8"
      strokeLinejoin="round"
    />

    {/* Left wing holding book */}
    <path
      d="M74 87 C58 94 55 110 64 122 C70 129 80 124 81 114"
      fill="#43508E"
      stroke="#111827"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Open book held by owl */}
    <g transform="translate(36, 75) rotate(-14)">
      <path d="M2 8 L20 2 L24 30 L6 36 Z" fill="#F9ECC7" stroke="#111827" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M20 2 L38 6 L42 34 L24 30 Z" fill="#F3DFAC" stroke="#111827" strokeWidth="2.5" strokeLinejoin="round" />
      <line x1="8" y1="14" x2="18" y2="11" stroke="#B69E6C" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="20" x2="19" y2="17" stroke="#B69E6C" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="25" y1="10" x2="35" y2="12" stroke="#B69E6C" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="16" x2="36" y2="18" stroke="#B69E6C" strokeWidth="1.5" strokeLinecap="round" />
    </g>

    {/* Face & glasses */}
    <circle cx="94" cy="64" r="16" fill="#FFFFFF" stroke="#111827" strokeWidth="3.4" />
    <circle cx="129" cy="64" r="16" fill="#FFFFFF" stroke="#111827" strokeWidth="3.4" />
    <path d="M110 62 Q112 59 113 62" fill="none" stroke="#111827" strokeWidth="3.4" strokeLinecap="round" />
    <path d="M78 60 L66 57" stroke="#111827" strokeWidth="3" strokeLinecap="round" />
    <path d="M145 60 L158 57" stroke="#111827" strokeWidth="3" strokeLinecap="round" />

    {/* Pupils */}
    <circle cx="96" cy="64" r="5.5" fill="#111827" />
    <circle cx="98" cy="62" r="1.8" fill="#FFFFFF" />
    <circle cx="127" cy="64" r="5.5" fill="#111827" />
    <circle cx="129" cy="62" r="1.8" fill="#FFFFFF" />

    {/* Beak */}
    <path
      d="M106 70 Q112 66 118 70 L112 83 Z"
      fill="#F4BA3E"
      stroke="#111827"
      strokeWidth="2.4"
      strokeLinejoin="round"
    />

    {/* Red bow tie */}
    <g>
      <path d="M112 91 L97 84 L99 98 Z" fill="#E3594F" stroke="#111827" strokeWidth="2.3" strokeLinejoin="round" />
      <path d="M112 91 L127 84 L125 98 Z" fill="#E3594F" stroke="#111827" strokeWidth="2.3" strokeLinejoin="round" />
      <circle cx="112" cy="91" r="4.5" fill="#C94138" stroke="#111827" strokeWidth="2.3" />
    </g>

    {/* Feet */}
    <path
      d="M95 141 L92 146 M99 141 L99 146 M103 141 L106 146"
      stroke="#F4BA3E"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
    <path
      d="M121 141 L118 146 M125 141 L125 146 M129 141 L132 146"
      stroke="#F4BA3E"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
  </svg>
);

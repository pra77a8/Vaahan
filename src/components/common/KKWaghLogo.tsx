import React from 'react';

interface KKWaghLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export const KKWaghLogo: React.FC<KKWaghLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = false,
}) => {
  const sizeMap = {
    sm: { w: 34, h: 34, text: 'text-sm' },
    md: { w: 44, h: 44, text: 'text-base' },
    lg: { w: 60, h: 60, text: 'text-lg' },
    xl: { w: 84, h: 84, text: 'text-xl' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official Emblem Graphic */}
      <div 
        className="relative flex items-center justify-center shrink-0 bg-white rounded-full p-1 shadow-xs border border-sky-100"
        style={{ width: currentSize.w + 6, height: currentSize.h + 6 }}
        title="Karmaveer Kakasaheb Wagh Education Society"
      >
        <svg
          viewBox="0 0 200 120"
          className="w-full h-full text-sky-600 drop-shadow-xs"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Bottom decorative swirls */}
          <path
            d="M 10 105 C 30 105, 45 85, 60 92 C 72 98, 78 112, 92 112 C 100 112, 105 105, 100 100 C 95 95, 88 100, 88 105 C 88 108, 92 110, 95 108 C 82 108, 75 92, 62 88 C 45 82, 30 102, 12 98 C 6 96, 2 92, 2 92"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="currentColor"
            fillOpacity="0.15"
          />
          <path
            d="M 190 105 C 170 105, 155 85, 140 92 C 128 98, 122 112, 108 112 C 100 112, 95 105, 100 100 C 105 95, 112 100, 112 105 C 112 108, 108 110, 105 108 C 118 108, 125 92, 138 88 C 155 82, 170 102, 188 98 C 194 96, 198 92, 198 92"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="currentColor"
            fillOpacity="0.15"
          />

          {/* Central Oval Frame */}
          <ellipse
            cx="100"
            cy="52"
            rx="38"
            ry="48"
            stroke="currentColor"
            strokeWidth="3.5"
            fill="#F0F9FF"
          />
          <ellipse
            cx="100"
            cy="52"
            rx="34"
            ry="44"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />

          {/* Outer Arch Text along curve representation */}
          <path id="curveLeft" d="M 68 85 A 42 50 0 0 1 76 22" fill="none" stroke="none" />
          <path id="curveRight" d="M 124 22 A 42 50 0 0 1 132 85" fill="none" stroke="none" />

          {/* Monogram KKWES Intertwined letters */}
          <g transform="translate(100, 52) scale(0.68)" textAnchor="middle" dominantBaseline="middle">
            {/* Artistic stylized W, K, K, E, S vectors */}
            {/* Stylized K Left */}
            <path
              d="M -22 -35 L -22 35 M -22 0 L 0 -35 M -10 -15 L 2 35"
              stroke="currentColor"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Central W */}
            <path
              d="M -30 -20 L -18 30 L 0 -15 L 18 30 L 30 -20"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Stylized E & S motifs */}
            <path
              d="M -14 22 C -6 32, 10 32, 18 20 C 22 14, 15 5, 0 5 C -15 5, -20 -5, -15 -14"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Decorative spiral curls inside oval */}
            <circle cx="-16" cy="-28" r="3" fill="currentColor" />
            <circle cx="16" cy="-28" r="3" fill="currentColor" />
            <circle cx="0" cy="32" r="3.5" fill="currentColor" />
          </g>

          {/* Subtle perimeter circular typography label */}
          <text fontSize="7" fill="currentColor" fontWeight="700" letterSpacing="1.2">
            <textPath href="#curveLeft" startOffset="5%">
              KK WAGH
            </textPath>
          </text>
          <text fontSize="6.5" fill="currentColor" fontWeight="700" letterSpacing="1.2">
            <textPath href="#curveRight" startOffset="10%">
              EDUCATION
            </textPath>
          </text>
        </svg>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="font-extrabold tracking-tight text-slate-900 text-lg md:text-xl font-['Plus_Jakarta_Sans']">
            Vaahan
          </span>
          <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider border border-sky-200">
            KK Wagh
          </span>
        </div>
        {showSubtitle ? (
          <span className="text-[11px] font-medium text-slate-500 tracking-tight leading-tight">
            K. K. Wagh Institute · Campus Transit
          </span>
        ) : null}
      </div>
    </div>
  );
};

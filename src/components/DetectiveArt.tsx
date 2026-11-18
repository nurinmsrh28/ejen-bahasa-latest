import React, { useState } from 'react';
import { Compass, Feather, PenTool, Search } from 'lucide-react';
import { generateQrMatrix } from '../game/rules';
import type { FacilityAssetId } from '../game/types';

export function AcademyEmblem({ className = 'w-14 h-14' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="crestGold" x1="14" y1="6" x2="82" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E6C987" />
          <stop offset="50%" stopColor="#C6A15B" />
          <stop offset="100%" stopColor="#8E6C32" />
        </linearGradient>
      </defs>
      {/* Outer Shield */}
      <path
        d="M48 5L83 18V46C83 68 67 83 48 91C29 83 13 68 13 46V18L48 5Z"
        fill="#11201B"
        stroke="url(#crestGold)"
        strokeWidth="3.5"
      />
      {/* Inner Forest Shield */}
      <path
        d="M48 12L76 22.5V45.5C76 63.5 63 75.5 48 82.5C33 75.5 20 63.5 20 45.5V22.5L48 12Z"
        fill="#172B25"
        stroke="#C6A15B"
        strokeOpacity="0.5"
        strokeWidth="1.4"
      />
      {/* Laurel accents */}
      <path d="M27 42C25 52 29 61 36 67" stroke="url(#crestGold)" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 3" />
      <path d="M69 42C71 52 67 61 60 67" stroke="url(#crestGold)" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 3" />
      {/* Open Storybook */}
      <path
        d="M29 54C35 51 42 52 48 56C54 52 61 51 67 54V66C61 63 54 64 48 68C42 64 35 63 29 66V54Z"
        fill="#D9D4C8"
        stroke="url(#crestGold)"
        strokeWidth="2"
      />
      <line x1="48" y1="56" x2="48" y2="68" stroke="#172B25" strokeWidth="1.8" />
      {/* Magnifying Glass */}
      <circle cx="45" cy="37" r="11.5" fill="#D9D4C8" fillOpacity="0.16" stroke="url(#crestGold)" strokeWidth="3" />
      <circle cx="45" cy="37" r="7.5" stroke="#FAF6EE" strokeWidth="1.3" strokeDasharray="3 2" />
      <path d="M40 33C41.5 31 44 30 47 30.5" stroke="#FAF6EE" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="53.5" y1="45.5" x2="62.5" y2="54.5" stroke="url(#crestGold)" strokeWidth="4.2" strokeLinecap="round" />
      {/* Leather/Crimson Wax Point */}
      <circle cx="48" cy="19" r="3.2" fill="#C2593F" stroke="#FAF6EE" strokeWidth="1" />
    </svg>
  );
}

export function ProfesorCitraPortrait({
  className = 'w-20 h-20',
  realistic = true,
}: {
  className?: string;
  realistic?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  if (realistic && !imgFailed) {
    return (
      <div
        className={`relative rounded-full overflow-hidden border-[3px] border-[#C6A15B] bg-[#172B25] ring-1 ring-[#FAF6EE]/20 ${className}`}
      >
        <img
          src="/assets/aistudio/Professor_Detective_in_the_Investigation_Office_54081002.png"
          alt="Potret Profesor Nurin"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover object-center scale-[1.04]"
        />
      </div>
    );
  }

  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Ilustrasi Profesor Nurin"
    >
      <defs>
        <radialGradient id="citraHalo" cx="0.5" cy="0.35" r="0.65">
          <stop offset="0%" stopColor="#FAF6EE" />
          <stop offset="100%" stopColor="#DFD1B4" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill="#172B25" stroke="#C6A15B" strokeWidth="3.5" />
      <circle cx="60" cy="60" r="50" fill="url(#citraHalo)" />
      <circle cx="60" cy="23" r="14" fill="#2A231E" />
      <path d="M48 22C52 17 68 17 72 22" stroke="#C6A15B" strokeWidth="2" strokeLinecap="round" />
      <path d="M23 107C25 82 41 75 60 75C79 75 95 82 97 107" fill="#172B25" />
      <path d="M45 76L38 106M75 76L82 106" stroke="#795A40" strokeWidth="2.5" />
      <path d="M47 75L60 94L73 75H47Z" fill="#FAF6EE" />
      <path d="M53 77L60 88L67 77" stroke="#C2593F" strokeWidth="3" strokeLinecap="round" />
      <rect x="53" y="64" width="14" height="14" rx="5" fill="#E4B497" />
      <ellipse cx="60" cy="50" rx="20" ry="22" fill="#ECC0A4" />
      <path
        d="M39 48C39 33 50 25 60 25C70 25 81 33 81 48C77 37 68 34 60 35C52 34 43 37 39 48Z"
        fill="#2A231E"
      />
      <circle cx="51" cy="50" r="6.8" fill="#FAF6EE" fillOpacity="0.35" stroke="#C6A15B" strokeWidth="2.2" />
      <circle cx="69" cy="50" r="6.8" fill="#FAF6EE" fillOpacity="0.35" stroke="#C6A15B" strokeWidth="2.2" />
      <line x1="57.8" y1="50" x2="62.2" y2="50" stroke="#C6A15B" strokeWidth="2" />
      <circle cx="51" cy="50" r="2.1" fill="#1B241E" />
      <circle cx="69" cy="50" r="2.1" fill="#1B241E" />
      <path d="M53 60C56 64 64 64 67 60" stroke="#9F432C" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="77" cy="92" r="4.2" fill="#C6A15B" stroke="#172B25" strokeWidth="1.3" />
    </svg>
  );
}

export function TeamInsigniaIcon({
  badgeName,
  className = 'w-5 h-5',
}: {
  badgeName: string;
  className?: string;
}) {
  switch (badgeName) {
    case 'Helang Bestari':
      return <Feather className={className} />;
    case 'Kanta Ilmu':
      return <Search className={className} />;
    case 'Pena Emas':
      return <PenTool className={className} />;
    case 'Arkitek Muda':
    default:
      return <Compass className={className} />;
  }
}

export function QrCodeVisual({
  seed,
  className = 'w-20 h-20',
}: {
  seed: string;
  className?: string;
}) {
  const matrix = generateQrMatrix(seed);
  return (
    <svg
      viewBox="0 0 21 21"
      className={className}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Kod QR Pengesahan Identiti Ejen"
    >
      <rect width="21" height="21" fill="#FAF6EE" rx="1" />
      {matrix.map((row, rIdx) =>
        row.map((filled, cIdx) =>
          filled ? (
            <rect key={`${rIdx}-${cIdx}`} x={cIdx} y={rIdx} width="1" height="1" fill="#172B25" />
          ) : null
        )
      )}
    </svg>
  );
}

export function SchoolBackdropArt() {
  return (
    <svg
      viewBox="0 0 1200 640"
      className="w-full h-full object-cover"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="skyTwilight" x1="600" y1="0" x2="600" y2="480" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#12281D" />
          <stop offset="55%" stopColor="#234936" />
          <stop offset="100%" stopColor="#4A6B57" />
        </linearGradient>
        <radialGradient id="lanternGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#F5C76B" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#F5C76B" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1200" height="640" fill="url(#skyTwilight)" />

      {/* Crescent moon & subtle stars */}
      <circle cx="960" cy="110" r="34" fill="#FAF6EE" fillOpacity="0.9" />
      <circle cx="974" cy="102" r="30" fill="#1A3527" />
      <circle cx="210" cy="95" r="2" fill="#FAF6EE" fillOpacity="0.7" />
      <circle cx="340" cy="135" r="2.5" fill="#D49B27" fillOpacity="0.8" />
      <circle cx="780" cy="82" r="2" fill="#FAF6EE" fillOpacity="0.65" />
      <circle cx="1070" cy="160" r="2" fill="#FAF6EE" fillOpacity="0.6" />

      {/* Rolling hills */}
      <path d="M0 440C200 370 420 410 640 390C860 370 1050 400 1200 375V640H0V440Z" fill="#1B392A" />

      {/* Main School Silhouette: Sekolah Seri Bestari */}
      <g transform="translate(240, 175)">
        {/* Left & Right Wings */}
        <rect x="20" y="130" width="220" height="165" fill="#2A4838" stroke="#14291F" strokeWidth="2" />
        <rect x="480" y="130" width="220" height="165" fill="#2A4838" stroke="#14291F" strokeWidth="2" />
        {/* Terracotta Roofs */}
        <polygon points="8,130 130,68 250,130" fill="#9F432C" />
        <polygon points="470,130 590,68 712,130" fill="#9F432C" />

        {/* Central Clock Tower & Hall */}
        <rect x="235" y="95" width="250" height="200" fill="#325542" stroke="#14291F" strokeWidth="2" />
        <rect x="315" y="18" width="90" height="90" fill="#39604B" stroke="#14291F" strokeWidth="2" />
        <polygon points="303,20 360,-24 417,20" fill="#C2593F" />
        {/* Clock face */}
        <circle cx="360" cy="56" r="22" fill="#FAF6EE" stroke="#D49B27" strokeWidth="3" />
        <line x1="360" y1="56" x2="360" y2="43" stroke="#183426" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="360" y1="56" x2="371" y2="56" stroke="#C2593F" strokeWidth="2.5" strokeLinecap="round" />

        {/* Warm Lit Windows */}
        {[55, 115, 175, 520, 580, 640].map((wx) => (
          <g key={wx}>
            <rect x={wx} y="155" width="32" height="44" rx="4" fill="#E8B857" fillOpacity="0.82" />
            <rect x={wx} y="220" width="32" height="44" rx="4" fill="#E8B857" fillOpacity="0.6" />
          </g>
        ))}
        {[265, 425].map((wx) => (
          <g key={wx}>
            <rect x={wx} y="135" width="34" height="52" rx="17" fill="#F2CA6B" fillOpacity="0.88" />
          </g>
        ))}
        {/* Archway entrance */}
        <path d="M325 295V235C325 215 395 215 395 235V295H325Z" fill="#162A20" />
        <circle cx="360" cy="245" r="46" fill="url(#lanternGlow)" />
      </g>

      {/* Foreground Trees & Courtyard */}
      <rect x="0" y="470" width="1200" height="170" fill="#13271D" />
      <path d="M520 470L430 640H770L680 470H520Z" fill="#2A4032" />
      <circle cx="130" cy="435" r="78" fill="#183627" />
      <circle cx="195" cy="455" r="60" fill="#214634" />
      <circle cx="1070" cy="430" r="82" fill="#183627" />
      <circle cx="995" cy="460" r="58" fill="#214634" />
    </svg>
  );
}

export function FacilityIconSvg({
  assetId,
  className = 'w-8 h-8',
}: {
  assetId: FacilityAssetId;
  className?: string;
}) {
  switch (assetId) {
    case 'kantin':
      return (
        <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
          <rect x="5" y="16" width="30" height="18" rx="3" fill="#FAF6EE" stroke="#183426" strokeWidth="2" />
          <path d="M3 16L8 8H32L37 16H3Z" fill="#C2593F" stroke="#183426" strokeWidth="2" />
          <rect x="13" y="21" width="14" height="7" rx="1.5" fill="#D49B27" />
        </svg>
      );
    case 'bilik_darjah':
      return (
        <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
          <rect x="6" y="12" width="28" height="22" rx="2.5" fill="#F2EAD8" stroke="#183426" strokeWidth="2" />
          <rect x="10" y="16" width="20" height="10" rx="1.5" fill="#234936" />
          <rect x="16" y="28" width="8" height="6" fill="#C2593F" />
          <path d="M4 12L20 5L36 12" stroke="#183426" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'perpustakaan':
      return (
        <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
          <rect x="7" y="9" width="26" height="24" rx="3" fill="#FAF6EE" stroke="#183426" strokeWidth="2" />
          <rect x="11" y="13" width="4" height="15" rx="1" fill="#C2593F" />
          <rect x="18" y="13" width="4" height="15" rx="1" fill="#D49B27" />
          <rect x="25" y="13" width="4" height="15" rx="1" fill="#234936" />
        </svg>
      );
    case 'taman_herba':
      return (
        <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
          <rect x="6" y="24" width="28" height="9" rx="2" fill="#8C5A3C" stroke="#183426" strokeWidth="2" />
          <path d="M14 24C14 17 10 14 10 14C10 14 17 13 18 24" fill="#6F8F78" stroke="#183426" strokeWidth="1.6" />
          <path d="M24 24C24 15 29 11 29 11C29 11 20 11 20 24" fill="#2F5E47" stroke="#183426" strokeWidth="1.6" />
        </svg>
      );
    case 'taman_permainan':
      return (
        <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
          <path d="M8 31L16 11H24L32 31" stroke="#183426" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="20" y1="11" x2="20" y2="23" stroke="#C2593F" strokeWidth="2" />
          <rect x="15" y="23" width="10" height="4" rx="1.5" fill="#D49B27" stroke="#183426" strokeWidth="1.5" />
        </svg>
      );
    case 'padang':
      return (
        <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
          <rect x="5" y="9" width="30" height="22" rx="3" fill="#4E7D5B" stroke="#183426" strokeWidth="2" />
          <line x1="20" y1="9" x2="20" y2="31" stroke="#FAF6EE" strokeWidth="1.6" />
          <circle cx="20" cy="20" r="4.5" stroke="#FAF6EE" strokeWidth="1.6" />
        </svg>
      );
    case 'tong_sampah':
      return (
        <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
          <rect x="11" y="13" width="18" height="21" rx="2.5" fill="#2F5E47" stroke="#183426" strokeWidth="2" />
          <path d="M9 13H31" stroke="#183426" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M16 13V9H24V13" stroke="#183426" strokeWidth="2" />
          <circle cx="20" cy="23" r="4" fill="#D49B27" />
        </svg>
      );
    case 'cuci_tangan':
      return (
        <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
          <rect x="9" y="21" width="22" height="8" rx="3" fill="#FAF6EE" stroke="#183426" strokeWidth="2" />
          <path d="M20 21V13C20 10 24 10 24 13" stroke="#183426" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M16 29V34M24 29V34" stroke="#183426" strokeWidth="2" strokeLinecap="round" />
          <circle cx="15" cy="17" r="2.2" fill="#5BA4B5" />
        </svg>
      );
    case 'bangku':
      return (
        <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
          <rect x="7" y="16" width="26" height="5" rx="1.5" fill="#B87D14" stroke="#183426" strokeWidth="1.8" />
          <rect x="6" y="23" width="28" height="4" rx="1.5" fill="#D49B27" stroke="#183426" strokeWidth="1.8" />
          <path d="M10 27V33M30 27V33" stroke="#183426" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'pokok':
      return (
        <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
          <rect x="17.5" y="23" width="5" height="11" rx="1.5" fill="#7D4E32" stroke="#183426" strokeWidth="1.5" />
          <circle cx="20" cy="17" r="10" fill="#2F5E47" stroke="#183426" strokeWidth="2" />
          <circle cx="15" cy="19" r="6" fill="#6F8F78" />
        </svg>
      );
    case 'bunga':
      return (
        <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
          <path d="M20 33V20" stroke="#234936" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="20" cy="13" r="4" fill="#C2593F" />
          <circle cx="14" cy="17" r="4" fill="#C2593F" />
          <circle cx="26" cy="17" r="4" fill="#C2593F" />
          <circle cx="16" cy="22" r="4" fill="#C2593F" />
          <circle cx="24" cy="22" r="4" fill="#C2593F" />
          <circle cx="20" cy="18" r="3.5" fill="#D49B27" />
        </svg>
      );
    case 'laluan':
      return (
        <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
          <rect x="6" y="13" width="28" height="14" rx="2" fill="#E5D8BD" stroke="#183426" strokeWidth="2" />
          <line x1="11" y1="20" x2="17" y2="20" stroke="#9F432C" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="23" y1="20" x2="29" y2="20" stroke="#9F432C" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
  }
}

export function BadgeIconSvg({
  badgeId,
  earned,
  className = 'w-14 h-14',
}: {
  badgeId: string;
  earned: boolean;
  className?: string;
}) {
  const gradId = `medalGold-${badgeId}-${earned ? 'on' : 'off'}`;
  const rim = earned ? '#241709' : '#3a423d';
  const inner = earned ? '#133a2b' : '#1b231f';
  const accent = earned ? '#fff3c4' : '#7b857e';
  const emblemFill = earned ? '#C2593F' : '#535b55';

  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          {earned ? (
            <>
              <stop offset="0%" stopColor="#FFF0B8" />
              <stop offset="45%" stopColor="#E7B94F" />
              <stop offset="100%" stopColor="#8A6320" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#6B726E" />
              <stop offset="50%" stopColor="#4A524E" />
              <stop offset="100%" stopColor="#2B312E" />
            </>
          )}
        </linearGradient>
      </defs>

      {/* Outer Laurel Wreath Leaves */}
      <g stroke={`url(#${gradId})`} strokeWidth="1.8" strokeLinecap="round">
        <path d="M13 46C8 39 7 29 11 20" fill="none" />
        <path d="M51 46C56 39 57 29 53 20" fill="none" />
        <ellipse cx="9" cy="36" rx="2.4" ry="4.2" transform="rotate(-22 9 36)" fill={`url(#${gradId})`} stroke="none" />
        <ellipse cx="9" cy="27" rx="2.3" ry="4" transform="rotate(-8 9 27)" fill={`url(#${gradId})`} stroke="none" />
        <ellipse cx="13" cy="19" rx="2.2" ry="3.8" transform="rotate(14 13 19)" fill={`url(#${gradId})`} stroke="none" />
        <ellipse cx="15" cy="44" rx="2.4" ry="4.1" transform="rotate(-44 15 44)" fill={`url(#${gradId})`} stroke="none" />

        <ellipse cx="55" cy="36" rx="2.4" ry="4.2" transform="rotate(22 55 36)" fill={`url(#${gradId})`} stroke="none" />
        <ellipse cx="55" cy="27" rx="2.3" ry="4" transform="rotate(8 55 27)" fill={`url(#${gradId})`} stroke="none" />
        <ellipse cx="51" cy="19" rx="2.2" ry="3.8" transform="rotate(-14 51 19)" fill={`url(#${gradId})`} stroke="none" />
        <ellipse cx="49" cy="44" rx="2.4" ry="4.1" transform="rotate(44 49 44)" fill={`url(#${gradId})`} stroke="none" />
      </g>

      {/* Metallic Medal Disc */}
      <circle cx="32" cy="32" r="20" fill={`url(#${gradId})`} stroke={rim} strokeWidth="2.2" />
      <circle cx="32" cy="32" r="16" fill={inner} stroke={accent} strokeWidth="1.2" strokeOpacity={earned ? 0.85 : 0.3} />
      <circle cx="32" cy="32" r="13.5" stroke={accent} strokeWidth="0.9" strokeDasharray="2.5 2.5" strokeOpacity={earned ? 0.65 : 0.25} />

      {/* Embossed Achievement Icon */}
      {badgeId === 'mata_helang' && (
        <g>
          <circle cx="31" cy="31" r="6.5" fill={emblemFill} stroke={accent} strokeWidth="1.8" />
          <path d="M35.8 35.8L40.5 40.5" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="29" cy="29" r="1.5" fill={accent} />
        </g>
      )}
      {badgeId === 'penganalisis_kes' && (
        <g>
          <rect x="24" y="23" width="16" height="18" rx="2.2" fill={emblemFill} stroke={accent} strokeWidth="1.7" />
          <line x1="27.5" y1="28.5" x2="36.5" y2="28.5" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="27.5" y1="32.5" x2="36.5" y2="32.5" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="27.5" y1="36.5" x2="33" y2="36.5" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
        </g>
      )}
      {badgeId === 'ahli_logik' && (
        <g>
          <path d="M32 21V41M24 27H40" stroke={accent} strokeWidth="2" strokeLinecap="round" />
          <path d="M22 33L25 27L28 33H22Z" fill={emblemFill} stroke={accent} strokeWidth="1.3" />
          <path d="M36 33L39 27L42 33H36Z" fill={emblemFill} stroke={accent} strokeWidth="1.3" />
          <rect x="27" y="40" width="10" height="2.5" rx="1" fill={accent} />
        </g>
      )}
      {badgeId === 'pereka_bestari' && (
        <g>
          <polygon points="32,20 42,36 22,36" fill={emblemFill} stroke={accent} strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="32" cy="31" r="2.2" fill={accent} />
          <rect x="24" y="38.5" width="16" height="2.5" rx="1" fill={accent} />
        </g>
      )}
      {badgeId === 'arkitek_impian' && (
        <polygon
          points="32,19 35.4,26.8 43.8,27.7 37.5,33.4 39.2,41.6 32,37.4 24.8,41.6 26.5,33.4 20.2,27.7 28.6,26.8"
          fill={`url(#${gradId})`}
          stroke={accent}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

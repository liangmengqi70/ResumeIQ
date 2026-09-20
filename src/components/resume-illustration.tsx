export function ResumeIllustration() {
  return (
    <svg
      viewBox="0 0 480 520"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="resume-illustration"
      aria-hidden="true"
    >
      {/* Outer ring */}
      <circle cx="240" cy="260" r="180" stroke="#1a1a1a" strokeWidth="0.5" strokeDasharray="4 8" opacity="0.3" />
      <circle cx="240" cy="260" r="140" stroke="#1a1a1a" strokeWidth="0.5" opacity="0.15" />

      {/* Central document shape */}
      <rect x="190" y="190" width="100" height="140" rx="6" stroke="#0a0a0a" strokeWidth="1.2" fill="white" />
      <line x1="205" y1="215" x2="275" y2="215" stroke="#0a0a0a" strokeWidth="1" opacity="0.5" />
      <line x1="205" y1="228" x2="275" y2="228" stroke="#0a0a0a" strokeWidth="1" opacity="0.35" />
      <line x1="205" y1="241" x2="260" y2="241" stroke="#0a0a0a" strokeWidth="1" opacity="0.35" />
      <line x1="205" y1="254" x2="265" y2="254" stroke="#0a0a0a" strokeWidth="1" opacity="0.35" />
      <line x1="205" y1="267" x2="250" y2="267" stroke="#0a0a0a" strokeWidth="1" opacity="0.35" />
      <line x1="205" y1="280" x2="268" y2="280" stroke="#0a0a0a" strokeWidth="1" opacity="0.35" />
      <line x1="205" y1="293" x2="255" y2="293" stroke="#0a0a0a" strokeWidth="1" opacity="0.35" />
      <line x1="205" y1="306" x2="262" y2="306" stroke="#0a0a0a" strokeWidth="1" opacity="0.35" />

      {/* Scan line — AI reading */}
      <rect x="190" y="241" width="100" height="14" fill="#0a0a0a" opacity="0.05" rx="1" />

      {/* Analysis nodes — orbiting */}
      {/* Top node */}
      <circle cx="240" cy="95" r="5" fill="#0a0a0a" opacity="0.7" />
      <line x1="240" y1="100" x2="240" y2="185" stroke="#0a0a0a" strokeWidth="0.5" opacity="0.2" />

      {/* Right node */}
      <circle cx="395" cy="260" r="5" fill="#0a0a0a" opacity="0.7" />
      <line x1="390" y1="260" x2="295" y2="260" stroke="#0a0a0a" strokeWidth="0.5" opacity="0.2" />

      {/* Bottom node */}
      <circle cx="240" cy="415" r="5" fill="#0a0a0a" opacity="0.7" />
      <line x1="240" y1="410" x2="240" y2="335" stroke="#0a0a0a" strokeWidth="0.5" opacity="0.2" />

      {/* Left node */}
      <circle cx="85" cy="260" r="5" fill="#0a0a0a" opacity="0.7" />
      <line x1="90" y1="260" x2="185" y2="260" stroke="#0a0a0a" strokeWidth="0.5" opacity="0.2" />

      {/* Diagonal nodes */}
      <circle cx="338" cy="158" r="3.5" fill="#0a0a0a" opacity="0.45" />
      <line x1="335" y1="161" x2="285" y2="197" stroke="#0a0a0a" strokeWidth="0.4" opacity="0.15" />

      <circle cx="338" cy="362" r="3.5" fill="#0a0a0a" opacity="0.45" />
      <line x1="335" y1="359" x2="285" y2="323" stroke="#0a0a0a" strokeWidth="0.4" opacity="0.15" />

      <circle cx="142" cy="158" r="3.5" fill="#0a0a0a" opacity="0.45" />
      <line x1="145" y1="161" x2="195" y2="197" stroke="#0a0a0a" strokeWidth="0.4" opacity="0.15" />

      <circle cx="142" cy="362" r="3.5" fill="#0a0a0a" opacity="0.45" />
      <line x1="145" y1="359" x2="195" y2="323" stroke="#0a0a0a" strokeWidth="0.4" opacity="0.15" />

      {/* Data pulse arcs */}
      <path d="M 240 80 A 180 180 0 0 1 406 210" stroke="#0a0a0a" strokeWidth="0.6" opacity="0.12" fill="none" />
      <path d="M 240 440 A 180 180 0 0 1 74 310" stroke="#0a0a0a" strokeWidth="0.6" opacity="0.12" fill="none" />

      {/* Small metric tags */}
      <rect x="110" y="212" width="48" height="20" rx="4" fill="none" stroke="#0a0a0a" strokeWidth="0.8" opacity="0.4" />
      <text x="134" y="226" textAnchor="middle" fill="#0a0a0a" fontSize="8.5" fontFamily="'DM Mono', monospace" opacity="0.55">FORMAT</text>

      <rect x="110" y="300" width="48" height="20" rx="4" fill="none" stroke="#0a0a0a" strokeWidth="0.8" opacity="0.4" />
      <text x="134" y="314" textAnchor="middle" fill="#0a0a0a" fontSize="8.5" fontFamily="'DM Mono', monospace" opacity="0.55">SKILLS</text>

      <rect x="322" y="300" width="48" height="20" rx="4" fill="none" stroke="#0a0a0a" strokeWidth="0.8" opacity="0.4" />
      <text x="346" y="314" textAnchor="middle" fill="#0a0a0a" fontSize="8.5" fontFamily="'DM Mono', monospace" opacity="0.55">IMPACT</text>
    </svg>
  )
}


export function ResumeScanIllustration() {
  return (
    <svg
      width="120"
      height="160"
      viewBox="0 0 120 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Paper shadow */}
      <rect x="8" y="6" width="108" height="150" rx="6" fill="#f0f0f0" />
      {/* Paper body */}
      <rect x="4" y="2" width="108" height="150" rx="6" fill="white" stroke="#d8d8d8" strokeWidth="1.5" />
      {/* Header block */}
      <rect x="18" y="18" width="50" height="8" rx="2" fill="#d0d0d0" />
      <rect x="18" y="30" width="36" height="5" rx="2" fill="#e5e5e5" />
      {/* Divider */}
      <line x1="18" y1="44" x2="98" y2="44" stroke="#ebebeb" strokeWidth="1" />
      {/* Content lines */}
      <rect x="18" y="54" width="72" height="4" rx="2" fill="#ebebeb" />
      <rect x="18" y="63" width="60" height="4" rx="2" fill="#ebebeb" />
      <rect x="18" y="72" width="66" height="4" rx="2" fill="#ebebeb" />
      {/* Second section */}
      <rect x="18" y="88" width="40" height="5" rx="2" fill="#d8d8d8" />
      <rect x="18" y="99" width="72" height="4" rx="2" fill="#ebebeb" />
      <rect x="18" y="108" width="55" height="4" rx="2" fill="#ebebeb" />
      <rect x="18" y="117" width="68" height="4" rx="2" fill="#ebebeb" />
      {/* Third section */}
      <rect x="18" y="133" width="40" height="4" rx="2" fill="#d8d8d8" />
      <rect x="18" y="142" width="58" height="4" rx="2" fill="#ebebeb" />
    </svg>
  );
}


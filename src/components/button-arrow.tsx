export function ButtonArrow({ direction = 'right', chevron = false }: { direction?: 'left' | 'right'; chevron?: boolean }) {
  return <span className="button-arrow" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={direction === 'left' ? { transform: 'rotate(180deg)' } : undefined}>{chevron ? <path d="m9 6 6 6-6 6" /> : <path d="M4 12h16m-6-6 6 6-6 6" />}</svg></span>;
}

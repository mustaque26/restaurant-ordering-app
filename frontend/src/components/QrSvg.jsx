// Simple SVG for QR code placeholder
function QrSvg({ width = 120, height = 120, className }) {
  return (
    <svg width={width} height={height} className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="16" fill="#fff" stroke="#bbb" strokeWidth="4" />
      <rect x="16" y="16" width="24" height="24" rx="4" fill="#333" />
      <rect x="80" y="16" width="24" height="24" rx="4" fill="#333" />
      <rect x="16" y="80" width="24" height="24" rx="4" fill="#333" />
      <rect x="80" y="80" width="24" height="24" rx="4" fill="#333" />
      <rect x="48" y="48" width="24" height="24" rx="2" fill="#bbb" />
      <rect x="32" y="32" width="8" height="8" fill="#fff" />
      <rect x="88" y="32" width="8" height="8" fill="#fff" />
      <rect x="32" y="88" width="8" height="8" fill="#fff" />
      <rect x="88" y="88" width="8" height="8" fill="#fff" />
    </svg>
  );
}
export default QrSvg;


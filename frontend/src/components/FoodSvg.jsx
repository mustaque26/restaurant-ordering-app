// Simple SVG placeholder for food image
export default function FoodSvg({ width = 80, height = 80 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="38" stroke="#e0e0e0" strokeWidth="4" fill="#fffbe6" />
      <ellipse cx="40" cy="50" rx="24" ry="12" fill="#ffe082" />
      <ellipse cx="40" cy="38" rx="18" ry="10" fill="#ffb300" />
      <circle cx="40" cy="35" r="8" fill="#ff7043" />
      <ellipse cx="40" cy="35" rx="4" ry="2" fill="#fff" opacity=".7" />
    </svg>
  );
}


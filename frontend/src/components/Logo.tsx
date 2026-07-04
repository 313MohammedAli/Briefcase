export default function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M26 16v-3a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v3"
        fill="none"
        stroke="#6f4b2f"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x="10" y="16" width="44" height="44" rx="9" fill="#6f4b2f" />
      <path
        d="M10 36h12M42 36h12"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M32 29l2.1 4.9L39 36l-4.9 2.1L32 43l-2.1-4.9L25 36l4.9-2.1z" fill="#f59e0b" />
    </svg>
  );
}

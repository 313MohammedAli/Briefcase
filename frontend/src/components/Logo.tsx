export default function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M26 16v-3a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v3"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        className="stroke-zinc-900 dark:stroke-zinc-50"
      />
      <rect x="10" y="16" width="44" height="44" rx="9" className="fill-zinc-900 dark:fill-zinc-50" />
      <path
        d="M10 36h12M42 36h12"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="stroke-white dark:stroke-black"
      />
      <path d="M32 29l2.1 4.9L39 36l-4.9 2.1L32 43l-2.1-4.9L25 36l4.9-2.1z" fill="#f59e0b" />
    </svg>
  );
}

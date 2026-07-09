/** Animated briefcase mark used in the landing and app headers.
 *  Presentational: the parent drives `hover` so hovering the whole
 *  wordmark (mark + text) animates the lid and sparks together. */
export default function BriefcaseMark({ size = 30, hover = false }: { size?: number; hover?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      style={{ overflow: "visible", transition: "transform 0.3s ease", transform: hover ? "scale(1.18)" : "scale(1)" }}
    >
      <g transform="rotate(-6 24 28)">
        <path d="M5 26h38v8c0 4.4-3.6 8-8 8H13c-4.4 0-8-3.6-8-8z" fill="#a4764c" stroke="#3d2818" strokeWidth={3.5} />
        <rect x={19} y={26.5} width={10} height={7} rx={2} fill="#f59e0b" stroke="#3d2818" strokeWidth={2.5} />
        <g
          style={{
            transform: hover ? "rotate(-11deg)" : "rotate(0deg)",
            transformOrigin: "5px 26px",
            transformBox: "view-box",
            transition: "transform 0.3s ease",
          }}
        >
          <path d="M17 14v-2.5a7 7 0 0 1 14 0V14" fill="none" stroke="#3d2818" strokeWidth={4.5} strokeLinecap="round" />
          <path d="M5 26v-5c0-4.4 3.6-8 8-8h22c4.4 0 8 3.6 8 8v5z" fill="#a4764c" stroke="#3d2818" strokeWidth={3.5} />
        </g>
      </g>
      <path d="M42 4l1.4 3.6L47 9l-3.6 1.4L42 14l-1.4-3.6L37 9l3.6-1.4z" fill="#f59e0b" />
      <g style={{ opacity: hover ? 1 : 0, transition: "opacity 0.3s ease" }}>
        <path d="M34 0l0.9 2.3 2.3 0.9-2.3 0.9L34 6.4l-0.9-2.3-2.3-0.9 2.3-0.9z" fill="#f59e0b" />
        <path d="M46 18l0.8 2 2 0.8-2 0.8-0.8 2-0.8-2-2-0.8 2-0.8z" fill="#f59e0b" />
        <path d="M3 4l0.9 2.3 2.3 0.9-2.3 0.9L3 10.4l-0.9-2.3L-0.2 7.2l2.3-0.9z" fill="#f59e0b" />
      </g>
    </svg>
  );
}

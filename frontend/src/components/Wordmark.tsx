"use client";

import Link from "next/link";
import { useState } from "react";
import BriefcaseMark from "./BriefcaseMark";

/** Briefcase mark + wordmark. Pass `href` to make it a link (app header);
 *  omit it for a static brand label (landing header). */
export default function Wordmark({ href }: { href?: string }) {
  const [hover, setHover] = useState(false);
  const label = (
    <>
      <BriefcaseMark hover={hover} />
      Briefcase
    </>
  );
  const style: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontWeight: 600,
    fontSize: 19,
    letterSpacing: "-0.02em",
    color: "#3d2818",
  };
  const handlers = { onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false) };

  if (href) {
    return (
      <Link href={href} style={style} {...handlers}>
        {label}
      </Link>
    );
  }
  return (
    <span style={{ ...style, cursor: "default" }} {...handlers}>
      {label}
    </span>
  );
}

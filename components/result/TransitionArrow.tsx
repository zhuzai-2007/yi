export default function TransitionArrow({
  direction = "horizontal",
  size = "md",
}: {
  direction?: "horizontal" | "vertical";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <svg
      className={`transition-arrow arrow-${size}`}
      viewBox={direction === "horizontal" ? "0 0 36 20" : "0 0 20 36"}
      aria-hidden="true"
      focusable="false"
      data-direction={direction}
    >
      <path
        d={
          direction === "horizontal"
            ? "M2 10H33M25 2L33 10L25 18"
            : "M10 2V33M2 25L10 33L18 25"
        }
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

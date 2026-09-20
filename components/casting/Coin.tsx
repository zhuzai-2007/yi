"use client";
import { useId } from "react";
import { Localize } from "../Language";
export function Coin({
  side,
  index,
}: {
  side?: "heads" | "tails";
  index: number;
}) {
  const id = useId().replace(/:/g, ""),
    front = side !== "tails";
  return (
    <Localize>
      <div
        className="coin-object"
        style={{ animationDelay: `${index * 70}ms` }}
      >
        <svg
          viewBox="0 0 120 124"
          role="img"
          aria-label={
            side ? (front ? "正面，计 3" : "背面，计 2") : "铜钱，待掷"
          }
          data-side={side || "pending"}
        >
          <defs>
            <clipPath id={`${id}-face`}><circle cx="60" cy="60" r="48" /></clipPath>
            <radialGradient id={`${id}-metal`} cx="35%" cy="25%" r="80%">
              <stop stopColor="#a99a70" />
              <stop offset=".38" stopColor={front ? "#87764e" : "#6e7259"} />
              <stop offset=".76" stopColor="#655538" />
              <stop offset="1" stopColor="#403d2d" />
            </radialGradient>
            <linearGradient id={`${id}-rim`} x2=".8" y2="1">
              <stop stopColor="#b5a47b" />
              <stop offset=".45" stopColor="#53482f" />
              <stop offset="1" stopColor="#8d7d54" />
            </linearGradient>
            <mask id={`${id}-hole`}>
              <rect width="120" height="124" fill="white" />
              <rect x="47" y="47" width="26" height="26" rx=".6" fill="black" />
            </mask>
            <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency=".65"
                numOctaves="2"
                seed="8"
              />
              <feColorMatrix type="saturate" values="0" />
              <feComponentTransfer>
                <feFuncA type="linear" slope=".16" />
              </feComponentTransfer>
              <feBlend in="SourceGraphic" mode="multiply" />
            </filter>
          </defs>
          <g mask={`url(#${id}-hole)`}>
            <circle cx="60" cy="64" r="55" fill="#3d3829" />
            <circle cx="60" cy="60" r="55" fill={`url(#${id}-rim)`} />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill={`url(#${id}-metal)`}
              stroke="#463e2c"
              strokeWidth="1.5"
            />
            <circle
              cx="60"
              cy="60"
              r="46.5"
              fill="none"
              stroke="#b09e70"
              strokeOpacity=".45"
            />
            <path
              d="M18 47Q22 27 40 18M76 106Q98 99 107 77"
              fill="none"
              stroke="#c1af83"
              strokeWidth="1.3"
              opacity=".5"
            />
            <path
              d="M19 74l9 10 3-6-5-9zM87 25l8 8-2 10-6-6zM77 95l-8 6 15 1z"
              fill="#526954"
              opacity=".32"
            />
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="transparent"
              clipPath={`url(#${id}-face)`}
              filter={`url(#${id}-grain)`}
            />
            <rect
              x="42"
              y="42"
              width="36"
              height="36"
              fill="none"
              stroke="#423c29"
              strokeWidth="3"
            />
            <rect
              x="44"
              y="44"
              width="32"
              height="32"
              fill="none"
              stroke="#b5a375"
              strokeWidth="1.5"
            />
            {front ? (
              <g
                fontFamily="Songti SC, STSong, SimSun, serif"
                fontSize="21"
                textAnchor="middle"
                fill="#342f23"
                stroke="#b3a174"
                strokeWidth=".35"
                paintOrder="stroke"
              >
                <text x="60" y="35">
                  周
                </text>
                <text x="60" y="100">
                  筮
                </text>
                <text x="28" y="68">
                  易
                </text>
                <text x="92" y="68">
                  卜
                </text>
              </g>
            ) : (
              <g fill="none" stroke="#393d2c" strokeWidth="2.5" opacity=".85">
                <path d="M55 25h10m-10 4h10M55 92h10m-10 4h10M25 52v16m5-16v16M91 52v16m5-16v16" />
                <circle
                  cx="60"
                  cy="60"
                  r="40"
                  strokeWidth=".7"
                  strokeDasharray="2 12"
                />
              </g>
            )}
          </g>
          <path d="M47 73V47H73" fill="none" stroke="#302e22" strokeWidth="2" />
          <path
            d="M48 74H74V48"
            fill="none"
            stroke="#ae9b6c"
            strokeWidth="1.2"
          />
        </svg>
        <span className="coin-caption">
          {side ? (front ? "正 · 3" : "背 · 2") : "待掷"}
        </span>
      </div>
    </Localize>
  );
}

import Image from "next/image";

import styles from "./vista.module.css";

/**
 * The vista, as supplied artwork.
 *
 * The painting stays one piece. A second copy always reads as a double
 * figure. Leaves and blooms live in the meadow only.
 */

const BLADES = [
  { x: 18, h: 88 },
  { x: 42, h: 124 },
  { x: 68, h: 96 },
  { x: 96, h: 138 },
  { x: 124, h: 90 },
  { x: 152, h: 118 },
  { x: 182, h: 84 },
  { x: 212, h: 132 },
  { x: 244, h: 100 },
  { x: 274, h: 112 },
  { x: 306, h: 86 },
  { x: 338, h: 128 },
  { x: 868, h: 94 },
  { x: 898, h: 130 },
  { x: 928, h: 88 },
  { x: 958, h: 120 },
  { x: 988, h: 102 },
  { x: 1018, h: 140 },
  { x: 1048, h: 92 },
  { x: 1078, h: 116 },
  { x: 1108, h: 84 },
  { x: 1138, h: 126 },
  { x: 1168, h: 98 },
] as const;

const FLOWERS = [
  { x: 70, y: 196, s: 1, hue: "blue" },
  { x: 128, y: 218, s: 0.82, hue: "pink" },
  { x: 188, y: 188, s: 1.12, hue: "blue" },
  { x: 246, y: 228, s: 0.74, hue: "pink" },
  { x: 300, y: 204, s: 0.94, hue: "blue" },
  { x: 900, y: 210, s: 0.88, hue: "pink" },
  { x: 958, y: 186, s: 1.08, hue: "blue" },
  { x: 1016, y: 224, s: 0.78, hue: "pink" },
  { x: 1074, y: 198, s: 1, hue: "blue" },
  { x: 1132, y: 232, s: 0.86, hue: "pink" },
  { x: 1178, y: 208, s: 0.7, hue: "blue" },
] as const;

const PETALS: [number, number, number][] = [
  [0, -10, 9],
  [8, -6, 8],
  [-8, -5, 8],
  [5, 2, 7],
  [-6, 3, 7],
  [0, -2, 6],
];

export function VistaImage({ src }: { src: string }) {
  return (
    <div className={styles.vista} aria-hidden>
      <div className={styles.photoWrap}>
        <Image
          className={styles.photo}
          src={src}
          alt=""
          fill
          sizes="100vw"
          quality={90}
          preload
          loading="eager"
        />
      </div>

      <svg
        className={styles.meadowLive}
        viewBox="0 0 1200 280"
        preserveAspectRatio="xMidYMax slice"
        focusable="false"
      >
        {BLADES.map((blade, index) => (
          <g key={`b-${blade.x}`} transform={`translate(${blade.x} 280)`}>
            <g
              className={styles.blade}
              style={{
                animationDelay: `${(index % 8) * -0.28}s`,
                animationDuration: `${3.2 + (index % 5) * 0.4}s`,
              }}
            >
              <path
                d={`M0 0 C -12 ${-blade.h * 0.4}, 10 ${-blade.h * 0.66}, 2 ${-blade.h}`}
              />
            </g>
          </g>
        ))}

        {FLOWERS.map((flower, index) => (
          <g
            key={`f-${flower.x}`}
            transform={`translate(${flower.x} ${flower.y}) scale(${flower.s})`}
          >
            <g
              className={styles.bloom}
              data-hue={flower.hue}
              style={{
                animationDelay: `${(index % 6) * -0.45}s`,
                animationDuration: `${4.2 + (index % 4) * 0.5}s`,
              }}
            >
              {PETALS.map(([px, py, r], petal) => (
                <circle key={petal} cx={px} cy={py} r={r} />
              ))}
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}

/*
 * 3d laptop model (mm, 16" class) projected through one pinhole camera fitted to the figma mockup (1200x896 space).
 * lid frame: X right, Y down, Z into the screen; the base hinges on the lid's bottom edge at OPEN_ANGLE.
 */


type V = readonly [number, number, number];
type P2 = readonly [number, number];

const DW = 344; // display active area
const DH = 223;
const BEZEL = { l: 6, r: 6, t: 7.5, b: 18 };
const HINGE_Y = DH + BEZEL.b;
const LEFT = -BEZEL.l;
const RIGHT = DW + BEZEL.r;
const BASE_DEPTH = 248.1;
const BASE_THICK = 16.8;
const OPEN_ANGLE = 102.97; // degrees between lid and base deck

const CAM = { yaw: -22.3676, pitch: -4.794, roll: 2.8287, t: [-2.785, -44.163, 2684.81] as V, f: 5000, cx: 600, cy: 448 };

const rad = (d: number) => (d * Math.PI) / 180;
type M3 = readonly [V, V, V];
const mul = (A: M3, B: M3): M3 => {
  const col = (j: number): V => [B[0][j], B[1][j], B[2][j]];
  const row = (i: number) => [0, 1, 2].map((j) => A[i][0] * col(j)[0] + A[i][1] * col(j)[1] + A[i][2] * col(j)[2]) as unknown as V;
  return [row(0), row(1), row(2)];
};
const rx = (a: number): M3 => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
const ry = (a: number): M3 => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
const rz = (a: number): M3 => [[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]];
const ROT = mul(rz(rad(CAM.roll)), mul(rx(rad(CAM.pitch)), ry(rad(CAM.yaw))));
const CENTER: V = [DW / 2, DH / 2, 0];

const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scl = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: V): V => scl(a, 1 / Math.sqrt(dot(a, a)));
const lerp3 = (a: V, b: V, t: number): V => add(a, scl(sub(b, a), t));
const apply = (R: M3, v: V): V => [dot(R[0], v), dot(R[1], v), dot(R[2], v)];

const toCam = (m: V): V => add(apply(ROT, sub(m, CENTER)), CAM.t);
const project = (m: V): P2 => {
  const c = toCam(m);
  return [CAM.cx + (CAM.f * c[0]) / c[2], CAM.cy + (CAM.f * c[1]) / c[2]];
};
const pts = (list: V[]) => list.map((m) => project(m).map((n) => n.toFixed(1)).join(",")).join(" ");
const facing = (point: V, normal: V) => dot(apply(ROT, normal), toCam(point)) < 0;

const cb = Math.cos(rad(OPEN_ANGLE));
const sb = Math.sin(rad(OPEN_ANGLE));
const FRONT: V = [0, -cb, -sb]; // from the hinge toward the user along the deck
const UP: V = (() => {
  const n = unit(cross([1, 0, 0], FRONT));
  return n[1] < 0 ? n : scl(n, -1);
})();
const top = (x: number, d: number): V => [x, HINGE_Y + d * FRONT[1], d * FRONT[2]];
const bottom = (x: number, d: number): V => add(top(x, d), scl(UP, -BASE_THICK));

type P = readonly [number, number];
function outline2d(a0: number, b0: number, a1: number, b1: number, r: number, corners = [true, true, true, true]): P[] {
  const out: P[] = [];
  const arc = (ca: number, cb: number, from: number, round: boolean, sa: number, sb2: number) => {
    if (!round) {
      out.push([ca + sa * r, cb + sb2 * r]);
      return;
    }
    for (let i = 0; i <= 8; i++) {
      const ang = rad(from + (90 * i) / 8);
      out.push([ca + r * Math.cos(ang), cb + r * Math.sin(ang)]);
    }
  };
  arc(a0 + r, b0 + r, 180, corners[0], -1, -1);
  arc(a1 - r, b0 + r, 270, corners[1], 1, -1);
  arc(a1 - r, b1 - r, 0, corners[2], 1, 1);
  arc(a0 + r, b1 - r, 90, corners[3], -1, 1);
  return out;
}
const roundedRect = (at: (a: number, b: number) => V, a0: number, b0: number, a1: number, b1: number, r: number, corners?: boolean[]) =>
  outline2d(a0, b0, a1, b1, r, corners).map(([x, y]) => at(x, y));
const lid = (a: number, b: number): V => [a, b, 0];

const KB = { x0: 22, x1: 322, d0: 24, d1: 140 };
const keyRows = (): { x0: number; x1: number; d0: number; d1: number }[] => {
  const out: { x0: number; x1: number; d0: number; d1: number }[] = [];
  const pad = 6;
  const left = KB.x0 + pad;
  const width = KB.x1 - KB.x0 - pad * 2;
  const rowH = [9, 17, 17, 17, 17, 17];
  const gap = 2.4;
  let d = KB.d0 + 4;
  rowH.forEach((h, row) => {
    const units = row === 5 ? [1, 1.1, 1.1, 1.3, 5.2, 1.3, 1.1, 3] : Array.from({ length: 15 }, () => 1);
    const total = units.reduce((s, u) => s + u, 0);
    let x = left;
    units.forEach((u) => {
      const w = (width * u) / total;
      out.push({ x0: x + gap / 2, x1: x + w - gap / 2, d0: d, d1: d + h });
      x += w;
    });
    d += h + gap;
  });
  return out;
};

export function LaptopSvg() {
  const lidOuter = roundedRect(lid, LEFT, -BEZEL.t, RIGHT, HINGE_Y, 8);
  const baseCorners = [false, false, true, true];
  const baseTop = roundedRect(top, LEFT, 0, RIGHT, BASE_DEPTH, 10, baseCorners);
  const showLeft = facing(top(LEFT, 120), [-1, 0, 0]);

  const outline = outline2d(LEFT, 0, RIGHT, BASE_DEPTH, 10, baseCorners);
  const wall: { points: string; fill: string }[] = [];
  const rim: V[][] = [];
  outline.forEach((p, i) => {
    const q = outline[(i + 1) % outline.length];
    const dx = q[0] - p[0];
    const dd = q[1] - p[1];
    const len = Math.hypot(dx, dd);
    if (len < 1e-6) return;
    let nx = dd / len;
    let nd = -dx / len;
    const mx = (p[0] + q[0]) / 2 - (LEFT + RIGHT) / 2;
    const md = (p[1] + q[1]) / 2 - BASE_DEPTH / 2;
    if (nx * mx + nd * md < 0) {
      nx = -nx;
      nd = -nd;
    }
    const normal: V = add(scl([1, 0, 0], nx), scl(FRONT, nd));
    if (!facing(top(p[0], p[1]), normal)) return;
    const light = 190 + 22 * nd + 14 * nx;
    const fill = `rgb(${Math.round(light - 4)},${Math.round(light - 2)},${Math.round(light + 8)})`;
    wall.push({ points: pts([top(p[0], p[1]), top(q[0], q[1]), bottom(q[0], q[1]), bottom(p[0], p[1])]), fill });
    rim.push([top(p[0], p[1]), top(q[0], q[1])]);
  });

  const topPts = baseTop.map(project);
  const minX = Math.min(...topPts.map((p) => p[0]));
  const maxX = Math.max(...topPts.map((p) => p[0]));
  const frontBottom = [bottom(LEFT, BASE_DEPTH), bottom(RIGHT, BASE_DEPTH)].map(project);
  const shadowC = project(bottom(172, 150));

  return (
    <svg viewBox="0 0 1200 896" width="1200" height="896" aria-hidden className="absolute inset-0 h-full w-full max-w-none">
      <defs>
        <linearGradient id="lap-top" gradientUnits="userSpaceOnUse" x1={minX} y1="0" x2={maxX} y2="0">
          <stop offset="0" stopColor="#bdbec3" />
          <stop offset="0.45" stopColor="#ced0cf" />
          <stop offset="1" stopColor="#bfc0c2" />
        </linearGradient>
        <linearGradient id="lap-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dadce2" />
          <stop offset="1" stopColor="#b4b8c4" />
        </linearGradient>
        <linearGradient id="lap-side" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#aeb0bd" />
          <stop offset="1" stopColor="#c9cdd3" />
        </linearGradient>
        <linearGradient id="lap-hinge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.3" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <filter id="lap-blur" x="-60%" y="-150%" width="220%" height="400%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      <ellipse cx={shadowC[0] + 20} cy={Math.max(frontBottom[0][1], frontBottom[1][1]) + 18} rx={(maxX - minX) * 0.42} ry="18" fill="#0a1033" opacity="0.3" filter="url(#lap-blur)" />

      {wall.map((w, i) => (
        <polygon key={i} points={w.points} fill={w.fill} stroke={w.fill} strokeWidth="0.6" strokeLinejoin="round" />
      ))}

      <polygon points={pts(baseTop)} fill="url(#lap-top)" strokeLinejoin="round" />
      {rim.map((seg, i) => (
        <polyline key={i} points={pts(seg)} fill="none" stroke="#f1f3f6" strokeWidth="1.3" opacity="0.8" strokeLinecap="round" />
      ))}

      <polygon points={pts(roundedRect(top, KB.x0, KB.d0, KB.x1, KB.d1, 3))} fill="#0e0e10" strokeLinejoin="round" />
      {keyRows().map((k, i) => (
        <polygon key={i} points={pts([top(k.x0, k.d0), top(k.x1, k.d0), top(k.x1, k.d1), top(k.x0, k.d1)])} fill="#1c1c20" stroke="#050506" strokeWidth="0.5" strokeLinejoin="round" />
      ))}

      <polygon points={pts(roundedRect(top, 92, 148, 252, 240, 4))} fill="#d3d4d4" stroke="#b0b3b8" strokeWidth="0.9" strokeLinejoin="round" />

      {showLeft && (
        <g stroke="#4c5362" strokeLinecap="round" strokeWidth="2" opacity="0.6">
          {[[62, 72], [86, 96], [112, 118]].map(([d0, d1]) => (
            <polyline key={d0} points={pts([lerp3(top(LEFT, d0), bottom(LEFT, d0), 0.5), lerp3(top(LEFT, d1), bottom(LEFT, d1), 0.5)])} fill="none" />
          ))}
        </g>
      )}

      <polygon points={pts([top(LEFT, 0), top(RIGHT, 0), top(RIGHT, 14), top(LEFT, 14)])} fill="url(#lap-hinge)" />

      <polygon points={pts(lidOuter)} fill="#0b0d0c" stroke="#9aa0aa" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export const glassQuad: P2[] = [project([0, 0, 0]), project([DW, 0, 0]), project([DW, DH, 0]), project([0, DH, 0])];

import { radarPoint, radarPolygon } from "../../utils/analytics";

const W = 400;
const H = 320;
const CX = W / 2;
const CY = 160;
const RADIUS = 95;
const RINGS = [25, 50, 75, 100];

/** One radar with a polygon per candidate. `labels` are the axis names, `series` are `{id, name, color, values}`. */
export default function CompareRadar({ labels, series }) {
  const summary = series.map((s) => `${s.name}: ${s.values.map((v, i) => `${labels[i]} ${v ?? "none"}`).join(", ")}`).join(". ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-md" role="img" aria-label={`Average of each skill out of 100. ${summary}`}>
      {RINGS.map((ring) => (
        <polygon key={ring} points={radarPolygon(labels.map(() => ring), CX, CY, RADIUS)} fill="none" stroke="white" strokeOpacity={ring === 100 ? 0.18 : 0.08} />
      ))}
      {labels.map((label, index) => {
        const end = radarPoint(index, labels.length, 100, CX, CY, RADIUS);
        const spot = radarPoint(index, labels.length, 100, CX, CY, RADIUS + 14);
        const anchor = Math.abs(spot.x - CX) < 4 ? "middle" : spot.x > CX ? "start" : "end";
        return (
          <g key={label}>
            <line x1={CX} y1={CY} x2={end.x} y2={end.y} stroke="white" strokeOpacity={0.1} />
            <text x={spot.x} y={spot.y + (spot.y > CY + 4 ? 8 : spot.y < CY - 4 ? -2 : 4)} textAnchor={anchor} fontSize="12" fontWeight="600" fill="white" fillOpacity={0.75}>{label}</text>
          </g>
        );
      })}
      {series.map((s) => (
        <polygon key={s.id} points={radarPolygon(s.values, CX, CY, RADIUS)} fill={s.color} fillOpacity={0.12} stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
      ))}
    </svg>
  );
}

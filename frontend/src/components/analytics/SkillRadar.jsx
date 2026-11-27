import { radarPoint, radarPolygon } from "../../utils/analytics";

const W = 400;
const H = 320;
const CX = W / 2;
const CY = 160;
const RADIUS = 95;
const RINGS = [25, 50, 75, 100];

/** Radar of the four scoring areas. `parts` is the `parts` list of the analytics response (recent averages). */
export default function SkillRadar({ parts }) {
  const values = parts.map((p) => p.recent_average);
  const summary = parts.map((p) => `${p.label} ${p.recent_average ?? "not measured"}`).join(", ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-md" role="img" aria-label={`Recent average of each skill out of 100: ${summary}`}>
      {RINGS.map((ring) => (
        <polygon key={ring} points={radarPolygon(parts.map(() => ring), CX, CY, RADIUS)} fill="none" stroke="white" strokeOpacity={ring === 100 ? 0.18 : 0.08} />
      ))}
      {parts.map((part, index) => {
        const end = radarPoint(index, parts.length, 100, CX, CY, RADIUS);
        const label = radarPoint(index, parts.length, 100, CX, CY, RADIUS + 14);
        const anchor = Math.abs(label.x - CX) < 4 ? "middle" : label.x > CX ? "start" : "end";
        return (
          <g key={part.key}>
            <line x1={CX} y1={CY} x2={end.x} y2={end.y} stroke="white" strokeOpacity={0.1} />
            <text x={label.x} y={label.y + (label.y > CY + 4 ? 8 : label.y < CY - 4 ? -2 : 4)} textAnchor={anchor} fontSize="12" fontWeight="600" fill="white" fillOpacity={0.75}>
              {part.label}
            </text>
          </g>
        );
      })}
      <polygon points={radarPolygon(values, CX, CY, RADIUS)} fill="#8b3df0" fillOpacity={0.3} stroke="#a855f7" strokeWidth={2} strokeLinejoin="round" />
      {values.map((value, index) => {
        if (value === null || value === undefined) return null;
        const p = radarPoint(index, values.length, value, CX, CY, RADIUS);
        return <circle key={parts[index].key} cx={p.x} cy={p.y} r={4} fill="#a855f7" stroke="#14141c" strokeWidth={2} />;
      })}
    </svg>
  );
}

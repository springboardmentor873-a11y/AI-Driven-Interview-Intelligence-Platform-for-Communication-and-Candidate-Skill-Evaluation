const LOOKS = {
  contact: { dot: "bg-green-400", text: "Eye contact: good" },
  away: { dot: "bg-amber-400", text: "Looking away: look at the camera" },
  absent: { dot: "bg-red-400", text: "Face not visible: move into the frame" },
};

/** Live eye-contact indicator shown next to the camera picture. */
export default function AttentionBadge({ status, state }) {
  if (status === "off") return null;
  let content;
  if (status === "loading") content = <span className="text-white/50">Loading eye-contact tracking...</span>;
  else if (status === "unavailable") content = <span className="text-white/50">Eye-contact tracking is not available right now. Your interview still works.</span>;
  else {
    const look = LOOKS[state];
    content = look ? (
      <span className="flex items-center gap-2 text-white/80" role="status">
        <span className={`h-2 w-2 rounded-full ${look.dot}`} />
        {look.text}
      </span>
    ) : (
      <span className="text-white/50">Looking for your face...</span>
    );
  }
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2 text-xs">
      {content}
      <p className="mt-1 text-[11px] text-white/30">Runs in your browser. Only summary numbers are saved, never video frames.</p>
    </div>
  );
}

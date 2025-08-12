
export default function ProgressBar({ value = 0 }) {
  return (
    <div className="w-full bg-blue-100 rounded-full h-3 overflow-hidden">
      <div className="h-3 bg-blue-600" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}



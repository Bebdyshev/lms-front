
interface SummaryCardProps {
  icon: string;
  value: number | string;
  label: string;
}

export default function SummaryCard({ icon, value, label }: SummaryCardProps) {
  return (
    <div className="card flex-1 h-32 flex items-center p-6 space-x-4">
      <img src={icon} alt="" className="w-6 h-6" />
      <div>
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-gray-600 text-sm">{label}</div>
      </div>
    </div>
  );
} 
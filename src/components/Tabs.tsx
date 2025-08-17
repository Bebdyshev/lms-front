
interface TabsProps {
  tabs: string[];
  value: number;
  onChange: (index: number) => void;
  className?: string;
}

export default function Tabs({ tabs = [], value, onChange, className = "" }: TabsProps) {
  return (
    <div className={`bg-gray-100 rounded-lg p-1 inline-flex ${className}`}>
      {tabs.map((t, i) => (
        <button
          key={t}
          onClick={() => onChange(i)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            value === i 
              ? 'bg-white shadow-sm text-gray-900 border border-gray-200' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}



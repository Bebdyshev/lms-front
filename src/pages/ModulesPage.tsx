import { useEffect, useState } from 'react';
import Card from '../components/Card';
import { fetchModules } from "../services/api";
import { useNavigate } from 'react-router-dom';
import type { CourseModule } from '../types';

export default function ModulesPage() {
  const [mods, setMods] = useState<CourseModule[]>([]);
  const nav = useNavigate();

  useEffect(() => {
    fetchModules().then(setMods);
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Modules</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mods.map(m => (
          <Card
            key={m.id}
            image={undefined}
            title={m.title}
            description={m.description}
            actionText="Start Lecture"
            onAction={() => nav(`/lectures/${m.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

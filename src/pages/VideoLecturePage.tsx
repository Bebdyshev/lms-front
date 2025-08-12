import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchLectures } from "../services/api";
import type { Lesson } from '../types';

interface VideoLecture extends Lesson {
  videoUrl?: string;
}

export default function VideoLecturePage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [lecs, setLecs] = useState<VideoLecture[]>([]);

  useEffect(() => {
    if (!moduleId) return;
    fetchLectures(moduleId).then((lectures: VideoLecture[]) => setLecs(lectures));
  }, [moduleId]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Video Lecture</h2>
      <div className="space-y-8">
        {lecs.map(l => (
          <div key={l.id}>
            <h3 className="text-2xl font-semibold mb-2">{l.title}</h3>
            <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
              <video controls src={l.videoUrl || l.video_url} className="w-full h-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

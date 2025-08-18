import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';

import { 
  BookOpen, 
  FileText, 
  List, 
  ChevronDown,
  LogOut,
  Image,
  Save,
} from 'lucide-react';

interface CourseSidebarProps {
  courseTitle?: string;
  courseId?: string;
  coverImageUrl?: string;
  isActive?: boolean;
  onSave?: () => void;
  hasUnsavedChanges?: boolean;
  pendingChangesCount?: number;
  onNavigate?: (section: 'overview' | 'description' | 'content') => void;
  activeSection?: 'overview' | 'description' | 'content';
}

export default function CourseSidebar({ 
  courseTitle = "Course Title", 
  courseId, 
  coverImageUrl,
  isActive = false,
  onSave,
  hasUnsavedChanges = false,
  pendingChangesCount = 0,
  onNavigate,
  activeSection = 'content'
}: CourseSidebarProps) {

  const handlePublish = () => {
    // TODO: Implement course publishing logic
    console.log('Publishing course:', courseId);
  };

  const courseNavItems = [
    { section: 'overview' as const, label: 'Overview', icon: BookOpen },
    { section: 'description' as const, label: 'Description', icon: FileText },
    { section: 'content' as const, label: 'Content', icon: List },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Course Header */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-3 mb-4">
          {/* Course Image */}
          <div className="flex-shrink-0">
            {coverImageUrl ? (
              <img 
                src={(import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000') + coverImageUrl} 
                alt={courseTitle}
                className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `<div class="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center"><svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>`;
                  }
                }}
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                <Image className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>
          
          {/* Course Title and Status */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{courseTitle}</h1>
            <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${
                isActive ? 'bg-green-500' : 'bg-gray-400'
              }`}></span>
              <span className={`text-xs font-medium ${
                isActive ? 'text-green-600' : 'text-gray-500'
              }`}>
                {isActive ? 'Active' : 'Draft'}
              </span>
            </div>
          </div>
        </div>
        <Button 
          onClick={handlePublish}
          variant={isActive ? 'secondary' : 'outline'}
          className='w-full'
        >
          {isActive ? 'Published' : 'Publish'}
        </Button>
      </div>

      {/* Course Navigation */}
      <nav className="p-6 flex-1">
        <div className="space-y-1 mb-6">
          {courseNavItems.map((item) => (
            <button
              key={item.section}
              onClick={() => onNavigate?.(item.section)}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full ${
                activeSection === item.section
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Save Button */}
      {onSave && (
        <div className="p-6 pt-0 mt-auto">
          <Button
            onClick={onSave}
            disabled={!hasUnsavedChanges}
            className='w-full'
            variant={hasUnsavedChanges ? 'default' : 'outline'}
          >
            {hasUnsavedChanges ? `Save` : 'No Changes'}
          </Button>
        </div>
      )}
    </div>
  );
}

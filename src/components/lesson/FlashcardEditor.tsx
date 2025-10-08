import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Plus, Trash2, X, Image as ImageIcon } from 'lucide-react';
import type { FlashcardSet, FlashcardItem } from '../../types';

interface FlashcardEditorProps {
  flashcardSet: FlashcardSet;
  setFlashcardSet: (set: FlashcardSet) => void;
}

export default function FlashcardEditor({ flashcardSet, setFlashcardSet }: FlashcardEditorProps) {
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const updateFlashcardSet = (updates: Partial<FlashcardSet>) => {
    setFlashcardSet({ ...flashcardSet, ...updates });
  };

  const addCard = () => {
    const newCard: FlashcardItem = {
      id: Date.now().toString(),
      front_text: '',
      back_text: '',
      difficulty: 'normal',
      order_index: flashcardSet.cards.length,
      tags: []
    };
    updateFlashcardSet({ 
      cards: [...flashcardSet.cards, newCard] 
    });
  };

  const updateCard = (cardId: string, updates: Partial<FlashcardItem>) => {
    const updatedCards = flashcardSet.cards.map(card =>
      card.id === cardId ? { ...card, ...updates } : card
    );
    updateFlashcardSet({ cards: updatedCards });
  };

  const removeCard = (cardId: string) => {
    const updatedCards = flashcardSet.cards.filter(card => card.id !== cardId);
    updateFlashcardSet({ cards: updatedCards });
  };

  const uploadImage = async (file: File, cardId: string, side: 'front' | 'back') => {
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('file_type', 'question_media');

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/media/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const result = await response.json();
      const imageField = side === 'front' ? 'front_image_url' : 'back_image_url';
      updateCard(cardId, { [imageField]: result.file_url });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const addTag = (cardId: string, tag: string) => {
    const card = flashcardSet.cards.find(c => c.id === cardId);
    if (card && tag.trim() && !card.tags?.includes(tag.trim())) {
      const newTags = [...(card.tags || []), tag.trim()];
      updateCard(cardId, { tags: newTags });
    }
  };

  const removeTag = (cardId: string, tagToRemove: string) => {
    const card = flashcardSet.cards.find(c => c.id === cardId);
    if (card && card.tags) {
      const newTags = card.tags.filter(tag => tag !== tagToRemove);
      updateCard(cardId, { tags: newTags });
    }
  };

  return (
    <div className="space-y-6 p-1">
      {/* Flashcard Set Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Flashcard Set Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="set-title">Set Title</Label>
              <Input
                id="set-title"
                value={flashcardSet.title}
                onChange={(e) => updateFlashcardSet({ title: e.target.value })}
                placeholder="Enter flashcard set title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="study-mode">Study Mode</Label>
              <Select
                value={flashcardSet.study_mode}
                onValueChange={(value: 'sequential' | 'random' | 'spaced_repetition') => 
                  updateFlashcardSet({ study_mode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sequential">Sequential</SelectItem>
                  <SelectItem value="random">Random</SelectItem>
                  <SelectItem value="spaced_repetition">Spaced Repetition</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={flashcardSet.description || ''}
              onChange={(e) => updateFlashcardSet({ description: e.target.value })}
              placeholder="Describe what this flashcard set covers"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={flashcardSet.auto_flip}
                onChange={(e) => updateFlashcardSet({ auto_flip: e.target.checked })}
              />
              <span className="text-sm">Auto-flip cards after delay</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={flashcardSet.show_progress}
                onChange={(e) => updateFlashcardSet({ show_progress: e.target.checked })}
              />
              <span className="text-sm">Show progress bar</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Flashcards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Flashcards</h3>
          <Button onClick={addCard} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Card
          </Button>
        </div>

        <div className="space-y-4">
          {flashcardSet.cards.map((card, index) => (
            <Card key={card.id} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-sm font-medium">
                      {index + 1}
                    </span>
                    <h4 className="font-medium">Card {index + 1}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={card.difficulty}
                      onValueChange={(value: 'easy' | 'normal' | 'hard') => 
                        updateCard(card.id, { difficulty: value })
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeCard(card.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Front Side */}
                  <div className="space-y-3">
                    <Label>Front (Question)</Label>
                    <Textarea
                      value={card.front_text}
                      onChange={(e) => updateCard(card.id, { front_text: e.target.value })}
                      placeholder="Enter the question or term"
                      rows={3}
                    />
                    
                    {/* Front Image */}
                    <div className="space-y-2">
                      {card.front_image_url ? (
                        <div className="relative">
                          <img 
                            src={card.front_image_url} 
                            alt="Front" 
                            className="w-full max-h-32 object-contain rounded border"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCard(card.id, { front_image_url: undefined })}
                            className="absolute top-1 right-1"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded p-3 text-center">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadImage(file, card.id, 'front');
                            }}
                            className="hidden"
                            id={`front-image-${card.id}`}
                          />
                          <label htmlFor={`front-image-${card.id}`} className="cursor-pointer">
                            <ImageIcon className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                            <div className="text-xs text-gray-500">
                              {isUploadingImage ? 'Uploading...' : 'Add image'}
                            </div>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Back Side */}
                  <div className="space-y-3">
                    <Label>Back (Answer)</Label>
                    <Textarea
                      value={card.back_text}
                      onChange={(e) => updateCard(card.id, { back_text: e.target.value })}
                      placeholder="Enter the answer or definition"
                      rows={3}
                    />
                    
                    {/* Back Image */}
                    <div className="space-y-2">
                      {card.back_image_url ? (
                        <div className="relative">
                          <img 
                            src={card.back_image_url} 
                            alt="Back" 
                            className="w-full max-h-32 object-contain rounded border"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCard(card.id, { back_image_url: undefined })}
                            className="absolute top-1 right-1"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded p-3 text-center">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadImage(file, card.id, 'back');
                            }}
                            className="hidden"
                            id={`back-image-${card.id}`}
                          />
                          <label htmlFor={`back-image-${card.id}`} className="cursor-pointer">
                            <ImageIcon className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                            <div className="text-xs text-gray-500">
                              {isUploadingImage ? 'Uploading...' : 'Add image'}
                            </div>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {card.tags?.map(tag => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          onClick={() => removeTag(card.id, tag)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const target = e.target as HTMLInputElement;
                          addTag(card.id, target.value);
                          target.value = '';
                        }
                      }}
                      className="flex-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {flashcardSet.cards.length === 0 && (
          <Card>
            <CardContent className="text-center py-8 text-gray-500">
              <p>No flashcards added yet. Click "Add Card" to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

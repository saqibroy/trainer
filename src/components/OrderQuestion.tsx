import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface OrderQuestionProps {
  words: string[];
  onSubmit: (sentence: string) => void;
  disabled: boolean;
  highlightVocabulary: (text: string, onClick: (vocab: any) => void) => React.ReactNode;
  handleWordClick: (vocab: any) => void;
}

interface WordTile {
  id: string;
  word: string;
}

// Sortable word tile
function SortableWordTile({ id, word, highlightVocabulary, handleWordClick }: {
  id: string;
  word: string;
  highlightVocabulary: (text: string, onClick: (vocab: any) => void) => React.ReactNode;
  handleWordClick: (vocab: any) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        px-4 py-3 bg-white border-2 border-indigo-400 rounded-lg 
        cursor-grab active:cursor-grabbing
        hover:bg-indigo-50 hover:border-indigo-500 hover:shadow-md
        shadow-sm
        transition-all
        font-medium text-gray-900
        ${isDragging ? 'shadow-lg z-50 ring-2 ring-indigo-300' : ''}
      `}
    >
      {highlightVocabulary(word, handleWordClick)}
    </div>
  );
}

export default function OrderQuestion({
  words,
  onSubmit,
  disabled,
  highlightVocabulary,
  handleWordClick
}: OrderQuestionProps) {
  // Initialize tiles with IDs
  const [tiles, setTiles] = useState<WordTile[]>(
    words.map((word, idx) => ({
      id: `word-${idx}`,
      word: word
    }))
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    setTiles((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleSubmit = () => {
    // Join words into sentence
    const sentence = tiles.map(tile => tile.word).join(' ');
    onSubmit(sentence);
  };

  const handleReset = () => {
    // Shuffle or reset to original order
    setTiles(words.map((word, idx) => ({
      id: `word-${idx}`,
      word: word
    })));
  };

  const handleShuffle = () => {
    // Shuffle the tiles
    const shuffled = [...tiles].sort(() => Math.random() - 0.5);
    setTiles(shuffled);
  };

  const activeItem = tiles.find(tile => tile.id === activeId);

  return (
    <div>
      <div className="bg-indigo-50 border border-indigo-300 rounded-lg p-4 mb-6">
        <p className="text-sm text-indigo-800">
          <strong>🧩 Drag to Reorder:</strong> Drag the word tiles to build a correct German sentence.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-semibold text-gray-700">
              Arrange the words in the correct order:
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleShuffle}
                disabled={disabled}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔀 Shuffle
              </button>
              <button
                onClick={handleReset}
                disabled={disabled}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ↺ Reset
              </button>
            </div>
          </div>

          {/* Sortable area */}
          <SortableContext items={tiles.map(t => t.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex flex-wrap gap-3 p-6 bg-gray-50 rounded-lg border-2 border-gray-300 min-h-[120px] items-start content-start">
              {tiles.map(tile => (
                <SortableWordTile
                  key={tile.id}
                  id={tile.id}
                  word={tile.word}
                  highlightVocabulary={highlightVocabulary}
                  handleWordClick={handleWordClick}
                />
              ))}
            </div>
          </SortableContext>
        </div>

        <DragOverlay>
          {activeItem ? (
            <div className="px-4 py-3 bg-indigo-100 border-2 border-indigo-500 rounded-lg shadow-2xl font-medium text-gray-900">
              {highlightVocabulary(activeItem.word, handleWordClick)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Preview sentence */}
      <div className="mb-6 p-4 bg-white border-2 border-gray-300 rounded-lg">
        <div className="text-sm font-semibold text-gray-600 mb-2">Preview:</div>
        <div className="text-lg text-gray-900">
          {tiles.map(tile => tile.word).join(' ')}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={disabled}
        className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
          disabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl'
        }`}
      >
        Submit Sentence
      </button>
    </div>
  );
}

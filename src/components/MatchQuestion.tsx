import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface MatchQuestionProps {
  leftItems: string[];
  rightItems: string[];
  onSubmit: (matches: string[]) => void;
  disabled: boolean;
  highlightVocabulary: (text: string, onClick: (vocab: any) => void) => React.ReactNode;
  handleWordClick: (vocab: any) => void;
}

interface MatchPair {
  id: string;
  leftItem: string;
  rightItem: string | null;
}

// Draggable right-side item
function DraggableRightItem({ id, text, highlightVocabulary, handleWordClick }: {
  id: string;
  text: string;
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
        p-4 bg-yellow-100 border-2 border-yellow-400 rounded-lg 
        cursor-grab active:cursor-grabbing
        hover:bg-yellow-200 hover:border-yellow-500
        shadow-sm hover:shadow-md
        transition-all
        ${isDragging ? 'shadow-lg z-50' : ''}
      `}
    >
      <div className="text-gray-900 font-medium">
        {highlightVocabulary(text, handleWordClick)}
      </div>
    </div>
  );
}

// Droppable left-side slot
function DroppableLeftSlot({ 
  id, 
  leftText, 
  rightText, 
  highlightVocabulary, 
  handleWordClick,
  onClear
}: {
  id: string;
  leftText: string;
  rightText: string | null;
  highlightVocabulary: (text: string, onClick: (vocab: any) => void) => React.ReactNode;
  handleWordClick: (vocab: any) => void;
  onClear: () => void;
}) {
  const { setNodeRef, isOver } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`
        p-4 rounded-lg border-2 transition-all
        ${rightText 
          ? 'bg-green-50 border-green-400' 
          : isOver 
            ? 'bg-blue-100 border-blue-400 border-dashed' 
            : 'bg-blue-50 border-blue-300 border-dashed'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-gray-900 font-semibold mb-2">
            {highlightVocabulary(leftText, handleWordClick)}
          </div>
          {rightText ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-white rounded border-2 border-green-500 text-gray-900">
                {highlightVocabulary(rightText, handleWordClick)}
              </div>
              <button
                onClick={onClear}
                className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="px-3 py-2 bg-gray-100 rounded border-2 border-dashed border-gray-300 text-gray-400 text-center">
              Drop here...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MatchQuestion({
  leftItems,
  rightItems,
  onSubmit,
  disabled,
  highlightVocabulary,
  handleWordClick
}: MatchQuestionProps) {
  // Initialize match pairs (left items with empty right slots)
  const [matchPairs, setMatchPairs] = useState<MatchPair[]>(
    leftItems.map((item, idx) => ({
      id: `left-${idx}`,
      leftItem: item,
      rightItem: null
    }))
  );

  // Available items on the right (not yet matched)
  const [availableRightItems, setAvailableRightItems] = useState<Array<{ id: string; text: string }>>(
    rightItems.map((item, idx) => ({
      id: `right-${idx}`,
      text: item
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

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dragging a right item onto a left slot
    if (activeId.startsWith('right-') && overId.startsWith('left-')) {
      const rightItem = availableRightItems.find(item => item.id === activeId);
      if (!rightItem) return;

      // Update the match pair
      setMatchPairs(pairs => 
        pairs.map(pair => 
          pair.id === overId 
            ? { ...pair, rightItem: rightItem.text }
            : pair
        )
      );

      // Remove from available items
      setAvailableRightItems(items => items.filter(item => item.id !== activeId));
    }
  };

  const handleClear = (pairId: string) => {
    const pair = matchPairs.find(p => p.id === pairId);
    if (!pair || !pair.rightItem) return;

    // Add back to available items
    const newId = `right-${availableRightItems.length}`;
    setAvailableRightItems(items => [...items, { id: newId, text: pair.rightItem! }]);

    // Clear the match
    setMatchPairs(pairs => 
      pairs.map(p => 
        p.id === pairId ? { ...p, rightItem: null } : p
      )
    );
  };

  const handleSubmit = () => {
    // Create answer array in format: "item1-match1, item2-match2, ..."
    const matches = matchPairs.map(pair => 
      pair.rightItem ? `${pair.leftItem}-${pair.rightItem}` : ''
    );
    onSubmit(matches);
  };

  const allMatched = matchPairs.every(pair => pair.rightItem !== null);
  const activeItem = availableRightItems.find(item => item.id === activeId);

  return (
    <div>
      <div className="bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-300 rounded-lg p-5 mb-6">
        <p className="text-sm text-green-700 font-semibold mb-2">
          🔗 Drag & Drop Matching - telc B1
        </p>
        <p className="text-sm text-green-800">
          <strong>Instructions:</strong> Drag items from the right column and drop them onto the matching items on the left.
          Click the ✕ button to remove a match if you make a mistake.
        </p>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-400 rounded"></div>
            <span className="text-gray-700">= Draggable</span>
          </div>
          <div className="flex items-center gap-1 ml-3">
            <div className="w-4 h-4 bg-blue-50 border-2 border-dashed border-blue-300 rounded"></div>
            <span className="text-gray-700">= Drop zone</span>
          </div>
          <div className="flex items-center gap-1 ml-3">
            <div className="w-4 h-4 bg-green-50 border-2 border-green-400 rounded"></div>
            <span className="text-gray-700">= Matched</span>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Left column - drop zones */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Match these items:</label>
            <SortableContext items={matchPairs.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {matchPairs.map(pair => (
                  <DroppableLeftSlot
                    key={pair.id}
                    id={pair.id}
                    leftText={pair.leftItem}
                    rightText={pair.rightItem}
                    highlightVocabulary={highlightVocabulary}
                    handleWordClick={handleWordClick}
                    onClear={() => handleClear(pair.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </div>

          {/* Right column - draggable items */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Drag from here ({availableRightItems.length} remaining):
            </label>
            <SortableContext items={availableRightItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {availableRightItems.map(item => (
                  <DraggableRightItem
                    key={item.id}
                    id={item.id}
                    text={item.text}
                    highlightVocabulary={highlightVocabulary}
                    handleWordClick={handleWordClick}
                  />
                ))}
              </div>
            </SortableContext>
          </div>
        </div>

        <DragOverlay>
          {activeItem ? (
            <div className="p-4 bg-yellow-200 border-2 border-yellow-500 rounded-lg shadow-lg">
              <div className="text-gray-900 font-medium">
                {highlightVocabulary(activeItem.text, handleWordClick)}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <button
        onClick={handleSubmit}
        disabled={disabled || !allMatched}
        className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
          disabled || !allMatched
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg'
        }`}
      >
        {allMatched ? 'Submit Matches' : `Match all items (${matchPairs.filter(p => p.rightItem).length}/${matchPairs.length})`}
      </button>
    </div>
  );
}

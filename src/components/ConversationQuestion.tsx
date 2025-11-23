import React, { useState, useRef, useEffect } from 'react';

interface ConversationQuestionProps {
  turns: { speaker: string; text: string }[];
  currentTurnIndex: number;
  previousAnswers: string[];
  correctAnswers: string[];
  onSubmitTurn: (answers: string[]) => void;
  disabled: boolean;
  highlightVocabulary: (text: string, onClick: (vocab: any) => void) => React.ReactNode;
  handleWordClick: (vocab: any) => void;
  scenarioText?: string;
}

export default function ConversationQuestion({
  turns,
  currentTurnIndex,
  previousAnswers,
  correctAnswers,
  onSubmitTurn,
  disabled,
  highlightVocabulary,
  handleWordClick,
  scenarioText
}: ConversationQuestionProps) {
  const currentTurn = turns[currentTurnIndex];
  
  // Parse blanks in current turn
  const parts = currentTurn.text.split(/\{blank\}/);
  const numBlanks = parts.length - 1;
  
  // State for each blank's answer in current turn
  const [answers, setAnswers] = useState<string[]>(Array(numBlanks).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input on mount or turn change
  useEffect(() => {
    if (inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
    // Reset answers when turn changes
    setAnswers(Array(numBlanks).fill(''));
  }, [currentTurnIndex, disabled, numBlanks]);

  const handleInputChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleKeyPress = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Move to next input or submit if last
      if (index < numBlanks - 1) {
        inputRefs.current[index + 1]?.focus();
      } else {
        handleSubmit();
      }
    }
  };

  const handleSubmit = () => {
    // Only submit if all blanks are filled
    if (answers.every(ans => ans.trim())) {
      onSubmitTurn(answers);
    }
  };

  const allFilled = answers.every(ans => ans.trim());

  return (
    <div>
      {/* Scenario Description */}
      {scenarioText && (
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 border-2 border-purple-400 rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎭</span>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-purple-900 mb-2">SCENARIO</h4>
              <p className="text-base text-purple-800 leading-relaxed">
                {scenarioText}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-300 rounded-lg p-4 mb-6">
        <p className="text-sm text-purple-800">
          <strong>🗨️ Interactive Conversation:</strong> Fill in the blanks directly in the conversation. Press Enter to move to the next blank.
          <span className="ml-2 text-purple-600 font-semibold">
            Turn {currentTurnIndex + 1} of {turns.length}
          </span>
        </p>
      </div>

      {/* Previous conversation turns */}
      {currentTurnIndex > 0 && (
        <div className="mb-6 space-y-3">
          <h4 className="text-sm font-semibold text-gray-600 mb-3">Previous messages:</h4>
          {turns.slice(0, currentTurnIndex).map((turn, turnIdx) => {
            // Calculate correct answer indices for this turn
            // We need to know how many blanks came before this turn
            let startIndex = 0;
            for (let i = 0; i < turnIdx; i++) {
              const prevTurnBlanks = turns[i].text.split(/\{blank\}/).length - 1;
              startIndex += prevTurnBlanks;
            }
            
            const turnParts = turn.text.split(/\{blank\}/);
            const numBlanksInTurn = turnParts.length - 1;
            
            // Get user answers for this turn (comma-separated)
            const userAns = previousAnswers[turnIdx] || '';
            const userAnsParts = userAns.includes(',') 
              ? userAns.split(',').map(p => p.trim())
              : [userAns.trim()];
            
            // Get correct answers for this turn from the flat correctAnswers array
            const correctAnsParts: string[] = [];
            for (let i = 0; i < numBlanksInTurn; i++) {
              correctAnsParts.push(correctAnswers[startIndex + i] || '');
            }
            
            // Check if this turn was correct
            const wasCorrect = userAnsParts.length === correctAnsParts.length &&
              userAnsParts.every((userAns, i) => 
                userAns.toLowerCase() === (correctAnsParts[i] || '').toLowerCase()
              );

            return (
              <div 
                key={turnIdx} 
                className={`p-4 rounded-lg border-l-4 ${
                  turnIdx % 2 === 0 
                    ? wasCorrect
                      ? 'bg-green-50 border-green-500 ml-0 mr-8'
                      : 'bg-red-50 border-red-500 ml-0 mr-8'
                    : wasCorrect
                      ? 'bg-green-50 border-green-500 ml-8 mr-0'
                      : 'bg-red-50 border-red-500 ml-8 mr-0'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-sm text-gray-700">
                    {turn.speaker}
                  </div>
                  {wasCorrect ? (
                    <span className="text-xs font-bold text-green-700 bg-green-200 px-2 py-1 rounded">✓ Correct</span>
                  ) : (
                    <span className="text-xs font-bold text-red-700 bg-red-200 px-2 py-1 rounded">✗ Incorrect</span>
                  )}
                </div>
                <div className="text-gray-900 text-lg leading-relaxed">
                  {turnParts.map((part, i) => (
                    <span key={i}>
                      {highlightVocabulary(part, handleWordClick)}
                      {i < turnParts.length - 1 && i < numBlanksInTurn && (
                        <span className={`inline-block mx-1 px-3 py-1 border-2 rounded font-semibold ${
                          (userAnsParts[i] || '').toLowerCase() === (correctAnsParts[i] || '').toLowerCase()
                            ? 'bg-green-100 border-green-500 text-green-800'
                            : 'bg-red-100 border-red-500 text-red-800'
                        }`}>
                          {userAnsParts[i] || '___'}
                          {(userAnsParts[i] || '').toLowerCase() !== (correctAnsParts[i] || '').toLowerCase() && correctAnsParts[i] && (
                            <span className="text-green-700 text-sm ml-2">
                              (→ {correctAnsParts[i]})
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Current turn with INLINE inputs */}
      {!disabled && (
        <div 
          className={`p-5 rounded-lg border-2 mb-6 ${
            currentTurnIndex % 2 === 0 
              ? 'bg-blue-50 border-blue-400 ml-0 mr-8' 
              : 'bg-green-50 border-green-400 ml-8 mr-0'
          }`}
        >
          <div className="font-bold text-lg text-gray-800 mb-3">
            {currentTurn.speaker}
          </div>
          <div className="text-lg text-gray-900 leading-relaxed">
            {parts.map((part, index) => (
              <span key={index}>
                {/* Text part with vocabulary highlighting */}
                <span className="whitespace-pre-wrap">
                  {highlightVocabulary(part, handleWordClick)}
                </span>
                
                {/* Input for blank (if not the last part) */}
                {index < parts.length - 1 && (
                  <span className="inline-flex items-center mx-1">
                    <input
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      value={answers[index]}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      onKeyPress={(e) => handleKeyPress(index, e)}
                      disabled={disabled}
                      className="inline-block px-3 py-1 border-2 border-yellow-400 bg-yellow-100 rounded text-gray-900 font-semibold focus:border-yellow-600 focus:bg-yellow-50 focus:outline-none disabled:bg-gray-200 disabled:border-gray-400"
                      style={{
                        width: `${Math.max(4, answers[index].length + 2)}ch`,
                        minWidth: '4ch'
                      }}
                      placeholder="____"
                    />
                  </span>
                )}
              </span>
            ))}
          </div>

          {/* Progress indicator */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{answers.filter(a => a.trim()).length}</span> of <span className="font-semibold">{numBlanks}</span> blanks filled
            </div>
            <div className="flex gap-1">
              {answers.map((answer, idx) => (
                <div
                  key={idx}
                  className={`w-3 h-3 rounded-full border transition-all ${
                    answer.trim() 
                      ? 'bg-green-500 border-green-600' 
                      : 'bg-gray-200 border-gray-300'
                  }`}
                  title={`Blank ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={disabled || !allFilled}
            className={`w-full mt-4 py-3 rounded-lg font-semibold text-lg transition-all ${
              disabled || !allFilled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl'
            }`}
          >
            {allFilled ? 'Submit Turn' : `Fill all ${numBlanks} blanks to submit`}
          </button>
        </div>
      )}
    </div>
  );
}

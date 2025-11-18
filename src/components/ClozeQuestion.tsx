import { useState, useRef, useEffect } from 'react';

interface ClozeQuestionProps {
  passage: string; // Text with {blank} markers
  onSubmit: (answers: string[]) => void;
  disabled: boolean;
  highlightVocabulary: (text: string, onClick: (vocab: any) => void) => React.ReactNode;
  handleWordClick: (vocab: any) => void;
}

export default function ClozeQuestion({
  passage,
  onSubmit,
  disabled,
  highlightVocabulary,
  handleWordClick
}: ClozeQuestionProps) {
  // Parse passage to find blanks
  const parts = passage.split(/\{blank\d*\}/);
  const numBlanks = parts.length - 1;

  // State for each blank's answer
  const [answers, setAnswers] = useState<string[]>(Array(numBlanks).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [disabled]);

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
      onSubmit(answers);
    }
  };

  const allFilled = answers.every(ans => ans.trim());

  return (
    <div>
      <div className="bg-orange-50 border border-orange-300 rounded-lg p-4 mb-6">
        <p className="text-sm text-orange-800">
          <strong>📄 Cloze Passage:</strong> Fill in the blanks directly in the text below. 
          Press Enter to move to the next blank.
        </p>
      </div>

      {/* Passage with inline inputs */}
      <div className="mb-6 p-6 bg-white rounded-lg border-2 border-gray-300">
        <div className="text-lg leading-relaxed text-gray-900">
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
                    placeholder={`___${index + 1}___`}
                    className={`
                      inline-block px-3 py-1 border-2 rounded
                      text-center font-semibold
                      focus:outline-none focus:ring-2 focus:ring-indigo-400
                      disabled:bg-gray-100 disabled:cursor-not-allowed
                      transition-all
                      ${answers[index].trim() 
                        ? 'bg-yellow-50 border-yellow-400 text-gray-900' 
                        : 'bg-white border-gray-400 text-gray-600'
                      }
                    `}
                    style={{
                      minWidth: '80px',
                      width: `${Math.max(80, answers[index].length * 10 + 40)}px`
                    }}
                  />
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Progress indicator */}
      <div className="mb-4 flex items-center justify-between px-2">
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
        className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
          disabled || !allFilled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl'
        }`}
      >
        {allFilled ? 'Submit Answers' : `Fill all ${numBlanks} blanks to submit`}
      </button>
    </div>
  );
}

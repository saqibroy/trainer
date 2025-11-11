# German Practice Trainer

A smart German grammar practice application built with React, TypeScript, Vite, and Tailwind CSS. Features an intelligent Spaced Repetition System (SRS) to help you master German grammar efficiently.

## Features

- 🎯 **Smart Practice System**: Questions are prioritized based on your performance
- 📊 **Progress Tracking**: Track mastery levels (New, Weak, Learning, Mastered)
- 💾 **Local Storage**: All data persists in your browser
- 🎨 **Beautiful UI**: Modern, responsive design with Tailwind CSS
- ⚡ **Fast**: Built with Vite for optimal performance
- 📝 **Bulk Import**: Add multiple questions at once using simple format
- 🔄 **Session-Based Learning**: Configurable session sizes (5-30 questions)
- 📈 **Detailed Statistics**: Overall accuracy and per-question progress

## How It Works

### Mastery System

Questions progress through four levels based on your performance:

- **New** (Gray): Never attempted
- **Weak** (Red): Low accuracy or consistent mistakes
- **Learning** (Yellow): Improving but needs more practice
- **Mastered** (Green): High accuracy (85%+) with at least 5 correct answers

### Smart Question Selection

The app uses an SRS algorithm to prioritize questions:
- 50% Weak questions (highest priority)
- 30% Learning questions
- 15% New questions (gradual introduction)
- 5% Mastered questions (periodic review)

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

1. Clone or extract the project files

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

### Build for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

To preview the production build:

```bash
npm run preview
```

## Usage

### Creating an Exercise

1. Enter an exercise name in the sidebar (e.g., "Accusative Case")
2. Click "Create"

### Adding Questions

**Single Question:**
- Enter the question (use `___` for the blank)
- Enter the correct answer
- Click "Add Question"

**Bulk Add:**
- Use the format: `Question with ___ | answer`
- One question per line
- Example:
  ```
  Ich sehe ___ Hund. | den
  ___ Frau arbeitet im Büro. | die
  Er trinkt ___ Wasser. | das
  ```

### Practicing

1. Select an exercise from the sidebar
2. Configure session size (5-30 questions)
3. Click "Practice"
4. Type your answers and press Enter or click "Check Answer"
5. Review feedback and continue to the next question
6. View your session results at the end

### Progress Tracking

- View overall statistics in the "Progress Overview" card
- Each question shows its mastery level and accuracy
- Track progress toward mastering each question
- Reset progress for an exercise if needed

## Technologies Used

- **React 18**: Modern UI library
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful icon library
- **LocalStorage**: Client-side data persistence

## Project Structure

```
trainer/
├── index.html           # Entry HTML file
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript config
├── tsconfig.node.json   # TypeScript config for Vite
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind CSS config
├── postcss.config.js    # PostCSS config
├── .gitignore          # Git ignore rules
├── README.md           # This file
└── src/
    ├── main.tsx        # Application entry point
    ├── App.tsx         # Main application component
    └── index.css       # Global styles with Tailwind
```

## Tips for Learning

1. **Start Small**: Begin with 5-10 questions per session
2. **Be Consistent**: Practice daily for best results
3. **Review Regularly**: The app will remind you to review mastered content
4. **Focus on Weak Areas**: The SRS automatically prioritizes challenging questions
5. **Use Bulk Import**: Speed up setup by preparing questions in a text file

## Data Storage

All data is stored in your browser's LocalStorage. To back up your data:
1. Open browser DevTools (F12)
2. Go to Application → Local Storage
3. Find the `german-practice-data` key
4. Copy the value to save your progress

To restore data, paste the saved value back into LocalStorage.

## License

This project is open source and available for personal and educational use.

## Support

For issues or questions, please create an issue in the project repository.

---

Happy learning! 🇩🇪 Viel Erfolg!

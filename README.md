## Onscreen Evaluation Prototype

Simple full‑stack prototype for onscreen evaluation with:
- React frontend (document display, basic annotations, marks entry)
- Node.js/Express backend (file upload, JSON persistence)

### Prerequisites
- Node.js 18+ and npm

### Quick Start
1) Install dependencies
```
cd onscreen-eval/server && npm install
cd ../client && npm install
```

2) Run backend (port 4000)
```
cd onscreen-eval/server
npm start
```

3) Run frontend (port 5173 by default)
```
cd onscreen-eval/client
npm run dev
```

4) Open the app
- Visit http://localhost:5173

### What you can do
- Upload scanned answer sheets (images or PDFs)
- Annotate images with freehand pen and tick/cross stamps
- Enter per‑question marks with validation
- Save progress, complete, or reject a script

### Notes
- PDF annotation is not implemented in this prototype. PDFs display in‑browser; annotations are enabled for images.
- Data is stored in a JSON file under `server/storage/evaluations.json`.





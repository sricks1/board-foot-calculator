# Board Foot Calculator

A web application for woodworkers to manage lumber inventory, plan cuts, and optimize material usage. Calculate board feet, create cut lists, and generate efficient cutting plans with visual diagrams.

**Live App**: https://sricks1.github.io/board-foot-calculator/

---

## Features

- **Project Management**: Create and manage multiple woodworking projects
- **Stock Board Tracking**: Enter lumber with dimensions and standard lumber notation (4/4, 6/4, 8/4, etc.)
- **Board Feet Calculation**: Automatic calculation using the formula `(Thickness × Width × Length) / 144`
- **Cut List**: Define all pieces needed for your project with quantities
- **Cut Plan Optimizer**: Generate optimized cutting layouts using strip-based guillotine cutting
- **Visual Diagrams**: SVG-based cut plan visualization showing piece placement on boards
- **PDF Export**: Generate professional documents with tables and visual cut diagrams
- **Data Persistence**: All data saved to browser localStorage

---

## User Manual

### Getting Started

1. Click **"+ New Project"** to create a project
2. Enter a project name and optional description
3. Navigate between three tabs: **Stock Boards**, **Cut List**, **Cut Plan**

### Stock Boards Tab

Enter the lumber you have available:

| Field | Description |
|-------|-------------|
| Board Name | Descriptive name (e.g., "Walnut Plank") |
| Length | Length in inches |
| Width | Width in inches |
| Thickness | Lumber notation: 4/4 (1"), 5/4 (1.25"), 6/4 (1.5"), 8/4 (2"), etc. |
| Quantity | Number of identical boards |

### Cut List Tab

Define pieces you need to cut:

| Field | Description |
|-------|-------------|
| Piece Name | Descriptive name (e.g., "Table Leg") |
| Length | Final length in inches |
| Width | Final width in inches |
| Thickness | Must match available stock thickness |
| Quantity | How many pieces needed |

### Cut Plan Tab

1. Click **"Generate Cut Plan"** after adding stock boards and cut pieces
2. View efficiency percentage, waste, and boards used
3. Visual diagrams show exactly where each piece goes on each board
4. Click **"Regenerate Plan"** to recalculate

### Exporting to PDF

Click **"Export to PDF"** to generate a document containing:
- Stock boards table with board feet calculations
- Cut list table with dimensions and quantities
- Visual cut diagrams for each board
- Efficiency statistics

---

## Technical Documentation

### Technology Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| Vite | Build tool |
| jsPDF | PDF generation |
| localStorage | Data persistence |
| CSS3 | Styling with custom properties |

### Project Structure

```
src/
├── App.jsx          # Main application component
├── App.css          # Application styles
├── cutOptimizer.js  # Cut optimization algorithm
├── pdfExport.js     # PDF generation
├── main.jsx         # React entry point
└── index.css        # Global styles & CSS variables
```

### Cut Optimization Algorithm

The optimizer uses **strip-based guillotine cutting**, which mirrors real woodworking:

1. **Rip cuts** (lengthwise) divide boards into strips
2. **Crosscuts** divide strips into individual pieces
3. Pieces of the same width are grouped for efficient ripping
4. Accounts for **1/8" saw kerf** between cuts

Algorithm steps:
1. Group stock boards and cut pieces by thickness
2. Sort pieces by area (largest first)
3. For each board, create strips by grouping pieces of similar width
4. Pack pieces into strips, allowing rotation when beneficial
5. Calculate efficiency and track unplaced pieces

### Data Models

**Project**
```javascript
{
  id: number,
  name: string,
  description: string,
  boards: Board[],
  cutPieces: CutPiece[],
  cutPlan: CutPlan | null,
  createdAt: string
}
```

**Board**
```javascript
{
  id: number,
  name: string,
  length: number,        // inches
  width: number,         // inches
  thickness: string,     // "4/4", "6/4", etc.
  thicknessInches: number,
  quantity: number,
  boardFeet: number
}
```

**CutPiece**
```javascript
{
  id: number,
  name: string,
  length: number,
  width: number,
  thickness: string,
  quantity: number
}
```

### Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Slate Blue | #324168 | Headers, secondary buttons |
| Craftsman Orange | #E06829 | Primary buttons, accents |
| Sky Blue | #AFCFE4 | Borders, backgrounds |
| Deep Navy | #0A112A | Summary sidebar |
| Charcoal | #2C2C2C | Body text |
| Workshop Cream | #F5F1E8 | Board backgrounds |

### Typography

- **Font**: Rubik (Google Fonts)
- **Titles**: Medium Italic (500 weight, italic)
- **Body**: Regular (400 weight)
- **Emphasis**: Bold (700 weight)

---

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/sricks1/board-foot-calculator.git
cd board-foot-calculator

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build

```bash
npm run build
```

### Deploy to GitHub Pages

```bash
npm run deploy
```

---

## Formulas

### Board Feet
```
Board Feet = (Thickness × Width × Length) / 144
```

### Lumber Notation

| Notation | Thickness |
|----------|-----------|
| 4/4 | 1.00" |
| 5/4 | 1.25" |
| 6/4 | 1.50" |
| 8/4 | 2.00" |
| 10/4 | 2.50" |
| 12/4 | 3.00" |
| 16/4 | 4.00" |

### Saw Kerf
The optimizer accounts for **1/8" (0.125")** material loss between cuts.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No stock boards with thickness X" | Add stock boards with the required thickness |
| "Could not fit piece on any stock" | Add larger stock boards or reduce piece dimensions |
| Low efficiency | Add smaller pieces to fill gaps, or use larger stock |
| Data disappeared | Browser data was cleared; localStorage cannot be recovered |

---

## License

MIT License - see LICENSE file for details.

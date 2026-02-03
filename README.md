# CutSmart by The Joinery

A web application for woodworkers to calculate lumber requirements, plan cuts, and optimize material usage. Create cut lists, calculate stock needed, and generate efficient cutting plans with visual diagrams and estimated costs.

**Live App**: https://sricks1.github.io/board-foot-calculator/

---

## Features

### Lumber Mode
- **Project Management**: Create and manage multiple woodworking projects
- **Cut List**: Define all pieces needed for your project with dimensions, thickness, species, and quantities
- **Calculate Stock Needed**: Automatically determine how many boards to buy based on your cut list
- **Cut Plan Optimizer**: Generate optimized cutting layouts using 2D bin packing
- **Visual Diagrams**: SVG-based cut plan visualization showing piece placement on boards
- **Estimated Pricing**: Material cost estimates with editable prices per board foot
- **PDF Export**: Generate professional documents with tables and visual cut diagrams
- **Cloud Sync**: User accounts with Supabase - access your projects from any device
- **Species Support**: 60+ wood species with automatic cost estimation

### Sheet Goods Mode
- **Standard Sheet Sizes**: 4×8 (standard), 5×5 (Baltic Birch), 4×4, or custom dimensions
- **Product Types**: Baltic Birch, MDF, plywood (Birch, Maple, Oak, Walnut, Cherry), Melamine
- **Grain Direction Constraints**: Any, With Grain, or Cross Grain placement
- **Per-Sheet Pricing**: Cost calculation by sheet count instead of board feet
- **Visual Cut Plans**: See exactly where each piece is placed on each sheet
- **PDF Export**: Sheet stock, cut list, and cut plan diagrams included in PDF
- **Purchase Orders**: Sheet goods listed alongside lumber in purchase orders
- **Project Summary**: Sidebar shows both lumber and sheet goods stats

---

## User Manual

### Getting Started

1. **Sign up** for an account or **sign in** if you already have one
2. Click **"+ New Project"** to create a project
3. Enter a project name and optional description
4. Choose your workflow:
   - **Calculate Stock Workflow** (recommended): Start with cut pieces, then calculate what lumber to buy
   - **Manual Stock Entry**: Enter your existing lumber inventory manually

### Material Modes

Toggle between **Lumber** and **Sheet Goods** modes at the top of the screen. Each mode has its own tabs and workflow.

### Lumber Mode: Three Tabs

Navigate between **Cut List**, **Stock Boards**, and **Cut Plan** tabs at any time.

---

### Tab 1: Cut List

Define all the pieces you need to cut for your project.

| Field | Description |
|-------|-------------|
| Piece Name | Descriptive name (e.g., "Table Leg", "Apron") |
| Length | Final length in inches |
| Width | Final width in inches |
| Thickness | Lumber notation: 4/4 (1"), 5/4 (1.25"), 6/4 (1.5"), 8/4 (2"), etc. |
| Species | Wood type (Walnut, Cherry, Oak, etc.) |
| Quantity | How many pieces needed |

**Tips:**
- Add all pieces before calculating stock
- Group similar pieces by species and thickness for efficient cutting
- The optimizer accounts for 1/8" saw kerf between cuts

---

### Tab 2: Stock Boards

**Option A: Calculate Stock Needed** (Recommended)

Use the built-in calculator to determine what lumber to purchase:

1. Select **Thickness** (4/4, 5/4, 6/4, 8/4, etc.)
2. Select **Species** (matches species from your cut list)
3. Choose **Size** (standard sizes like 8ft × 6" or custom dimensions)
4. Click **"+ Add Board Type"**
5. Repeat for each thickness/species combination in your cut list
6. Click **"Calculate Stock Needed"**
7. Review the shopping list showing quantity needed for each board type
8. Click **"Use These Boards & Generate Cut Plan"** to apply

**Option B: Manual Entry**

If you already have lumber on hand, enter it manually:

| Field | Description |
|-------|-------------|
| Board Name | Descriptive name (e.g., "Walnut Plank #1") |
| Length | Length in inches |
| Width | Width in inches |
| Thickness | Lumber notation (4/4, 6/4, 8/4, etc.) |
| Species | Wood type |
| Quantity | Number of identical boards |

---

### Tab 3: Cut Plan

Generate and view optimized cutting layouts:

1. Click **"Generate Cut Plan"** (or use Calculate Stock workflow)
2. View statistics:
   - **Efficiency**: Percentage of stock used vs. wasted
   - **Waste**: Board feet of material lost
   - **Boards Used**: How many stock boards needed
   - **Est. Cost**: Estimated material cost
3. **Visual diagrams** show exactly where each piece is placed on each board
4. **Estimated Material Cost** table shows:
   - Quantity and dimensions of each board type
   - Board feet
   - Price per BF (editable - enter your actual prices)
   - Line item and total costs
5. Click **"Regenerate Plan"** to recalculate if needed

---

### Pricing

The app includes default lumber prices (from Capital Hardwood, Madison WI) for common species:

**Domestic**: Walnut, Cherry, Maple, Oak (Red/White), Ash, Poplar, Hickory, and more
**Exotic**: Mahogany, Padauk, Purple Heart, Sapele, Wenge, and more

**To use your own prices:**
1. Generate a cut plan
2. Scroll to "Estimated Material Cost"
3. Click any price field and enter your supplier's price per board foot
4. Total cost updates automatically

*Note: Default prices are estimates only. Update with your most current prices.*

---

### Exporting to PDF

Click **"Export to PDF"** to generate a professional document containing:
- Project name and date
- Stock boards table with dimensions and board feet
- Cut list table with all pieces
- Visual cut diagrams for each board
- Efficiency statistics
- **Sheet goods** (if present): Sheet stock table, sheet cut list, and sheet cut plan diagrams with sq ft totals

### Purchase Orders

Generate a printable shopping list for your lumber yard or supplier:

1. Open a project with stock boards or sheet goods
2. Click the **"Purchase Order"** button
3. Review the formatted purchase order
4. Click **"Print / Save as PDF"** to print or save

The purchase order includes:
- **Lumber**: Grouped by species and thickness with board feet totals
- **Sheet goods** (if present): Grouped by product and thickness with sq ft totals
- Your contact information (configure in Settings)
- Project name and date

---

### Kerf and Rough Lumber

The optimizer accounts for realistic woodworking conditions:

- **Saw kerf**: 1/8" (0.125") material loss between each cut
- **Rough lumber edges**: Additional 1/8" on each edge for jointing/straightening
- A 6" wide piece requires at least 6.25" of rough stock width

---

## Sheet Goods Mode

### Switching Modes

Click the **Sheet Goods** button at the top of the screen to switch from Lumber mode.

### Sheet Goods: Three Tabs

Navigate between **Sheets**, **Cut List**, and **Cut Plan** tabs.

---

### Tab 1: Sheets (Stock)

Define your sheet goods inventory:

| Field | Description |
|-------|-------------|
| Product Type | Baltic Birch, MDF, Plywood species, Melamine, etc. |
| Thickness | Direct inches: 1/4", 1/2", 3/4", 1" |
| Size | Standard 4×8, 5×5 (Baltic Birch), 4×4, or Custom |
| Quantity | Number of sheets available |
| Price/Sheet | Optional - cost per sheet for estimates |

---

### Tab 2: Cut List (Sheet Goods)

Define pieces to cut from sheet goods:

| Field | Description |
|-------|-------------|
| Piece Name | Descriptive name (e.g., "Cabinet Side", "Shelf") |
| Length | Length in inches |
| Width | Width in inches |
| Thickness | Must match available sheet thickness |
| Product Type | Must match available sheet product |
| Quantity | How many pieces needed |
| Grain Direction | How the piece should be oriented |

**Grain Direction Options:**
- **Any Direction**: Optimizer can rotate the piece freely for best fit
- **With Grain**: Piece length aligns with sheet length (8' direction on standard sheets)
- **Cross Grain**: Piece length aligns with sheet width (4' direction on standard sheets)

*Note: Grain runs along the long side of standard sheets.*

---

### Tab 3: Cut Plan (Sheet Goods)

Generate optimized cutting layouts:

1. Click **"Generate Cut Plan"**
2. View statistics:
   - **Efficiency**: Percentage of sheet area used vs. wasted
   - **Waste**: Square feet of material lost
   - **Sheets Used**: How many sheets needed out of available stock
3. Visual diagrams show piece placement on each sheet
4. Pieces with grain constraints show their orientation
5. **Estimated Material Cost** table shows per-sheet pricing

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

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Still need: 4/4 Walnut" warning | Add a board type with that thickness and species |
| Low efficiency percentage | Try different board sizes, or add smaller pieces to use scraps |
| Pieces not fitting | Ensure stock boards are large enough; check species/thickness match |
| Missing price | Enter a custom price in the $/BF field |
| Login issues | Check email confirmation; use "Forgot Password" if needed |
| Sync error | Check internet connection; data syncs automatically when restored |
| Grain direction ignored | Only applies to sheet goods mode; lumber pieces can always rotate |
| Sheet pieces not rotating | Check grain direction setting - "With Grain" prevents rotation |

---

## Technical Documentation

### Technology Stack

| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| Vite 7 | Build tool |
| Supabase | Authentication & Database |
| jsPDF | PDF generation |
| CSS3 | Styling with custom properties |

### Project Structure

```
src/
├── App.jsx           # Main application (~4000 lines)
│                     # All UI components inline:
│                     #   - BoardForm, BoardItem
│                     #   - CutPieceForm, CutPieceItem
│                     #   - SheetGoodsForm, SheetGoodsItem
│                     #   - SheetCutPieceForm, SheetCutPieceItem
│                     #   - CutPlanBoard, CutPlanStrip
│                     #   - ConfirmDialog, WorkflowIndicator
├── App.css           # Application styles
├── Auth.jsx          # Authentication component
├── supabaseClient.js # Supabase configuration
├── cutOptimizer.js   # 2D bin packing algorithm
├── lumberPrices.js   # Lumber price database (60+ species)
├── pdfExport.js      # PDF generation
├── main.jsx          # React entry point
└── index.css         # Global styles & CSS variables
```

### Data Model

#### Lumber Mode

**Stock Board**
```javascript
{
  id: string,
  species: string,          // e.g., "Walnut", "Cherry"
  thickness: string,        // Lumber notation: "4/4", "5/4", "6/4", "8/4"
  length: number,           // inches
  width: number,            // inches
  quantity: number,
  pricePerBF: number|null   // Auto-populated from price database
}
```

**Cut Piece**
```javascript
{
  id: string,
  name: string,             // Description, e.g., "Table Top"
  length: number,           // inches
  width: number,            // inches
  thickness: string,        // Must match available stock thickness
  species: string,          // Must match available stock species
  quantity: number
}
```

#### Sheet Goods Mode

**Sheet Stock**
```javascript
{
  id: string,
  productType: string,      // e.g., "Baltic Birch", "MDF"
  thickness: string,        // Direct inches: "1/4", "1/2", "3/4", "1"
  length: number,           // Default 96 (8 feet)
  width: number,            // Default 48 (4 feet)
  quantity: number,
  pricePerSheet: number|null
}
```

**Sheet Cut Piece**
```javascript
{
  id: string,
  name: string,
  length: number,
  width: number,
  thickness: string,
  productType: string,
  quantity: number,
  grainDirection: 'any'|'length'|'width'
}
```

### Cut Optimization Algorithm

The optimizer uses **2D bin packing** with maximal rectangles, which efficiently places pieces on boards:

1. **Sorting**: Pieces sorted by area (largest first), then by longest dimension
2. **Free Rectangle Tracking**: Maintains list of available rectangular spaces on each board
3. **Best Short Side Fit (BSSF)**: Places pieces where they minimize leftover on the shorter edge
4. **Edge Kerf Handling**: Accounts for jointing rough edges (1/4" kerf on rough lumber edges)
5. **Grain Direction** (sheet goods only):
   - `any`: Optimizer can rotate pieces freely
   - `length`: Piece length must align with board/sheet length (no rotation)
   - `width`: Piece length must align with board/sheet width (force rotation)

#### Key Functions in `cutOptimizer.js`

| Function | Purpose |
|----------|---------|
| `optimizeCuts()` | Main entry point - orchestrates multi-board optimization |
| `createStripsForBoard()` | Packs pieces onto a single board using BSSF heuristic |
| `findBestFit()` | Locates optimal position for a piece, respecting grain constraints |
| `groupByBoardDimensions()` | Groups pieces by compatible stock dimensions |

#### Algorithm Flow

```
optimizeCuts(boards, pieces)
  ├── Group pieces by thickness + species
  ├── For each group:
  │     ├── Binary search for minimum board count
  │     └── createStripsForBoard() for each board
  └── Return placements + statistics
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

### Build & Deploy

```bash
# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

---

## License

MIT License - see LICENSE file for details.

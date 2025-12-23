# CutSmart by The Joinery

A web application for woodworkers to calculate lumber requirements, plan cuts, and optimize material usage. Create cut lists, calculate stock needed, and generate efficient cutting plans with visual diagrams and estimated costs.

**Live App**: https://sricks1.github.io/board-foot-calculator/

---

## Features

- **Project Management**: Create and manage multiple woodworking projects
- **Cut List**: Define all pieces needed for your project with dimensions, thickness, species, and quantities
- **Calculate Stock Needed**: Automatically determine how many boards to buy based on your cut list
- **Cut Plan Optimizer**: Generate optimized cutting layouts using strip-based guillotine cutting
- **Visual Diagrams**: SVG-based cut plan visualization showing piece placement on boards
- **Estimated Pricing**: Material cost estimates with editable prices per board foot
- **PDF Export**: Generate professional documents with tables and visual cut diagrams
- **Cloud Sync**: User accounts with Supabase - access your projects from any device
- **Species Support**: Track wood species for accurate grouping and pricing

---

## User Manual

### Getting Started

1. **Sign up** for an account or **sign in** if you already have one
2. Click **"+ New Project"** to create a project
3. Enter a project name and optional description
4. Choose your workflow:
   - **Calculate Stock Workflow** (recommended): Start with cut pieces, then calculate what lumber to buy
   - **Manual Stock Entry**: Enter your existing lumber inventory manually

### The Three Tabs

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

---

### Kerf and Rough Lumber

The optimizer accounts for realistic woodworking conditions:

- **Saw kerf**: 1/8" (0.125") material loss between each cut
- **Rough lumber edges**: Additional 1/8" on each edge for jointing/straightening
- A 6" wide piece requires at least 6.25" of rough stock width

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

---

## Technical Documentation

### Technology Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| Vite | Build tool |
| Supabase | Authentication & Database |
| jsPDF | PDF generation |
| CSS3 | Styling with custom properties |

### Project Structure

```
src/
├── App.jsx           # Main application component
├── App.css           # Application styles
├── Auth.jsx          # Authentication component
├── supabaseClient.js # Supabase configuration
├── cutOptimizer.js   # Cut optimization algorithm
├── lumberPrices.js   # Lumber price database
├── pdfExport.js      # PDF generation
├── main.jsx          # React entry point
└── index.css         # Global styles & CSS variables
```

### Cut Optimization Algorithm

The optimizer uses **strip-based guillotine cutting**, which mirrors real woodworking:

1. **Group** stock boards and cut pieces by thickness AND species
2. **Rip cuts** (lengthwise) divide boards into strips
3. **Crosscuts** divide strips into individual pieces
4. Pieces of the same width are grouped for efficient ripping
5. Accounts for **1/8" saw kerf** between cuts and at rough edges

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

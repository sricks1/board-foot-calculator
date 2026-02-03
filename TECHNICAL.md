# CutSmart by The Joinery — Technical Documentation

A comprehensive woodworking cut plan optimizer for lumber and sheet goods.

---

## 1. Tech Stack

### Core Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| React | 19.2.0 | UI framework |
| React DOM | 19.2.0 | DOM rendering |
| Supabase JS | 2.89.0 | Backend-as-a-Service (auth, database, RLS) |
| jsPDF | 3.0.4 | Client-side PDF generation |

### Build Tools
| Package | Version | Purpose |
|---------|---------|---------|
| Vite | 7.2.4 | Build tool and dev server |
| @vitejs/plugin-react | 5.1.1 | React plugin for Vite |
| ESLint | 9.39.1 | Code linting |
| gh-pages | 6.3.0 | GitHub Pages deployment |

### Configuration
- **Base URL**: `/` (custom domain: `cutsmart.thejoinery.club`)
- **Module Type**: ES modules
- **Deployment**: GitHub Pages via `npm run deploy`

---

## 2. Database Schema

### Authentication
Uses Supabase Auth with email/password. Email confirmation redirects to production URL.

### Tables

#### `projects`
| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `user_id` | UUID | References auth.users |
| `name` | TEXT | Project name (required) |
| `description` | TEXT | Optional description |
| `workflow` | TEXT | Default 'calculate' |
| `cut_plan` | JSONB | Stored lumber optimization results |
| `sheet_cut_plan` | JSONB | Stored sheet goods optimization results |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Auto-updated via trigger |

#### `boards` (lumber stock)
| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `project_id` | BIGINT | References projects |
| `name` | TEXT | Board name (required) |
| `length` | DECIMAL | Length in inches |
| `width` | DECIMAL | Width in inches |
| `thickness` | TEXT | Lumber notation (e.g., "4/4", "8/4") |
| `thickness_inches` | DECIMAL | Thickness in inches |
| `species` | TEXT | Wood species |
| `quantity` | INTEGER | Default 1 |
| `board_feet_per_piece` | DECIMAL | BF per individual board |
| `board_feet` | DECIMAL | Total BF (qty × per piece) |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

#### `cut_pieces` (lumber cut list)
| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `project_id` | BIGINT | References projects |
| `name` | TEXT | Piece name (required) |
| `length` | DECIMAL | Length in inches |
| `width` | DECIMAL | Width in inches |
| `thickness` | TEXT | Lumber notation |
| `species` | TEXT | Wood species |
| `quantity` | INTEGER | Default 1 |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

#### `sheet_goods` (sheet stock)
| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `project_id` | BIGINT | References projects |
| `name` | TEXT | Sheet name (required) |
| `product_type` | TEXT | Product type (required) |
| `thickness` | TEXT | Sheet thickness |
| `length` | DECIMAL | Length in inches |
| `width` | DECIMAL | Width in inches |
| `quantity` | INTEGER | Default 1 |
| `price_per_sheet` | DECIMAL | Cost per sheet |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

#### `sheet_cut_pieces` (sheet cut list)
| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `project_id` | BIGINT | References projects |
| `name` | TEXT | Piece name (required) |
| `length` | DECIMAL | Length in inches |
| `width` | DECIMAL | Width in inches |
| `thickness` | TEXT | Sheet thickness |
| `product_type` | TEXT | Product type |
| `quantity` | INTEGER | Default 1 |
| `grain_direction` | TEXT | 'any', 'length', or 'width' |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### Row Level Security (RLS)
All tables have RLS enabled. Policies enforce:
- Users can only SELECT/INSERT/UPDATE/DELETE their own data
- Access controlled via `auth.uid()` matching `user_id`
- Board and cut piece access controlled through project ownership

### Indexes
- `idx_projects_user_id` on projects(user_id)
- `idx_boards_project_id` on boards(project_id)
- `idx_cut_pieces_project_id` on cut_pieces(project_id)
- `idx_sheet_goods_project_id` on sheet_goods(project_id)
- `idx_sheet_cut_pieces_project_id` on sheet_cut_pieces(project_id)

---

## 3. Core Algorithm: 2D Bin Packing

**File**: `src/cutOptimizer.js`

### Algorithm Overview
Strip-based guillotine cutting with **Maximal Rectangles** approach using **Best Short Side Fit (BSSF)** heuristic.

### Strategy
1. Group pieces by width (pieces with same width share rip cuts)
2. Create "strips" — full-length rip cuts at specific widths
3. Pack pieces into strips using 2D bin packing
4. Allow multiple pieces side-by-side if they fit
5. Optimize strip placement on stock boards

### Key Functions

#### `optimizeCuts(stockBoards, cutPieces, kerf)`
Main optimization entry point.

**Input**:
- `stockBoards[]` — Available lumber stock
- `cutPieces[]` — Pieces to cut
- `kerf` — Saw blade width (default: 0.125")

**Output**:
```javascript
{
  assignments: [],      // Cut layouts for each board
  waste: number,        // Wasted board feet
  efficiency: number,   // Percentage utilization (0-100)
  warnings: [],         // Fit issues
  unplacedPieces: [],   // Pieces that didn't fit
  boardsUsed: number,   // Boards with cuts
  totalStockBoards: number
}
```

**Process**:
1. Groups stock by thickness AND species
2. Expands quantities into individual board instances
3. For each thickness/species group, fits pieces on boards
4. Uses greedy bin packing with BSSF heuristic
5. Returns comprehensive optimization results

#### `createStripsForBoard(board, pieces, kerf)`
2D bin packing for a single board using Maximal Rectangles algorithm.

**Algorithm**:
- Maintains list of free rectangles on the board
- Sorts pieces by area (largest first) for better packing
- For each piece:
  - Finds best fit using BSSF (minimizes leftover on shorter edge)
  - Considers rotation based on grain direction constraints
  - Places piece and clips all overlapping free rectangles
  - Removes contained rectangles and merges adjacent ones
- Accounts for edge kerf (jointing rough edges)

**Grain Direction Support**:
- `'any'` — Try both orientations, pick best fit
- `'length'` — Piece length must align with board length
- `'width'` — Piece length must align with board width

#### `calculateStockNeeded(cutPieces, stockTemplates, kerf)`
Calculates minimum boards needed to fit all pieces.

**Features**:
- Supports multiple board templates
- Groups by thickness AND species
- Uses binary search for single template optimization
- Tests distributions for multiple templates
- Returns consolidated board list with quantities
- Generates full cut plan

### Data Structures

**Board Object**:
```javascript
{
  id: number,
  name: string,
  length: number,           // inches
  width: number,            // inches
  thickness: string,        // "4/4", "8/4", etc.
  thicknessInches: number,
  species: string,
  quantity: number,
  boardFeet: number,
  boardFeetPerPiece: number
}
```

**Cut Piece Object**:
```javascript
{
  id: number,
  name: string,
  length: number,           // inches
  width: number,            // inches
  thickness: string,
  species: string,
  quantity: number,
  grainDirection: string    // 'any', 'length', 'width'
}
```

**Assignment Object** (optimization result):
```javascript
{
  stockBoardId: number,
  stockBoardName: string,
  stockBoardIndex: number,
  uniqueId: string,
  thickness: string,
  species: string,
  length: number,
  width: number,
  cuts: [{
    cutPieceId: number,
    cutPieceName: string,
    x: number,              // position on board
    y: number,
    length: number,
    width: number,
    rotated: boolean
  }],
  strips: [{
    y: number,
    width: number,
    length: number,
    pieces: []
  }],
  boardArea: number,
  cutsArea: number
}
```

### Important Constants
```javascript
const DEFAULT_KERF = 0.125     // 1/8" saw blade width
const MIN_USEFUL_RECT = 1      // 1 inch minimum
const FLOAT_TOLERANCE = 0.001  // Floating point comparison
```

---

## 4. Pricing Logic

**File**: `src/lumberPrices.js`

### Data Source
Capital Hardwood and Supply, Madison WI price list.

### Price Database Structure

#### `lumberPrices` Object
Organized by species name with nested thickness pricing:
```javascript
{
  'Walnut': {
    '4/4': 10.95,
    '6/4': 13.45,
    '8/4': 15.95,
    category: 'Domestic',
    grade: 'Select & Better'
  },
  // ... 60+ species
}
```

**Coverage**:
- 44 domestic species (Walnut, Cherry, Oak, Maple, etc.)
- 17 exotic species (Purple Heart, Wenge, Mahogany, etc.)
- Thickness options: 4/4, 5/4, 6/4, 8/4, 10/4, 12/4, 16/4
- Prices in $/BF (dollars per board foot)

#### `sheetGoodsPrices` Object
Sheet goods by product type and thickness:
```javascript
{
  'Baltic Birch 5x5': {
    '1/2': 39.95,
    '3/4': 69.95,
    grade: 'B/BB'
  },
  // ... various products
}
```

**Products**: Baltic Birch, MDF, plywood veneers (Birch, Maple, Oak, Walnut, Cherry), Melamine

### Key Functions

#### `getPricePerBF(species, thickness)`
Retrieves price per board foot with intelligent fallback:
1. Direct exact match
2. Partial species name match (case-insensitive)
3. Closest thickness match if exact not available
4. Returns `null` if no match found

#### `calculateBoardCost(boardFeet, species, thickness)`
Returns:
```javascript
{
  cost: number,
  pricePerBF: number,
  found: boolean
}
```

#### `calculateTotalCost(boards)`
Itemized cost calculation for multiple boards:
```javascript
{
  totalCost: number,
  itemizedCosts: [{ ...board, cost, pricePerBF }],
  missingPrices: [{ species, thickness }]
}
```

#### `getAvailableSpecies()`
Returns sorted array of species for UI dropdowns:
```javascript
[{
  name: 'Walnut',
  category: 'Domestic',
  grade: 'Select & Better',
  thicknesses: ['4/4', '6/4', '8/4']
}]
```
Sorted by category (Domestic first), then alphabetically.

---

## 5. PDF Export

**File**: `src/pdfExport.js`

### Library
Uses **jsPDF 3.0.4** for client-side PDF generation.

### Main Function
```javascript
exportProjectToPDF(project)
```

### Content Sections

#### 1. Header
- Deep navy bar with project name (24pt bold)
- Project description (if present)
- Brand logo styling

#### 2. Stock Boards Table
| Column | Description |
|--------|-------------|
| Name | Board identifier |
| Dimensions | L × W |
| Thickness | Lumber notation |
| Qty | Quantity |
| BF Each | Board feet per piece |
| Total BF | Total board feet |

Includes totals row with orange background.

#### 3. Cut List Table
| Column | Description |
|--------|-------------|
| Piece Name | Cut piece identifier |
| Dimensions | L × W |
| Thickness | Lumber notation |
| Quantity | Number of pieces |
| Board Feet | Total BF for this entry |

#### 4. Cut Plan Section

**Stats Bar**:
- Efficiency % (optimization score)
- Waste (in board feet)
- Boards Used / Total Available

**Warnings**: Yellow boxes for fit issues

**Board Diagrams**: For each board assignment:
- Board label with instance number
- Dimensions and species (with color dot)
- Scaled 2D layout diagram (max 4px/inch scale)
- Cut pieces drawn with species colors
- Piece labels when space permits
- Rotated pieces indicated

#### 5. Sheet Goods Section (if applicable)
- Sheet Stock table
- Sheet Cut List table
- Sheet Cut Plan with diagrams
- Same structure as lumber sections

#### 6. Footer
- Generation timestamp
- "CutSmart by The Joinery" branding

### Color System

**Brand Colors**:
```javascript
{
  slateBlue: [50, 65, 104],
  craftsmanOrange: [224, 104, 41],
  skyBlue: [175, 207, 228],
  deepNavy: [10, 17, 42],
  charcoal: [44, 44, 44],
  workshopCream: [245, 241, 232],
  white: [255, 255, 255]
}
```

**Species Colors**: Maps 40+ species to RGB values matching UI colors.

**Text Contrast**: Automatic luminance calculation — white text on dark backgrounds, black on light.

### Layout Features
- Automatic page breaks with overflow handling
- Responsive diagram scaling
- Truncated labels for small pieces
- Portrait orientation, letter size (8.5" × 11")
- 40pt margins

### File Naming
`{ProjectName}_cut_plan.pdf` (sanitized, underscores for spaces)

---

## 6. Authentication

### Files
- `src/supabaseClient.js` — Supabase client configuration
- `src/Auth.jsx` — Login/signup UI component

### Supabase Configuration
```javascript
const supabaseUrl = 'https://qhttbhpsqnncbpyourar.supabase.co'
const supabaseAnonKey = '...'  // Public anon key (RLS-protected)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Auth Component Features
- Email/password authentication form
- Toggle between sign-up and sign-in modes
- Logo and branding
- Error and success message display
- Loading states

### Authentication Flow

**Sign Up**:
```javascript
supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: 'https://cutsmart.thejoinery.club/'
  }
})
```
- Sends confirmation email
- Displays success message
- Redirects to app on confirmation

**Sign In**:
```javascript
supabase.auth.signInWithPassword({ email, password })
```
- Validates credentials
- Establishes session
- Automatic UI update via session listener

### Validation
- Email format required
- Password minimum 6 characters
- HTML5 form validation

### Integration with App.jsx
```javascript
// Monitor auth state
supabase.auth.onAuthStateChange((event, session) => {
  setSession(session)
})

// Conditional rendering
{session ? <MainApp /> : <Auth />}
```

---

## 7. Module Integration Map

### File Structure
```
src/
├── App.jsx           # Main container (~5000 lines)
├── App.css           # All styles
├── Auth.jsx          # Login/signup UI
├── supabaseClient.js # Supabase client singleton
├── cutOptimizer.js   # 2D bin packing algorithm
├── lumberPrices.js   # Pricing database
└── pdfExport.js      # PDF generation
```

### Module Dependencies
```
App.jsx (Main Container)
├── supabaseClient.js → Authentication & Database
├── Auth.jsx → Login/Signup UI
├── cutOptimizer.js → 2D Bin Packing
│   ├── optimizeCuts()
│   ├── calculateStockNeeded()
│   └── calculateCutPiecesBF()
├── lumberPrices.js → Pricing Database
│   ├── getPricePerBF()
│   ├── calculateTotalCost()
│   └── getAvailableSpecies()
└── pdfExport.js → PDF Generation
    └── exportProjectToPDF()
```

### Data Flow

1. **User Authentication**
   ```
   Auth.jsx → supabaseClient → Supabase Auth → Session
   ```

2. **Project Loading**
   ```
   App.jsx → supabaseClient → Supabase DB
   → projects, boards, cut_pieces, sheet_goods, sheet_cut_pieces
   ```

3. **Optimization**
   ```
   User adds boards/pieces → cutOptimizer.js → Optimization results
   → Stored in cut_plan/sheet_cut_plan JSONB
   ```

4. **Cost Calculation**
   ```
   Species selected → lumberPrices.js → Cost display in UI
   ```

5. **PDF Export**
   ```
   Export button → pdfExport.js → Browser download
   ```

6. **Data Persistence**
   ```
   State change → supabaseClient → Supabase DB
   ```

### Shared Constants

**Species Colors**: Defined in both `App.jsx` and `pdfExport.js` for UI/PDF consistency.

**Thickness Options**: Used across App.jsx (dropdowns), cutOptimizer.js (parsing), lumberPrices.js (lookups).

**Kerf Default** (0.125"): Defined in cutOptimizer.js, used throughout optimization.

---

## 8. Key Features Summary

| Feature | Implementation |
|---------|---------------|
| Project Management | Supabase CRUD with RLS |
| Cut List | Add/edit/delete/reorder pieces |
| CSV Import | Client-side parsing, batch Supabase insert |
| Stock Calculation | Binary search optimization |
| Cut Plan Optimization | 2D bin packing with BSSF heuristic |
| Visual Diagrams | SVG in UI, drawn in PDF |
| Pricing | 60+ species database with fallback matching |
| PDF Export | jsPDF with tables and diagrams |
| Authentication | Supabase Auth with email confirmation |
| Cloud Sync | Real-time Supabase with optimistic UI |
| Dual Material Support | Lumber and sheet goods modes |
| Grain Direction | Optimization constraint for sheet goods |

---

## 9. Deployment

### Scripts (package.json)
```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "deploy": "vite build && gh-pages -d dist"
}
```

### Production URL
`https://cutsmart.thejoinery.club/` (GitHub Pages with custom domain)

### Environment
- No `.env` file — Supabase anon key is public (RLS-protected)
- All sensitive operations protected by Row Level Security

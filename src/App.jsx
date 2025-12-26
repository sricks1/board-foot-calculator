import { useState, useEffect, useRef } from 'react'
import './App.css'
import { optimizeCuts, calculateCutPiecesBF, getStockThicknesses, getCutPieceThicknesses, calculateStockNeeded } from './cutOptimizer'
import { exportProjectToPDF } from './pdfExport'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import { getAvailableSpecies, calculateTotalCost, getPricePerBF } from './lumberPrices'

// Dropdown Menu Component
function Dropdown({ label, icon, items, className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className={`dropdown ${className}`} ref={dropdownRef}>
      <button
        className={`dropdown-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {icon && <span className="dropdown-icon">{icon}</span>}
        {label && <span>{label}</span>}
        <span className="dropdown-arrow">▼</span>
      </button>
      <div className={`dropdown-menu ${isOpen ? 'open' : ''}`}>
        {items.map((item, index) => (
          item.divider ? (
            <div key={index} className="dropdown-divider" />
          ) : (
            <button
              key={index}
              className="dropdown-menu-item"
              onClick={() => {
                item.onClick()
                setIsOpen(false)
              }}
            >
              {item.icon && <span className="dropdown-menu-item-icon">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          )
        ))}
      </div>
    </div>
  )
}

// Confirmation Dialog Component
function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Delete', confirmStyle = 'danger' }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-dialog-actions">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={onConfirm} className={confirmStyle === 'danger' ? 'btn-delete' : 'btn-primary'}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// Species color mapping for visual grouping
const SPECIES_COLORS = {
  // Domestic - Common (warm browns and tans)
  'Walnut': '#5D4037',
  'Walnut - Natural': '#6D4C41',
  'Walnut - Prime': '#4E342E',
  'Cherry': '#C62828',
  'Cherry - Select': '#D32F2F',
  'Maple - Hard': '#FFCC80',
  'Maple - Soft': '#FFE0B2',
  'Maple - Ambrosia': '#FFAB91',
  'Maple - Birds Eye': '#FFF3E0',
  'Maple - Curly': '#FFE082',
  'Oak - Red': '#BF360C',
  'Oak - Red QS': '#E64A19',
  'Oak - Red Rift': '#FF5722',
  'Oak - White': '#D7CCC8',
  'Oak - White QS': '#EFEBE9',
  'Oak - White Rift': '#FBE9E7',
  'Ash - White': '#F5F5F5',
  'Poplar': '#C5E1A5',
  'Hickory - Calico': '#BCAAA4',
  'Hickory - Heart': '#A1887F',
  // Domestic - Other
  'Alder - Knotty': '#FFAB91',
  'Basswood': '#FFF8E1',
  'Beech': '#FFE4C4',
  'Birch - Yellow': '#FFF59D',
  'Butternut': '#D4A574',
  'Catalpa': '#E6DDD1',
  'Cedar - Aromatic': '#D4A190',
  'Cedar - Western Red': '#CD7F32',
  'Douglas Fir': '#DEB887',
  'Sycamore - QS': '#F0EAD6',
  // Exotic (vibrant colors)
  'Beli': '#8D6E63',
  'Black Limba': '#3E2723',
  'Bloodwood': '#8B0000',
  'Canarywood': '#FFD54F',
  'Ebiara': '#795548',
  'Iroko': '#A67C52',
  'Jatoba': '#8B4513',
  'Leopardwood': '#CD853F',
  'Mahogany - African': '#C04000',
  'Olivewood': '#808000',
  'Osage Orange': '#FF8C00',
  'Padauk': '#FF4500',
  'Peruvian Walnut': '#654321',
  'Purple Heart': '#9932CC',
  'Sapele - QS': '#A0522D',
  'Spanish Cedar': '#D2691E',
  'Wenge': '#1C1C1C',
  // Default
  'Other': '#9E9E9E'
}

// Get color for a species (with fallback)
function getSpeciesColor(species) {
  return SPECIES_COLORS[species] || SPECIES_COLORS['Other']
}

// Get contrasting text color (white or black) based on background
function getContrastColor(hexColor) {
  const r = parseInt(hexColor.slice(1, 3), 16)
  const g = parseInt(hexColor.slice(3, 5), 16)
  const b = parseInt(hexColor.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}

// Common stock board templates (base dimensions, thickness selected separately)
const STOCK_TEMPLATES = [
  { id: 1, name: '8ft × 5"', length: 96, width: 5 },
  { id: 2, name: '8ft × 6"', length: 96, width: 6 },
  { id: 3, name: '8ft × 7"', length: 96, width: 7 },
  { id: 4, name: '8ft × 8"', length: 96, width: 8 },
  { id: 5, name: '10ft × 6"', length: 120, width: 6 },
  { id: 6, name: '6ft × 6"', length: 72, width: 6 },
]

const THICKNESS_OPTIONS = ['4/4', '5/4', '6/4', '8/4', '10/4', '12/4', '16/4']

// Species options - includes all priced species from Capital Hardwood
const SPECIES_OPTIONS = [
  // Domestic - Common
  'Walnut',
  'Walnut - Natural',
  'Walnut - Prime',
  'Cherry',
  'Cherry - Select',
  'Maple - Hard',
  'Maple - Soft',
  'Maple - Ambrosia',
  'Maple - Birds Eye',
  'Maple - Curly',
  'Oak - Red',
  'Oak - Red QS',
  'Oak - Red Rift',
  'Oak - White',
  'Oak - White QS',
  'Oak - White Rift',
  'Ash - White',
  'Poplar',
  'Hickory - Calico',
  'Hickory - Heart',
  // Domestic - Other
  'Alder - Knotty',
  'Basswood',
  'Beech',
  'Birch - Yellow',
  'Butternut',
  'Catalpa',
  'Cedar - Aromatic',
  'Cedar - Western Red',
  'Douglas Fir',
  'Sycamore - QS',
  // Exotic
  'Beli',
  'Black Limba',
  'Bloodwood',
  'Canarywood',
  'Ebiara',
  'Iroko',
  'Jatoba',
  'Leopardwood',
  'Mahogany - African',
  'Olivewood',
  'Osage Orange',
  'Padauk',
  'Peruvian Walnut',
  'Purple Heart',
  'Sapele - QS',
  'Spanish Cedar',
  'Wenge',
  // Other
  'Other'
]

// Parse lumber notation like "4/4", "6/4", "8/4" and return thickness in inches
function parseThickness(notation) {
  const match = notation.match(/^(\d+)\/(\d+)$/)
  if (match) {
    return parseInt(match[1]) / parseInt(match[2])
  }
  const num = parseFloat(notation)
  return isNaN(num) ? null : num
}

// Calculate board feet: (Thickness × Width × Length) / 144
function calculateBoardFeet(thickness, width, length) {
  return (thickness * width * length) / 144
}

// Board Form Component
function BoardForm({ onSubmit, initialData, onCancel }) {
  const [name, setName] = useState(initialData?.name || '')
  const [length, setLength] = useState(initialData?.length || '')
  const [width, setWidth] = useState(initialData?.width || '')
  const [thickness, setThickness] = useState(initialData?.thickness || '4/4')
  const [species, setSpecies] = useState(initialData?.species || 'Walnut')
  const [quantity, setQuantity] = useState(initialData?.quantity || 1)
  const [error, setError] = useState('')

  const thicknessOptions = ['4/4', '5/4', '6/4', '8/4', '10/4', '12/4', '16/4']

  // Update form fields when initialData changes (for editing different boards)
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setLength(initialData.length || '')
      setWidth(initialData.width || '')
      setThickness(initialData.thickness || '4/4')
      setSpecies(initialData.species || 'Walnut')
      setQuantity(initialData.quantity || 1)
    } else {
      setName('')
      setLength('')
      setWidth('')
      setThickness('4/4')
      setSpecies('Walnut')
      setQuantity(1)
    }
    setError('')
  }, [initialData])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    const parsedThickness = parseThickness(thickness)
    if (parsedThickness === null) {
      setError('Invalid thickness notation')
      return
    }

    const lengthNum = parseFloat(length)
    const widthNum = parseFloat(width)
    const quantityNum = parseInt(quantity)

    if (isNaN(lengthNum) || lengthNum <= 0) {
      setError('Please enter a valid length')
      return
    }

    if (isNaN(widthNum) || widthNum <= 0) {
      setError('Please enter a valid width')
      return
    }

    if (isNaN(quantityNum) || quantityNum < 1) {
      setError('Please enter a valid quantity (at least 1)')
      return
    }

    const boardFeetPerPiece = calculateBoardFeet(parsedThickness, widthNum, lengthNum)
    const totalBoardFeet = boardFeetPerPiece * quantityNum

    onSubmit({
      id: initialData?.id || Date.now(),
      name: name || `Board ${Date.now()}`,
      length: lengthNum,
      width: widthNum,
      thickness,
      thicknessInches: parsedThickness,
      species,
      quantity: quantityNum,
      boardFeetPerPiece,
      boardFeet: totalBoardFeet
    })

    if (!initialData) {
      setName('')
      setLength('')
      setWidth('')
      setThickness('4/4')
      setSpecies('Walnut')
      setQuantity(1)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="board-form">
      <h3>{initialData ? 'Edit Stock Board' : 'Add Stock Board'}</h3>

      {error && <div className="error">{error}</div>}

      <div className="form-group">
        <label htmlFor="boardName">Board Name</label>
        <input
          id="boardName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Walnut Plank, Oak Board"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="length">Length (inches)</label>
          <input
            id="length"
            type="number"
            step="0.125"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            placeholder="e.g., 96"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="width">Width (inches)</label>
          <input
            id="width"
            type="number"
            step="0.125"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            placeholder="e.g., 8"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="thickness">Thickness</label>
          <select
            id="thickness"
            value={thickness}
            onChange={(e) => setThickness(e.target.value)}
          >
            {thicknessOptions.map(opt => (
              <option key={opt} value={opt}>{opt} ({parseThickness(opt)}")</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="quantity">Quantity</label>
          <input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="species">Species</label>
          <select
            id="species"
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
          >
            {SPECIES_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {initialData ? 'Update Board' : 'Add Board'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

// Board List Item Component
function BoardItem({ board, onEdit, onDelete, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, isDragOver }) {
  const qty = board.quantity || 1
  const perPiece = board.boardFeetPerPiece || board.boardFeet

  return (
    <div
      className={`board-item ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, board.id)}
      onDragOver={(e) => onDragOver(e, board.id)}
      onDrop={(e) => onDrop(e, board.id)}
      onDragEnd={onDragEnd}
    >
      <div className="drag-handle">⋮⋮</div>
      <div className="board-info">
        <h4>{board.name}</h4>
        <p className="board-dimensions">
          {board.length}" × {board.width}" × {board.thickness}
          {qty > 1 && <span className="board-quantity"> × {qty} pcs</span>}
        </p>
        {board.species && <p className="board-species">{board.species}</p>}
        <p className="board-feet">
          <strong>{board.boardFeet.toFixed(2)}</strong> board feet
          {qty > 1 && <span className="per-piece"> ({perPiece.toFixed(2)} each)</span>}
        </p>
      </div>
      <div className="board-actions">
        <button onClick={() => onEdit(board)} className="btn-edit">Edit</button>
        <button onClick={() => onDelete(board.id)} className="btn-delete">Delete</button>
      </div>
    </div>
  )
}

// Cut Piece Form Component
function CutPieceForm({ onSubmit, initialData, onCancel, availableThicknesses, availableSpecies }) {
  const [name, setName] = useState(initialData?.name || '')
  const [length, setLength] = useState(initialData?.length || '')
  const [width, setWidth] = useState(initialData?.width || '')
  const [thickness, setThickness] = useState(initialData?.thickness || availableThicknesses[0] || '4/4')
  const [species, setSpecies] = useState(initialData?.species || availableSpecies[0] || 'Walnut')
  const [quantity, setQuantity] = useState(initialData?.quantity || 1)
  const [error, setError] = useState('')

  const thicknessOptions = availableThicknesses.length > 0
    ? availableThicknesses
    : ['4/4', '5/4', '6/4', '8/4', '10/4', '12/4', '16/4']

  const speciesOptions = availableSpecies.length > 0
    ? availableSpecies
    : SPECIES_OPTIONS

  // Update form fields when initialData changes (for editing different pieces)
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setLength(initialData.length || '')
      setWidth(initialData.width || '')
      setThickness(initialData.thickness || availableThicknesses[0] || '4/4')
      setSpecies(initialData.species || availableSpecies[0] || 'Walnut')
      setQuantity(initialData.quantity || 1)
    } else {
      setName('')
      setLength('')
      setWidth('')
      setThickness(availableThicknesses[0] || '4/4')
      setSpecies(availableSpecies[0] || 'Walnut')
      setQuantity(1)
    }
    setError('')
  }, [initialData, availableThicknesses, availableSpecies])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    const lengthNum = parseFloat(length)
    const widthNum = parseFloat(width)
    const quantityNum = parseInt(quantity)

    if (isNaN(lengthNum) || lengthNum <= 0) {
      setError('Please enter a valid length')
      return
    }

    if (isNaN(widthNum) || widthNum <= 0) {
      setError('Please enter a valid width')
      return
    }

    if (isNaN(quantityNum) || quantityNum < 1) {
      setError('Please enter a valid quantity (at least 1)')
      return
    }

    onSubmit({
      id: initialData?.id || Date.now(),
      name: name || `Cut Piece ${Date.now()}`,
      length: lengthNum,
      width: widthNum,
      thickness,
      species,
      quantity: quantityNum
    })

    if (!initialData) {
      setName('')
      setLength('')
      setWidth('')
      setQuantity(1)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="cut-piece-form">
      <h3>{initialData ? 'Edit Cut Piece' : 'Add Cut Piece'}</h3>

      {error && <div className="error">{error}</div>}

      <div className="form-group">
        <label htmlFor="cutName">Piece Name</label>
        <input
          id="cutName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Table Leg, Shelf"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="cutLength">Length (inches)</label>
          <input
            id="cutLength"
            type="number"
            step="0.125"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            placeholder="e.g., 30"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="cutWidth">Width (inches)</label>
          <input
            id="cutWidth"
            type="number"
            step="0.125"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            placeholder="e.g., 3"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="cutThickness">Thickness</label>
          <select
            id="cutThickness"
            value={thickness}
            onChange={(e) => setThickness(e.target.value)}
          >
            {thicknessOptions.map(opt => (
              <option key={opt} value={opt}>{opt} ({parseThickness(opt)}")</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="cutQuantity">Quantity</label>
          <input
            id="cutQuantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="cutSpecies">Species</label>
          <select
            id="cutSpecies"
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
          >
            {speciesOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {initialData ? 'Update Piece' : 'Add Piece'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

// Cut Piece Item Component
function CutPieceItem({ piece, onEdit, onDelete, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, isDragOver }) {
  const qty = piece.quantity || 1

  return (
    <div
      className={`cut-piece-item ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, piece.id)}
      onDragOver={(e) => onDragOver(e, piece.id)}
      onDrop={(e) => onDrop(e, piece.id)}
      onDragEnd={onDragEnd}
    >
      <div className="drag-handle">⋮⋮</div>
      <div className="cut-piece-info">
        <h4>{piece.name}</h4>
        <p className="cut-piece-dimensions">
          {piece.length}" × {piece.width}" × {piece.thickness}
          {qty > 1 && <span className="cut-piece-quantity"> × {qty} pcs</span>}
        </p>
        {piece.species && <p className="cut-piece-species">{piece.species}</p>}
      </div>
      <div className="cut-piece-actions">
        <button onClick={() => onEdit(piece)} className="btn-edit">Edit</button>
        <button onClick={() => onDelete(piece.id)} className="btn-delete">Delete</button>
      </div>
    </div>
  )
}

// Get unique species from cut pieces
function getCutPieceSpecies(pieces) {
  const species = new Set(pieces.map(p => p.species).filter(Boolean))
  return Array.from(species)
}

// Stock Calculator Component - calculates how many boards needed
function StockCalculator({ cutPieces, onApplyStock, projectQuantity = 1 }) {
  // Current selection state for adding a board type
  const [currentThickness, setCurrentThickness] = useState('4/4')
  const [currentSpecies, setCurrentSpecies] = useState('')
  const [currentSize, setCurrentSize] = useState(null) // null = not selected, or template id
  const [useCustomSize, setUseCustomSize] = useState(false)
  const [customLength, setCustomLength] = useState(96)
  const [customWidth, setCustomWidth] = useState(6)

  // List of board types to consider
  const [boardTypes, setBoardTypes] = useState([])

  // Track recently added for visual feedback
  const [justAddedId, setJustAddedId] = useState(null)

  // Calculation results
  const [result, setResult] = useState(null)
  const [calculating, setCalculating] = useState(false)

  // Get unique thicknesses and species from cut pieces
  const cutPieceThicknesses = getCutPieceThicknesses(cutPieces)
  const cutPieceSpeciesList = getCutPieceSpecies(cutPieces)

  // Auto-set initial values from cut pieces
  useEffect(() => {
    if (cutPieceThicknesses.length > 0 && !currentThickness) {
      setCurrentThickness(cutPieceThicknesses[0])
    }
    if (cutPieceSpeciesList.length > 0 && !currentSpecies) {
      setCurrentSpecies(cutPieceSpeciesList[0])
    }
  }, [cutPieceThicknesses, cutPieceSpeciesList])

  // Check what thickness/species combinations are needed but not yet added
  const getMissingCombinations = () => {
    const needed = new Set()
    cutPieces.forEach(p => {
      const key = `${p.thickness}|${p.species || ''}`
      needed.add(key)
    })

    const added = new Set()
    boardTypes.forEach(bt => {
      const key = `${bt.thickness}|${bt.species || ''}`
      added.add(key)
    })

    const missing = []
    needed.forEach(key => {
      if (!added.has(key)) {
        const [thickness, species] = key.split('|')
        missing.push({ thickness, species: species || null })
      }
    })
    return missing
  }

  const missingCombinations = getMissingCombinations()

  const handleAddBoardType = () => {
    if (!currentThickness) return

    let newBoardType
    if (useCustomSize) {
      if (!customLength || !customWidth) return
      const thicknessInches = parseThickness(currentThickness) || 1
      const bf = (customLength * customWidth * thicknessInches) / 144
      newBoardType = {
        id: Date.now(),
        name: `${customLength}" × ${customWidth}"`,
        length: customLength,
        width: customWidth,
        thickness: currentThickness,
        species: currentSpecies || null,
        boardFeet: bf,
        isCustom: true
      }
    } else {
      if (!currentSize) return
      const template = STOCK_TEMPLATES.find(t => t.id === currentSize)
      if (!template) return
      const thicknessInches = parseThickness(currentThickness) || 1
      const bf = (template.length * template.width * thicknessInches) / 144
      newBoardType = {
        id: Date.now(),
        name: template.name,
        length: template.length,
        width: template.width,
        thickness: currentThickness,
        species: currentSpecies || null,
        boardFeet: bf,
        isCustom: false
      }
    }

    setBoardTypes([...boardTypes, newBoardType])
    setResult(null) // Clear previous results

    // Show "just added" feedback
    setJustAddedId(newBoardType.id)
    setTimeout(() => setJustAddedId(null), 2000)

    // Reset size selection for next add
    setCurrentSize(null)
    setUseCustomSize(false)
  }

  const handleRemoveBoardType = (id) => {
    setBoardTypes(boardTypes.filter(bt => bt.id !== id))
    setResult(null)
  }

  const handleCalculate = () => {
    if (boardTypes.length === 0) return

    setCalculating(true)

    // Convert board types to templates
    const templates = boardTypes.map(bt => ({
      name: `${bt.name} (${bt.thickness}${bt.species ? ` - ${bt.species}` : ''})`,
      length: bt.length,
      width: bt.width,
      thickness: bt.thickness,
      species: bt.species
    }))

    setTimeout(() => {
      const calcResult = calculateStockNeeded(cutPieces, templates)
      setResult(calcResult)
      setCalculating(false)
    }, 100)
  }

  const handleApply = () => {
    if (result && result.boards.length > 0) {
      onApplyStock(result.boards, result.cutPlan)
    }
  }

  // Calculate total BF for display
  const calculateTotalBF = () => {
    if (!result) return 0
    return result.boards.reduce((sum, board) => sum + board.boardFeet, 0)
  }

  // Calculate BF for current selection preview
  const currentThicknessInches = parseThickness(currentThickness) || 1

  return (
    <div className="stock-calculator">
      <h3>Calculate Stock Needed</h3>
      {projectQuantity > 1 && (
        <div className="project-quantity-notice">
          Calculating for <strong>{projectQuantity} items</strong> (quantities multiplied)
        </div>
      )}
      <p className="stock-calculator-intro">
        Add board types you can purchase. The calculator will determine how many of each you need.
      </p>

      {/* Board Type Builder */}
      <div className="board-type-builder">
        <div className="builder-header">
          {boardTypes.length === 0 ? (
            <span className="builder-title">Add a Board Type</span>
          ) : (
            <span className="builder-title">Add Another Board Type</span>
          )}
        </div>

        <div className="builder-step">
          <label className="builder-label">1. Thickness</label>
          <div className="thickness-options">
            {THICKNESS_OPTIONS.map(opt => (
              <button
                key={opt}
                className={`thickness-btn ${currentThickness === opt ? 'active' : ''}`}
                onClick={() => setCurrentThickness(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {cutPieceSpeciesList.length > 0 && (
          <div className="builder-step">
            <label className="builder-label">2. Species</label>
            <div className="species-options">
              {cutPieceSpeciesList.map(species => (
                <button
                  key={species}
                  className={`species-btn ${currentSpecies === species ? 'active' : ''}`}
                  onClick={() => setCurrentSpecies(species)}
                >
                  {species}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="builder-step">
          <label className="builder-label">{cutPieceSpeciesList.length > 0 ? '3' : '2'}. Size</label>
          <div className="size-toggle">
            <button
              className={`toggle-btn ${!useCustomSize ? 'active' : ''}`}
              onClick={() => setUseCustomSize(false)}
            >
              Standard
            </button>
            <button
              className={`toggle-btn ${useCustomSize ? 'active' : ''}`}
              onClick={() => setUseCustomSize(true)}
            >
              Custom
            </button>
          </div>

          {!useCustomSize ? (
            <div className="size-options">
              {STOCK_TEMPLATES.map(tmpl => {
                const bf = (tmpl.length * tmpl.width * currentThicknessInches) / 144
                return (
                  <button
                    key={tmpl.id}
                    className={`size-btn ${currentSize === tmpl.id ? 'active' : ''}`}
                    onClick={() => setCurrentSize(tmpl.id)}
                  >
                    <span className="size-name">{tmpl.name}</span>
                    <span className="size-bf">{bf.toFixed(2)} BF</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="custom-size-inputs">
              <div className="form-group">
                <label>Length (in)</label>
                <input
                  type="number"
                  value={customLength}
                  onChange={(e) => setCustomLength(parseFloat(e.target.value) || 0)}
                  step="1"
                />
              </div>
              <div className="form-group">
                <label>Width (in)</label>
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(parseFloat(e.target.value) || 0)}
                  step="0.5"
                />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleAddBoardType}
          className="btn-add-board-type"
          disabled={!currentThickness || (!useCustomSize && !currentSize) || (useCustomSize && (!customLength || !customWidth))}
        >
          + Add Board Type
        </button>
      </div>

      {/* Added Board Types List */}
      {boardTypes.length > 0 && (
        <div className="board-types-list">
          <div className="board-types-header">
            <h4>Board Types Added ({boardTypes.length})</h4>
          </div>
          {boardTypes.map(bt => (
            <div key={bt.id} className={`board-type-item ${justAddedId === bt.id ? 'just-added' : ''}`}>
              <div className="board-type-info">
                <span className="board-type-name">{bt.name}</span>
                <span className="board-type-details">
                  {bt.thickness}{bt.species ? ` • ${bt.species}` : ''} • {bt.boardFeet.toFixed(2)} BF
                </span>
              </div>
              <button
                onClick={() => handleRemoveBoardType(bt.id)}
                className="btn-remove"
              >
                ×
              </button>
            </div>
          ))}

          {/* Warning for missing combinations */}
          {missingCombinations.length > 0 && (
            <div className="warning" style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
              Still need: {missingCombinations.map(m =>
                `${m.thickness}${m.species ? ` ${m.species}` : ''}`
              ).join(', ')}
            </div>
          )}

          <button
            onClick={handleCalculate}
            className="btn-primary btn-calculate"
            disabled={calculating}
          >
            {calculating ? 'Calculating...' : 'Calculate Stock Needed'}
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="stock-result">
          <div className="stock-result-header">
            <h4>Shopping List</h4>
          </div>

          {/* Board breakdown by type */}
          {result.boardsByTemplate && result.boardsByTemplate.length > 0 && (
            <div className="stock-breakdown">
              {result.boardsByTemplate.map((item, idx) => (
                <div key={idx} className="breakdown-item">
                  <span className="breakdown-count">{item.count}×</span>
                  <span className="breakdown-desc">
                    {item.template.name || `${item.template.length}" × ${item.template.width}"`}
                    <span className="breakdown-thickness"> ({item.template.thickness}
                      {item.template.species && ` • ${item.template.species}`})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="stock-result-stats">
            <div className="result-stat">
              <span className="result-value">{result.boardsNeeded}</span>
              <span className="result-label">Total Boards</span>
            </div>
            <div className="result-stat">
              <span className="result-value">{calculateTotalBF().toFixed(1)}</span>
              <span className="result-label">Total Board Feet</span>
            </div>
            <div className="result-stat">
              <span className="result-value">{result.cutPlan?.efficiency.toFixed(0) || 0}%</span>
              <span className="result-label">Efficiency</span>
            </div>
          </div>

          {result.cutPlan?.warnings?.length > 0 && (
            <div className="stock-result-warnings">
              {result.cutPlan.warnings.map((w, i) => (
                <div key={i} className="warning">{w}</div>
              ))}
            </div>
          )}

          <button
            onClick={handleApply}
            className="btn-primary btn-large"
          >
            Use These Boards & Generate Cut Plan
          </button>
        </div>
      )}
    </div>
  )
}

// Cut Plan Board Visualization
function CutPlanBoard({ assignment, scale }) {
  const boardWidth = assignment.width * scale
  const boardLength = assignment.length * scale

  // Fallback colors for pieces without species
  const fallbackColors = [
    '#E06829', '#324168', '#AFCFE4', '#8B5A2B', '#6B8E23',
    '#CD853F', '#4682B4', '#D2691E', '#708090', '#BC8F8F'
  ]

  // Get color for a cut piece - use species color if available, otherwise fallback
  const getCutColor = (cut, idx) => {
    if (cut.species && SPECIES_COLORS[cut.species]) {
      return getSpeciesColor(cut.species)
    }
    return fallbackColors[idx % fallbackColors.length]
  }

  return (
    <div className="cut-plan-board">
      <div className="cut-plan-board-label">
        {assignment.stockBoardName}
        {assignment.stockBoardIndex > 0 && ` (#${assignment.stockBoardIndex + 1})`}
        <span className="cut-plan-board-dims">
          {assignment.length}" × {assignment.width}" × {assignment.thickness}
        </span>
        {assignment.species && (
          <span className="cut-plan-board-species">
            <span
              className="species-color-dot"
              style={{ backgroundColor: getSpeciesColor(assignment.species) }}
            />
            {assignment.species}
          </span>
        )}
      </div>
      <svg
        width={boardLength + 2}
        height={boardWidth + 2}
        className="cut-plan-svg"
      >
        {/* Board background */}
        <rect
          x={1}
          y={1}
          width={boardLength}
          height={boardWidth}
          fill="#F5F1E8"
          stroke="#2C2C2C"
          strokeWidth={1}
        />

        {/* Cut pieces */}
        {assignment.cuts.map((cut, idx) => {
          const cutColor = getCutColor(cut, idx)
          const textColor = getContrastColor(cutColor)
          return (
            <g key={idx}>
              <rect
                x={1 + cut.x * scale}
                y={1 + cut.y * scale}
                width={cut.length * scale}
                height={cut.width * scale}
                fill={cutColor}
                stroke="#0A112A"
                strokeWidth={1}
                opacity={0.9}
              />
              <text
                x={1 + cut.x * scale + (cut.length * scale) / 2}
                y={1 + cut.y * scale + (cut.width * scale) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={textColor}
                fontSize={Math.min(12, Math.min(cut.length, cut.width) * scale * 0.4)}
                fontWeight="500"
              >
                {cut.cutPieceName}
                {cut.cutPieceIndex > 0 && ` #${cut.cutPieceIndex + 1}`}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Cut dimensions list */}
      <div className="cut-dimensions-list">
        <table className="cut-dimensions-table">
          <thead>
            <tr>
              <th>Piece</th>
              <th>Rip Width</th>
              <th>Crosscut Length</th>
            </tr>
          </thead>
          <tbody>
            {assignment.cuts.map((cut, idx) => (
              <tr key={idx}>
                <td>
                  <span
                    className="cut-color-indicator"
                    style={{ backgroundColor: getCutColor(cut, idx) }}
                  ></span>
                  {cut.cutPieceName}
                  {cut.cutPieceIndex > 0 && ` #${cut.cutPieceIndex + 1}`}
                </td>
                <td>{cut.width}"</td>
                <td>{cut.length}"</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Cut Plan Display Component
function CutPlanDisplay({ cutPlan, boards, onRegenerate, isRegenerating, workflowType }) {
  // State for custom price overrides (keyed by item index)
  const [customPrices, setCustomPrices] = useState({})

  if (!cutPlan) return null

  const scale = 3 // pixels per inch

  // For "known" workflow, only price boards that were actually used
  const isKnownWorkflow = workflowType === 'known'

  // Get count of how many instances of each board were used
  const getUsedBoardCounts = () => {
    if (!cutPlan.assignments) return {}
    const usedCounts = {}
    cutPlan.assignments.forEach(assignment => {
      // The assignment contains stockBoardId which is the original board ID
      if (assignment.stockBoardId) {
        usedCounts[assignment.stockBoardId] = (usedCounts[assignment.stockBoardId] || 0) + 1
      }
    })
    return usedCounts
  }

  // Calculate pricing from boards
  const calculatePricing = () => {
    if (!boards || boards.length === 0) return null

    const usedBoardCounts = isKnownWorkflow ? getUsedBoardCounts() : null

    // Group boards by species + thickness + dimensions
    const grouped = {}
    let totalBoardCount = 0
    let usedBoardCount = 0

    boards.forEach(board => {
      const qty = board.quantity || 1
      totalBoardCount += qty

      // For known workflow, only count boards that were used
      let qtyToPrice = qty
      if (isKnownWorkflow && usedBoardCounts) {
        qtyToPrice = usedBoardCounts[board.id] || 0
        if (qtyToPrice === 0) return // Skip if none used
      }

      usedBoardCount += qtyToPrice

      // Calculate board feet per piece (before quantity)
      const bfPerPiece = board.boardFeet / qty

      const key = `${board.thickness}|${board.species || ''}|${board.length}|${board.width}`
      if (!grouped[key]) {
        grouped[key] = {
          key,
          thickness: board.thickness,
          species: board.species,
          length: board.length,
          width: board.width,
          count: 0,
          totalBF: 0
        }
      }
      grouped[key].count += qtyToPrice
      grouped[key].totalBF += bfPerPiece * qtyToPrice
    })

    const items = []
    let totalCost = 0
    let hasUnpricedItems = false

    Object.values(grouped).forEach((group, idx) => {
      const defaultPrice = getPricePerBF(group.species || '', group.thickness)
      // Use custom price if set, otherwise use default
      const pricePerBF = customPrices[group.key] !== undefined
        ? customPrices[group.key]
        : defaultPrice

      if (pricePerBF !== null && pricePerBF !== '') {
        const cost = group.totalBF * parseFloat(pricePerBF)
        totalCost += cost
        items.push({ ...group, pricePerBF: parseFloat(pricePerBF), defaultPrice, cost, isCustom: customPrices[group.key] !== undefined })
      } else {
        hasUnpricedItems = true
        items.push({ ...group, pricePerBF: null, defaultPrice, cost: null, isCustom: false })
      }
    })

    return {
      items,
      totalCost,
      hasUnpricedItems,
      isUsedOnly: isKnownWorkflow,
      boardsUsed: cutPlan.boardsUsed,
      totalBoards: cutPlan.totalStockBoards
    }
  }

  const handlePriceChange = (key, value) => {
    if (value === '' || value === null) {
      // Remove custom price, revert to default
      const newPrices = { ...customPrices }
      delete newPrices[key]
      setCustomPrices(newPrices)
    } else {
      setCustomPrices({ ...customPrices, [key]: parseFloat(value) || 0 })
    }
  }

  const pricing = calculatePricing()

  return (
    <div className="cut-plan-display">
      <div className="cut-plan-header">
        <h3>Cut Plan</h3>
        <button
          onClick={onRegenerate}
          className={`btn-secondary ${isRegenerating ? 'btn-loading' : ''}`}
          disabled={isRegenerating}
        >
          {isRegenerating ? 'Regenerating...' : 'Regenerate Plan'}
        </button>
      </div>

      <div className="cut-plan-stats">
        <div className={`cut-plan-stat ${cutPlan.efficiency >= 80 ? 'stat-good' : cutPlan.efficiency >= 60 ? 'stat-moderate' : 'stat-poor'}`}>
          <span className="stat-value">{cutPlan.efficiency.toFixed(1)}%</span>
          <span className="stat-label">Efficiency</span>
        </div>
        <div className={`cut-plan-stat ${cutPlan.waste <= 1 ? 'stat-good' : cutPlan.waste <= 3 ? 'stat-moderate' : 'stat-poor'}`}>
          <span className="stat-value">{cutPlan.waste.toFixed(2)}</span>
          <span className="stat-label">Waste (BF)</span>
        </div>
        <div className="cut-plan-stat">
          <span className="stat-value">{cutPlan.boardsUsed}/{cutPlan.totalStockBoards}</span>
          <span className="stat-label">Boards Used</span>
        </div>
        {pricing && pricing.totalCost > 0 && (
          <div className="cut-plan-stat stat-highlight">
            <span className="stat-value">${pricing.totalCost.toFixed(2)}</span>
            <span className="stat-label">{pricing.isUsedOnly ? 'Cost (Used)' : 'Est. Cost'}</span>
          </div>
        )}
      </div>

      {cutPlan.warnings.length > 0 && (
        <div className="cut-plan-warnings">
          {cutPlan.warnings.map((warning, idx) => (
            <div key={idx} className="warning">{warning}</div>
          ))}
        </div>
      )}

      <div className="cut-plan-boards">
        {cutPlan.assignments.map((assignment, idx) => (
          <CutPlanBoard key={idx} assignment={assignment} scale={scale} />
        ))}
      </div>

      {cutPlan.assignments.length === 0 && cutPlan.warnings.length === 0 && (
        <p className="cut-plan-empty">No cuts to display. Add cut pieces and generate a plan.</p>
      )}

      {/* Pricing Breakdown */}
      {pricing && pricing.items.length > 0 && (
        <div className="cut-plan-pricing">
          <h4>Estimated Material Cost</h4>
          {pricing.isUsedOnly && (
            <p className="pricing-context">
              Showing cost for <strong>{pricing.boardsUsed} of {pricing.totalBoards}</strong> boards used in this cut plan.
            </p>
          )}
          <table className="pricing-table">
            <thead>
              <tr>
                <th>Qty</th>
                <th>Board</th>
                <th>BF</th>
                <th>$/BF</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {pricing.items.map((item, idx) => (
                <tr key={idx} className={item.isCustom ? 'custom-price' : ''}>
                  <td className="qty-col">{item.count}×</td>
                  <td className="desc-col">
                    {item.length}" × {item.width}"
                    <span className="breakdown-details">
                      {item.thickness}
                      {item.species && ` • ${item.species}`}
                    </span>
                  </td>
                  <td className="bf-col">{item.totalBF.toFixed(1)}</td>
                  <td className="price-col">
                    <div className="price-input-wrapper">
                      <span className="price-symbol">$</span>
                      <input
                        type="number"
                        className="price-input"
                        value={item.pricePerBF !== null ? item.pricePerBF : ''}
                        onChange={(e) => handlePriceChange(item.key, e.target.value)}
                        placeholder={item.defaultPrice !== null ? item.defaultPrice.toFixed(2) : '0.00'}
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </td>
                  <td className="cost-col">
                    {item.cost !== null ? `$${item.cost.toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td colSpan="4" className="total-label">Estimated Total:</td>
                <td className="total-cost">
                  ${pricing.totalCost.toFixed(2)}
                  {pricing.hasUnpricedItems && '*'}
                </td>
              </tr>
            </tfoot>
          </table>
          {pricing.hasUnpricedItems && (
            <p className="pricing-note">* Enter a price to include in total</p>
          )}
          <p className="pricing-disclaimer">
            Default prices are estimates only. Update with your most current prices.
          </p>
        </div>
      )}
    </div>
  )
}

// Project Summary Component
function ProjectSummary({ project }) {
  const totalBoardFeet = project.boards.reduce((sum, board) => sum + board.boardFeet, 0)
  const totalPieces = project.boards.reduce((sum, board) => sum + (board.quantity || 1), 0)

  const cutPieces = project.cutPieces || []
  const projectQuantity = project.quantity || 1
  const totalCutPiecesPerItem = cutPieces.reduce((sum, piece) => sum + (piece.quantity || 1), 0)
  const totalCutPieces = totalCutPiecesPerItem * projectQuantity

  // Calculate BF for multiplied quantities
  const multipliedCutPieces = projectQuantity > 1
    ? cutPieces.map(p => ({ ...p, quantity: (p.quantity || 1) * projectQuantity }))
    : cutPieces
  const totalCutBF = calculateCutPiecesBF(multipliedCutPieces)

  return (
    <div className="project-summary">
      <h3>Project Summary</h3>

      {/* Project Quantity */}
      {projectQuantity > 1 && (
        <div className="summary-quantity-badge">
          Making {projectQuantity} items
        </div>
      )}

      {/* Stock Summary */}
      <div className="summary-section-label">Stock Boards</div>
      <div className="summary-stats">
        <div className="stat">
          <span className="stat-value">{totalPieces}</span>
          <span className="stat-label">Pieces</span>
        </div>
        <div className="stat">
          <span className="stat-value">{totalBoardFeet.toFixed(1)}</span>
          <span className="stat-label">Board Feet</span>
        </div>
      </div>

      {/* Cut Pieces Summary */}
      {cutPieces.length > 0 && (
        <>
          <div className="summary-section-label">Cut List {projectQuantity > 1 && '(Total)'}</div>
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-value">{totalCutPieces}</span>
              <span className="stat-label">
                Pieces
                {projectQuantity > 1 && <span className="stat-per-item">({totalCutPiecesPerItem}/item)</span>}
              </span>
            </div>
            <div className="stat">
              <span className="stat-value">{totalCutBF.toFixed(1)}</span>
              <span className="stat-label">Board Feet</span>
            </div>
          </div>
        </>
      )}

      {/* Cut Plan Efficiency */}
      {project.cutPlan && (
        <>
          <div className="summary-section-label">Cut Plan</div>
          <div className="summary-stats">
            <div className="stat total">
              <span className="stat-value">{project.cutPlan.efficiency.toFixed(0)}%</span>
              <span className="stat-label">Efficiency</span>
            </div>
          </div>
        </>
      )}

      {/* Board List */}
      {project.boards.length > 0 && (
        <div className="board-list-summary">
          <h4>Stock Board List</h4>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Dims</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              {project.boards.map(board => (
                <tr key={board.id}>
                  <td>{board.name}</td>
                  <td>{board.length}"×{board.width}"</td>
                  <td>{board.quantity || 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Project Form Component
function ProjectForm({ onSubmit }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [workflow, setWorkflow] = useState('calculate') // 'known' or 'calculate'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return

    onSubmit({
      id: Date.now(),
      name: name.trim(),
      description: description.trim(),
      quantity: parseInt(quantity) || 1,
      boards: [],
      cutPieces: [],
      cutPlan: null,
      workflow: workflow,
      createdAt: new Date().toISOString()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="project-form">
      <h2>Create New Project</h2>

      <div className="form-group">
        <label htmlFor="projectName">Project Name *</label>
        <input
          id="projectName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Dining Chair, Bookshelf"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="projectDescription">Description</label>
        <textarea
          id="projectDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your project..."
          rows={3}
        />
      </div>

      <div className="form-group">
        <label htmlFor="projectQuantity">How many are you making?</label>
        <div className="quantity-input-row">
          <input
            id="projectQuantity"
            type="number"
            min="1"
            max="100"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="quantity-input"
          />
          <span className="quantity-hint">
            {quantity > 1 ? `Making ${quantity} identical items` : 'Making 1 item'}
          </span>
        </div>
      </div>

      <div className="form-group">
        <label>How would you like to start?</label>
        <div className="workflow-selector">
          <div
            className={`workflow-option ${workflow === 'calculate' ? 'selected' : ''}`}
            onClick={() => setWorkflow('calculate')}
          >
            <div className="workflow-icon">📐</div>
            <div className="workflow-content">
              <h4>Calculate Stock Needed</h4>
              <p>Start with your cut list, then calculate how much lumber to buy</p>
              <span className="workflow-steps">Cut List → Calculate Stock → Cut Plan</span>
            </div>
          </div>
          <div
            className={`workflow-option ${workflow === 'known' ? 'selected' : ''}`}
            onClick={() => setWorkflow('known')}
          >
            <div className="workflow-icon">��</div>
            <div className="workflow-content">
              <h4>I Have My Lumber</h4>
              <p>Start with lumber you already have, then plan your cuts</p>
              <span className="workflow-steps">Stock Boards → Cut List → Cut Plan</span>
            </div>
          </div>
        </div>
      </div>

      <button type="submit" className="btn-primary">Create Project</button>
    </form>
  )
}

// Help Modal Component
function HelpModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content help-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <div className="help-content">
          <h2>User Manual</h2>

          <section className="help-section">
            <h3>Getting Started</h3>
            <ol>
              <li><strong>Sign up</strong> for an account or <strong>sign in</strong> if you already have one</li>
              <li>Click <strong>"+ New Project"</strong> to create a project</li>
              <li>Enter a project name and optional description</li>
              <li>Choose your workflow:
                <ul>
                  <li><strong>Calculate Stock Workflow</strong> (recommended): Start with cut pieces, then calculate what lumber to buy</li>
                  <li><strong>Manual Stock Entry</strong>: Enter your existing lumber inventory manually</li>
                </ul>
              </li>
            </ol>
          </section>

          <section className="help-section">
            <h3>The Three Tabs</h3>
            <p>Navigate between <strong>Cut List</strong>, <strong>Stock Boards</strong>, and <strong>Cut Plan</strong> tabs at any time.</p>
          </section>

          <section className="help-section">
            <h3>Tab 1: Cut List</h3>
            <p>Define all the pieces you need to cut for your project.</p>
            <table className="help-table">
              <thead>
                <tr><th>Field</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td>Piece Name</td><td>Descriptive name (e.g., "Table Leg", "Apron")</td></tr>
                <tr><td>Length</td><td>Final length in inches</td></tr>
                <tr><td>Width</td><td>Final width in inches</td></tr>
                <tr><td>Thickness</td><td>Lumber notation: 4/4 (1"), 5/4 (1.25"), 6/4 (1.5"), 8/4 (2"), etc.</td></tr>
                <tr><td>Species</td><td>Wood type (Walnut, Cherry, Oak, etc.)</td></tr>
                <tr><td>Quantity</td><td>How many pieces needed</td></tr>
              </tbody>
            </table>
            <p><strong>Tips:</strong></p>
            <ul>
              <li>Add all pieces before calculating stock</li>
              <li>Group similar pieces by species and thickness for efficient cutting</li>
              <li>The optimizer accounts for 1/8" saw kerf between cuts</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Tab 2: Stock Boards</h3>
            <h4>Option A: Calculate Stock Needed (Recommended)</h4>
            <p>Use the built-in calculator to determine what lumber to purchase:</p>
            <ol>
              <li>Select <strong>Thickness</strong> (4/4, 5/4, 6/4, 8/4, etc.)</li>
              <li>Select <strong>Species</strong> (matches species from your cut list)</li>
              <li>Choose <strong>Size</strong> (standard sizes like 8ft x 6" or custom dimensions)</li>
              <li>Click <strong>"+ Add Board Type"</strong></li>
              <li>Repeat for each thickness/species combination in your cut list</li>
              <li>Click <strong>"Calculate Stock Needed"</strong></li>
              <li>Review the shopping list showing quantity needed for each board type</li>
              <li>Click <strong>"Use These Boards & Generate Cut Plan"</strong> to apply</li>
            </ol>

            <h4>Option B: Manual Entry</h4>
            <p>If you already have lumber on hand, enter it manually with board name, length, width, thickness, species, and quantity.</p>
          </section>

          <section className="help-section">
            <h3>Tab 3: Cut Plan</h3>
            <p>Generate and view optimized cutting layouts:</p>
            <ol>
              <li>Click <strong>"Generate Cut Plan"</strong> (or use Calculate Stock workflow)</li>
              <li>View statistics:
                <ul>
                  <li><strong>Efficiency</strong>: Percentage of stock used vs. wasted</li>
                  <li><strong>Waste</strong>: Board feet of material lost</li>
                  <li><strong>Boards Used</strong>: How many stock boards needed</li>
                  <li><strong>Est. Cost</strong>: Estimated material cost</li>
                </ul>
              </li>
              <li><strong>Visual diagrams</strong> show exactly where each piece is placed on each board</li>
              <li><strong>Estimated Material Cost</strong> table shows quantity, dimensions, board feet, and costs</li>
              <li>Click <strong>"Regenerate Plan"</strong> to recalculate if needed</li>
            </ol>
          </section>

          <section className="help-section">
            <h3>Pricing</h3>
            <p>The app includes default lumber prices for common species. To use your own prices:</p>
            <ol>
              <li>Generate a cut plan</li>
              <li>Scroll to "Estimated Material Cost"</li>
              <li>Click any price field and enter your supplier's price per board foot</li>
              <li>Total cost updates automatically</li>
            </ol>
            <p><em>Note: Default prices are estimates only. Update with your most current prices.</em></p>
          </section>

          <section className="help-section">
            <h3>Exporting to PDF</h3>
            <p>Click <strong>"Export Project to PDF"</strong> to generate a professional document containing:</p>
            <ul>
              <li>Project name and date</li>
              <li>Stock boards table with dimensions and board feet</li>
              <li>Cut list table with all pieces</li>
              <li>Visual cut diagrams for each board</li>
              <li>Efficiency statistics</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Project Quantity (Building Multiples)</h3>
            <p>Making multiple identical items? Use the quantity feature to automatically calculate total materials:</p>
            <ol>
              <li>Create your project with the cut list for <strong>one item</strong></li>
              <li>Find the <strong>"Building X"</strong> selector in the project header</li>
              <li>Enter how many you're making (e.g., 4 chairs)</li>
              <li>Stock boards are automatically recalculated to match</li>
              <li>Cut plan regenerates with the correct quantities</li>
            </ol>
            <p><strong>Note:</strong> The stock board dimensions stay the same - only the quantities increase to accommodate the additional pieces.</p>
          </section>

          <section className="help-section">
            <h3>Purchase Orders</h3>
            <p>Generate a printable shopping list for the lumber yard:</p>
            <ol>
              <li>Set up your project with stock boards</li>
              <li>Click the <strong>"Purchase Order"</strong> button</li>
              <li>Review your lumber shopping list grouped by species, thickness, and dimensions</li>
              <li>Click <strong>"Print / Save as PDF"</strong> to print or save</li>
            </ol>
            <p>The purchase order includes:</p>
            <ul>
              <li>Your contact information (set in Settings)</li>
              <li>Project name and date</li>
              <li>Quantity, species, dimensions, and board feet for each board type</li>
              <li>Total piece count and board feet</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Settings</h3>
            <p>Click <strong>"Settings"</strong> in the header to configure your profile:</p>
            <ul>
              <li><strong>Name / Company</strong>: Your name or business name</li>
              <li><strong>Address</strong>: Street address, city, state, zip</li>
              <li><strong>Phone</strong>: Contact phone number</li>
              <li><strong>Email</strong>: Contact email address</li>
            </ul>
            <p>This information appears on your purchase orders and syncs with your account across all devices.</p>
          </section>

          <section className="help-section">
            <h3>Kerf and Rough Lumber</h3>
            <p>The optimizer accounts for realistic woodworking conditions:</p>
            <ul>
              <li><strong>Saw kerf</strong>: 1/8" (0.125") material loss between each cut</li>
              <li><strong>Rough lumber edges</strong>: Additional 1/8" on each edge for jointing/straightening</li>
              <li>A 6" wide piece requires at least 6.25" of rough stock width</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Formulas</h3>
            <p><strong>Board Feet</strong> = (Thickness x Width x Length) / 144</p>
            <table className="help-table">
              <thead>
                <tr><th>Notation</th><th>Thickness</th></tr>
              </thead>
              <tbody>
                <tr><td>4/4</td><td>1.00"</td></tr>
                <tr><td>5/4</td><td>1.25"</td></tr>
                <tr><td>6/4</td><td>1.50"</td></tr>
                <tr><td>8/4</td><td>2.00"</td></tr>
                <tr><td>10/4</td><td>2.50"</td></tr>
                <tr><td>12/4</td><td>3.00"</td></tr>
                <tr><td>16/4</td><td>4.00"</td></tr>
              </tbody>
            </table>
          </section>

          <section className="help-section">
            <h3>Troubleshooting</h3>
            <table className="help-table">
              <thead>
                <tr><th>Issue</th><th>Solution</th></tr>
              </thead>
              <tbody>
                <tr><td>"Still need: 4/4 Walnut" warning</td><td>Add a board type with that thickness and species</td></tr>
                <tr><td>Low efficiency percentage</td><td>Try different board sizes, or add smaller pieces to use scraps</td></tr>
                <tr><td>Pieces not fitting</td><td>Ensure stock boards are large enough; check species/thickness match</td></tr>
                <tr><td>Missing price</td><td>Enter a custom price in the $/BF field</td></tr>
                <tr><td>Login issues</td><td>Check email confirmation; use "Forgot Password" if needed</td></tr>
                <tr><td>Sync error</td><td>Check internet connection; data syncs automatically when restored</td></tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  )
}

// Settings Modal Component
function SettingsModal({ isOpen, onClose, userProfile, onSave }) {
  const [profile, setProfile] = useState(userProfile)

  useEffect(() => {
    setProfile(userProfile)
  }, [userProfile, isOpen])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(profile)
    onClose()
  }

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>

        <div className="settings-content">
          <h2>Settings</h2>

          <form onSubmit={handleSubmit}>
            <div className="settings-section">
              <h3>Contact Information</h3>
              <p className="settings-description">
                This information will appear on your purchase orders.
              </p>

              <div className="form-group">
                <label htmlFor="profile-name">Name / Company</label>
                <input
                  type="text"
                  id="profile-name"
                  value={profile.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Your name or company name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-address">Address</label>
                <textarea
                  id="profile-address"
                  value={profile.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Street address, city, state, zip"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-phone">Phone</label>
                <input
                  type="tel"
                  id="profile-phone"
                  value={profile.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-email">Email</label>
                <input
                  type="email"
                  id="profile-email"
                  value={profile.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="settings-actions">
              <button type="submit" className="btn-primary">
                Save Settings
              </button>
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Purchase Order Modal Component
function PurchaseOrderModal({ isOpen, onClose, project, boards, userProfile }) {
  if (!isOpen || !project) return null

  // Group boards by species + thickness + dimensions
  const getShoppingList = () => {
    if (!boards || boards.length === 0) return []

    const grouped = {}
    boards.forEach(board => {
      const key = `${board.thickness}|${board.species || ''}|${board.length}|${board.width}`
      if (!grouped[key]) {
        grouped[key] = {
          thickness: board.thickness,
          species: board.species || 'Unspecified',
          length: board.length,
          width: board.width,
          count: 0,
          totalBF: 0
        }
      }
      grouped[key].count += (board.quantity || 1)
      grouped[key].totalBF += board.boardFeet * (board.quantity || 1)
    })

    return Object.values(grouped).sort((a, b) => {
      // Sort by species, then thickness
      if (a.species !== b.species) return a.species.localeCompare(b.species)
      return a.thickness.localeCompare(b.thickness)
    })
  }

  const shoppingList = getShoppingList()
  const totalBF = shoppingList.reduce((sum, item) => sum + item.totalBF, 0)
  const totalPieces = shoppingList.reduce((sum, item) => sum + item.count, 0)
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const handlePrint = () => {
    window.print()
  }

  const formatDimensions = (item) => {
    const lengthFt = item.length >= 12 ? `${Math.round(item.length / 12)}'` : `${item.length}"`
    return `${lengthFt} × ${item.width}" × ${item.thickness}`
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content purchase-order-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close no-print" onClick={onClose}>&times;</button>

        <div className="purchase-order">
          <div className="po-header">
            <div className="po-header-row">
              <div className="po-title-section">
                <h2>Lumber Purchase Order</h2>
                <div className="po-meta">
                  <p><strong>Project:</strong> {project.name}</p>
                  {project.quantity > 1 && <p><strong>Quantity:</strong> {project.quantity} items</p>}
                  <p><strong>Date:</strong> {today}</p>
                </div>
              </div>
              {(userProfile?.name || userProfile?.address || userProfile?.phone || userProfile?.email) ? (
                <div className="po-customer-info">
                  {userProfile.name && <p className="po-customer-name">{userProfile.name}</p>}
                  {userProfile.address && <p className="po-customer-address">{userProfile.address}</p>}
                  {userProfile.phone && <p>{userProfile.phone}</p>}
                  {userProfile.email && <p>{userProfile.email}</p>}
                </div>
              ) : (
                <div className="po-customer-info po-customer-hint no-print">
                  <p className="po-hint-text">Add your contact info in Settings</p>
                </div>
              )}
            </div>
          </div>

          <table className="po-table">
            <thead>
              <tr>
                <th>Qty</th>
                <th>Species</th>
                <th>Dimensions</th>
                <th>Board Feet</th>
              </tr>
            </thead>
            <tbody>
              {shoppingList.map((item, idx) => (
                <tr key={idx}>
                  <td className="po-qty">{item.count}</td>
                  <td className="po-species">{item.species}</td>
                  <td className="po-dims">{formatDimensions(item)}</td>
                  <td className="po-bf">{item.totalBF.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="po-total-row">
                <td className="po-qty"><strong>{totalPieces}</strong></td>
                <td colSpan="2"><strong>Total</strong></td>
                <td className="po-bf"><strong>{totalBF.toFixed(2)} BF</strong></td>
              </tr>
            </tfoot>
          </table>

          {project.description && (
            <div className="po-notes">
              <p><strong>Notes:</strong> {project.description}</p>
            </div>
          )}

          <div className="po-footer">
            <p>Generated by CutSmart</p>
          </div>
        </div>

        <div className="po-actions no-print">
          <button onClick={handlePrint} className="btn-primary">
            Print / Save as PDF
          </button>
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Skeleton Loading Components
function SkeletonProjectCard() {
  return (
    <div className="skeleton-project-card">
      <div className="skeleton skeleton-title"></div>
      <div className="skeleton skeleton-text"></div>
      <div className="skeleton skeleton-meta"></div>
    </div>
  )
}

function SkeletonProjectList({ count = 3 }) {
  return (
    <div className="project-list">
      <h2>Your Projects</h2>
      {[...Array(count)].map((_, i) => (
        <SkeletonProjectCard key={i} />
      ))}
    </div>
  )
}

function SkeletonItem() {
  return (
    <div className="skeleton-item">
      <div className="skeleton-item-info">
        <div className="skeleton skeleton-title"></div>
        <div className="skeleton skeleton-text"></div>
      </div>
      <div className="skeleton-item-actions">
        <div className="skeleton skeleton-button"></div>
        <div className="skeleton skeleton-button"></div>
      </div>
    </div>
  )
}

function SkeletonItemList({ count = 3 }) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <SkeletonItem key={i} />
      ))}
    </>
  )
}

function SkeletonSummary() {
  return (
    <div className="skeleton-summary">
      <div className="skeleton skeleton-title"></div>
      <div className="skeleton-stats">
        <div className="skeleton-stat"></div>
        <div className="skeleton-stat"></div>
      </div>
    </div>
  )
}

function SkeletonCutPlan() {
  return (
    <div className="skeleton-cut-plan">
      <div className="skeleton skeleton-title"></div>
      <div className="skeleton-cut-plan-stats">
        <div className="skeleton skeleton-cut-plan-stat"></div>
        <div className="skeleton skeleton-cut-plan-stat"></div>
        <div className="skeleton skeleton-cut-plan-stat"></div>
      </div>
      <div className="skeleton skeleton-diagram"></div>
      <div className="skeleton skeleton-diagram"></div>
    </div>
  )
}

// Main App Component
function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [currentProject, setCurrentProject] = useState(null)
  const [editingBoard, setEditingBoard] = useState(null)
  const [editingCutPiece, setEditingCutPiece] = useState(null)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [activeTab, setActiveTab] = useState('cutlist') // Default based on workflow
  const [syncStatus, setSyncStatus] = useState('synced') // 'synced', 'syncing', 'error'
  const [isLoadingProjects, setIsLoadingProjects] = useState(true) // Initial load state
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [draggingBoardId, setDraggingBoardId] = useState(null)
  const [dragOverBoardId, setDragOverBoardId] = useState(null)
  const [draggingCutPieceId, setDraggingCutPieceId] = useState(null)
  const [dragOverCutPieceId, setDragOverCutPieceId] = useState(null)
  const [showHelp, setShowHelp] = useState(false)
  const [showPurchaseOrder, setShowPurchaseOrder] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [userProfile, setUserProfile] = useState({
    name: '',
    address: '',
    phone: '',
    email: ''
  })

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  })

  const showConfirmDialog = (title, message, onConfirm) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm })
  }

  const closeConfirmDialog = () => {
    setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })
  }

  // Confirmation wrapper for board delete
  const confirmDeleteBoard = (boardId) => {
    const board = currentProject?.boards.find(b => b.id === boardId)
    const boardName = board?.name || 'this board'
    showConfirmDialog(
      'Delete Board?',
      `Are you sure you want to delete "${boardName}"?`,
      () => {
        handleDeleteBoard(boardId)
        closeConfirmDialog()
      }
    )
  }

  // Confirmation wrapper for cut piece delete
  const confirmDeleteCutPiece = (pieceId) => {
    const piece = currentProject?.cutPieces?.find(p => p.id === pieceId)
    const pieceName = piece?.name || 'this cut piece'
    showConfirmDialog(
      'Delete Cut Piece?',
      `Are you sure you want to delete "${pieceName}"?`,
      () => {
        handleDeleteCutPiece(pieceId)
        closeConfirmDialog()
      }
    )
  }

  // Check for existing session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load projects and profile from Supabase when user logs in
  useEffect(() => {
    if (session) {
      loadProjects()
      loadUserProfile()
    } else {
      setProjects([])
      setUserProfile({ name: '', address: '', phone: '', email: '' })
    }
  }, [session])

  // Load user profile from Supabase
  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('name, address, phone, email')
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine for new users
        console.error('Failed to load profile:', error)
        return
      }

      if (data) {
        setUserProfile({
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || ''
        })
      }
    } catch (e) {
      console.error('Failed to load profile:', e)
    }
  }

  // Save user profile to Supabase
  const handleUpdateProfile = async (newProfile) => {
    setUserProfile(newProfile)

    if (!session) return

    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: session.user.id,
          name: newProfile.name,
          address: newProfile.address,
          phone: newProfile.phone,
          email: newProfile.email,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (error) {
        console.error('Failed to save profile:', error)
      }
    } catch (e) {
      console.error('Failed to save profile:', e)
    }
  }

  // Load all projects for the current user
  const loadProjects = async () => {
    setSyncStatus('syncing')
    setIsLoadingProjects(true)
    try {
      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (projectsError) throw projectsError

      // Load boards and cut_pieces for all projects
      const projectIds = projectsData.map(p => p.id)

      // Only query if there are projects
      let boardsData = []
      let cutPiecesData = []

      if (projectIds.length > 0) {
        const { data: boards, error: boardsError } = await supabase
          .from('boards')
          .select('*')
          .in('project_id', projectIds)

        if (boardsError) throw boardsError
        boardsData = boards || []

        const { data: cutPieces, error: cutPiecesError } = await supabase
          .from('cut_pieces')
          .select('*')
          .in('project_id', projectIds)

        if (cutPiecesError) throw cutPiecesError
        cutPiecesData = cutPieces || []
      }

      // Combine data into project objects
      const fullProjects = projectsData.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        workflow: project.workflow,
        quantity: project.quantity || 1,
        cutPlan: project.cut_plan,
        createdAt: project.created_at,
        boards: boardsData
          .filter(b => b.project_id === project.id)
          .map(b => ({
            id: b.id,
            name: b.name,
            length: Number(b.length),
            width: Number(b.width),
            thickness: b.thickness,
            thicknessInches: Number(b.thickness_inches),
            species: b.species,
            quantity: b.quantity,
            boardFeetPerPiece: Number(b.board_feet_per_piece),
            boardFeet: Number(b.board_feet)
          })),
        cutPieces: cutPiecesData
          .filter(c => c.project_id === project.id)
          .map(c => ({
            id: c.id,
            name: c.name,
            length: Number(c.length),
            width: Number(c.width),
            thickness: c.thickness,
            species: c.species,
            quantity: c.quantity
          }))
      }))

      setProjects(fullProjects)
      setSyncStatus('synced')
    } catch (error) {
      console.error('Error loading projects:', error)
      setSyncStatus('error')
    } finally {
      setIsLoadingProjects(false)
    }
  }

  // Get workflow type - default to 'calculate' for backward compatibility
  const workflowType = currentProject?.workflow || 'calculate'

  // Set initial tab based on workflow when project changes
  useEffect(() => {
    if (currentProject) {
      const wf = currentProject.workflow || 'calculate'
      setActiveTab(wf === 'known' ? 'stock' : 'cutlist')
    }
  }, [currentProject?.id])

  // Helper to update current project (local state and sync to Supabase)
  const updateProject = async (updatedProject) => {
    setProjects(projects.map(p => p.id === currentProject.id ? updatedProject : p))
    setCurrentProject(updatedProject)

    // Sync cut_plan to Supabase
    setSyncStatus('syncing')
    try {
      const { error } = await supabase
        .from('projects')
        .update({ cut_plan: updatedProject.cutPlan })
        .eq('id', updatedProject.id)

      if (error) throw error
      setSyncStatus('synced')
    } catch (error) {
      console.error('Error updating project:', error)
      setSyncStatus('error')
    }
  }

  // Update project quantity and recalculate stock/cut plan
  const handleUpdateProjectQuantity = async (newQuantity) => {
    const qty = parseInt(newQuantity) || 1
    if (qty < 1 || qty === currentProject.quantity) return

    setSyncStatus('syncing')
    setIsRegenerating(true)

    try {
      const cutPiecesList = currentProject.cutPieces || []
      const existingBoards = currentProject.boards || []

      // Multiply cut pieces by new quantity
      const multipliedCutPieces = cutPiecesList.map(p => ({
        ...p,
        quantity: (p.quantity || 1) * qty
      }))

      let newBoards = existingBoards
      let newCutPlan = null

      // If we have boards and cut pieces, recalculate how many boards are needed
      if (existingBoards.length > 0 && cutPiecesList.length > 0) {
        // Get unique board templates (group by dimensions/thickness/species)
        const boardTemplates = []
        const seenTemplates = new Set()
        existingBoards.forEach(board => {
          const key = `${board.length}|${board.width}|${board.thickness}|${board.species || ''}`
          if (!seenTemplates.has(key)) {
            seenTemplates.add(key)
            // Create a clean base name for the template (without board numbers)
            const lengthFt = board.length >= 12 ? `${Math.round(board.length / 12)}ft` : `${board.length}"`
            const baseName = `${lengthFt} × ${board.width}"`
            boardTemplates.push({
              name: baseName,
              length: board.length,
              width: board.width,
              thickness: board.thickness,
              species: board.species
            })
          }
        })

        // Recalculate stock needed with multiplied cut pieces
        const result = calculateStockNeeded(multipliedCutPieces, boardTemplates)

        if (result && result.boards) {
          newBoards = result.boards.map((board, idx) => ({
            ...board,
            id: existingBoards[idx]?.id || Date.now() + idx
          }))
          newCutPlan = result.cutPlan
        }
      } else if (existingBoards.length > 0 && cutPiecesList.length === 0) {
        // Just update quantity, keep boards as-is
        newCutPlan = null
      }

      // Update database
      // First delete old boards
      await supabase
        .from('boards')
        .delete()
        .eq('project_id', currentProject.id)

      // Insert new boards if any
      if (newBoards.length > 0) {
        const boardsToInsert = newBoards.map(board => ({
          project_id: currentProject.id,
          name: board.name,
          length: board.length,
          width: board.width,
          thickness: board.thickness,
          thickness_inches: board.thicknessInches || parseThickness(board.thickness) || 1,
          species: board.species,
          quantity: board.quantity || 1,
          board_feet_per_piece: board.boardFeetPerPiece || board.boardFeet,
          board_feet: board.boardFeet
        }))

        const { data: insertedBoards, error: boardsError } = await supabase
          .from('boards')
          .insert(boardsToInsert)
          .select()

        if (boardsError) throw boardsError

        newBoards = insertedBoards.map(b => ({
          id: b.id,
          name: b.name,
          length: Number(b.length),
          width: Number(b.width),
          thickness: b.thickness,
          thicknessInches: Number(b.thickness_inches),
          species: b.species,
          quantity: b.quantity,
          boardFeetPerPiece: Number(b.board_feet_per_piece),
          boardFeet: Number(b.board_feet)
        }))
      }

      // Update project
      const { error: projectError } = await supabase
        .from('projects')
        .update({ quantity: qty, cut_plan: newCutPlan })
        .eq('id', currentProject.id)

      if (projectError) throw projectError

      const updatedProject = {
        ...currentProject,
        quantity: qty,
        boards: newBoards,
        cutPlan: newCutPlan
      }
      setProjects(projects.map(p => p.id === currentProject.id ? updatedProject : p))
      setCurrentProject(updatedProject)
      setSyncStatus('synced')
    } catch (error) {
      console.error('Error updating project quantity:', error)
      setSyncStatus('error')
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleCreateProject = async (project) => {
    setSyncStatus('syncing')
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: session.user.id,
          name: project.name,
          description: project.description,
          workflow: project.workflow,
          quantity: project.quantity || 1
        })
        .select()
        .single()

      if (error) throw error

      const newProject = {
        id: data.id,
        name: data.name,
        description: data.description,
        workflow: data.workflow,
        quantity: data.quantity || 1,
        cutPlan: null,
        createdAt: data.created_at,
        boards: [],
        cutPieces: []
      }

      setProjects([newProject, ...projects])
      setCurrentProject(newProject)
      setShowProjectForm(false)
      setSyncStatus('synced')
    } catch (error) {
      console.error('Error creating project:', error)
      setSyncStatus('error')
    }
  }

  const handleSelectProject = (project) => {
    setCurrentProject(project)
    setEditingBoard(null)
    setEditingCutPiece(null)
    setActiveTab('stock')
  }

  const handleDeleteProject = async (projectId) => {
    if (confirm('Are you sure you want to delete this project?')) {
      setSyncStatus('syncing')
      try {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId)

        if (error) throw error

        setProjects(projects.filter(p => p.id !== projectId))
        if (currentProject?.id === projectId) {
          setCurrentProject(null)
        }
        setSyncStatus('synced')
      } catch (error) {
        console.error('Error deleting project:', error)
        setSyncStatus('error')
      }
    }
  }

  // Stock board handlers
  const handleAddBoard = async (board) => {
    setSyncStatus('syncing')
    try {
      const { data, error } = await supabase
        .from('boards')
        .insert({
          project_id: currentProject.id,
          name: board.name,
          length: board.length,
          width: board.width,
          thickness: board.thickness,
          thickness_inches: board.thicknessInches,
          species: board.species,
          quantity: board.quantity,
          board_feet_per_piece: board.boardFeetPerPiece,
          board_feet: board.boardFeet
        })
        .select()
        .single()

      if (error) throw error

      const newBoard = {
        id: data.id,
        name: data.name,
        length: Number(data.length),
        width: Number(data.width),
        thickness: data.thickness,
        thicknessInches: Number(data.thickness_inches),
        species: data.species,
        quantity: data.quantity,
        boardFeetPerPiece: Number(data.board_feet_per_piece),
        boardFeet: Number(data.board_feet)
      }

      const updatedProject = {
        ...currentProject,
        boards: [...currentProject.boards, newBoard],
        cutPlan: null
      }
      setProjects(projects.map(p => p.id === currentProject.id ? updatedProject : p))
      setCurrentProject(updatedProject)

      // Clear cut_plan in database
      await supabase
        .from('projects')
        .update({ cut_plan: null })
        .eq('id', currentProject.id)

      setSyncStatus('synced')
    } catch (error) {
      console.error('Error adding board:', error)
      setSyncStatus('error')
    }
  }

  const handleUpdateBoard = async (updatedBoard) => {
    setSyncStatus('syncing')
    try {
      const { error } = await supabase
        .from('boards')
        .update({
          name: updatedBoard.name,
          length: updatedBoard.length,
          width: updatedBoard.width,
          thickness: updatedBoard.thickness,
          thickness_inches: updatedBoard.thicknessInches,
          species: updatedBoard.species,
          quantity: updatedBoard.quantity,
          board_feet_per_piece: updatedBoard.boardFeetPerPiece,
          board_feet: updatedBoard.boardFeet
        })
        .eq('id', updatedBoard.id)

      if (error) throw error

      const updatedProject = {
        ...currentProject,
        boards: currentProject.boards.map(b =>
          b.id === updatedBoard.id ? updatedBoard : b
        ),
        cutPlan: null
      }
      setProjects(projects.map(p => p.id === currentProject.id ? updatedProject : p))
      setCurrentProject(updatedProject)
      setEditingBoard(null)

      // Clear cut_plan in database
      await supabase
        .from('projects')
        .update({ cut_plan: null })
        .eq('id', currentProject.id)

      setSyncStatus('synced')
    } catch (error) {
      console.error('Error updating board:', error)
      setSyncStatus('error')
    }
  }

  const handleDeleteBoard = async (boardId) => {
    setSyncStatus('syncing')
    try {
      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', boardId)

      if (error) throw error

      const updatedProject = {
        ...currentProject,
        boards: currentProject.boards.filter(b => b.id !== boardId),
        cutPlan: null
      }
      setProjects(projects.map(p => p.id === currentProject.id ? updatedProject : p))
      setCurrentProject(updatedProject)

      // Clear cut_plan in database
      await supabase
        .from('projects')
        .update({ cut_plan: null })
        .eq('id', currentProject.id)

      setSyncStatus('synced')
    } catch (error) {
      console.error('Error deleting board:', error)
      setSyncStatus('error')
    }
  }

  // Board drag and drop handlers
  const handleBoardDragStart = (e, boardId) => {
    setDraggingBoardId(boardId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleBoardDragOver = (e, boardId) => {
    e.preventDefault()
    if (boardId !== draggingBoardId) {
      setDragOverBoardId(boardId)
    }
  }

  const handleBoardDrop = async (e, targetBoardId) => {
    e.preventDefault()
    if (!draggingBoardId || draggingBoardId === targetBoardId) {
      setDraggingBoardId(null)
      setDragOverBoardId(null)
      return
    }

    const boards = [...currentProject.boards]
    const dragIndex = boards.findIndex(b => b.id === draggingBoardId)
    const dropIndex = boards.findIndex(b => b.id === targetBoardId)

    if (dragIndex === -1 || dropIndex === -1) return

    // Remove from old position and insert at new position
    const [removed] = boards.splice(dragIndex, 1)
    boards.splice(dropIndex, 0, removed)

    // Update local state immediately
    const updatedProject = {
      ...currentProject,
      boards,
      cutPlan: null // Clear cut plan since order changed
    }
    setProjects(projects.map(p => p.id === currentProject.id ? updatedProject : p))
    setCurrentProject(updatedProject)

    setDraggingBoardId(null)
    setDragOverBoardId(null)

    // Sync new order to Supabase (we store order implicitly via created_at or use a position field)
    // For now, we'll re-insert boards in order
    setSyncStatus('syncing')
    try {
      // Delete and re-insert all boards in the new order
      await supabase
        .from('boards')
        .delete()
        .eq('project_id', currentProject.id)

      const boardsToInsert = boards.map(board => ({
        id: board.id, // Keep same IDs
        project_id: currentProject.id,
        name: board.name,
        length: board.length,
        width: board.width,
        thickness: board.thickness,
        thickness_inches: board.thicknessInches,
        species: board.species,
        quantity: board.quantity,
        board_feet_per_piece: board.boardFeetPerPiece,
        board_feet: board.boardFeet
      }))

      await supabase
        .from('boards')
        .insert(boardsToInsert)

      // Clear cut_plan
      await supabase
        .from('projects')
        .update({ cut_plan: null })
        .eq('id', currentProject.id)

      setSyncStatus('synced')
    } catch (error) {
      console.error('Error reordering boards:', error)
      setSyncStatus('error')
    }
  }

  const handleBoardDragEnd = () => {
    setDraggingBoardId(null)
    setDragOverBoardId(null)
  }

  // Cut piece handlers
  const handleAddCutPiece = async (piece) => {
    setSyncStatus('syncing')
    try {
      const { data, error } = await supabase
        .from('cut_pieces')
        .insert({
          project_id: currentProject.id,
          name: piece.name,
          length: piece.length,
          width: piece.width,
          thickness: piece.thickness,
          species: piece.species,
          quantity: piece.quantity
        })
        .select()
        .single()

      if (error) throw error

      const newPiece = {
        id: data.id,
        name: data.name,
        length: Number(data.length),
        width: Number(data.width),
        thickness: data.thickness,
        species: data.species,
        quantity: data.quantity
      }

      const cutPieces = currentProject.cutPieces || []
      const updatedProject = {
        ...currentProject,
        cutPieces: [...cutPieces, newPiece],
        cutPlan: null
      }
      setProjects(projects.map(p => p.id === currentProject.id ? updatedProject : p))
      setCurrentProject(updatedProject)

      // Clear cut_plan in database
      await supabase
        .from('projects')
        .update({ cut_plan: null })
        .eq('id', currentProject.id)

      setSyncStatus('synced')
    } catch (error) {
      console.error('Error adding cut piece:', error)
      setSyncStatus('error')
    }
  }

  const handleUpdateCutPiece = async (updatedPiece) => {
    setSyncStatus('syncing')
    try {
      const { error } = await supabase
        .from('cut_pieces')
        .update({
          name: updatedPiece.name,
          length: updatedPiece.length,
          width: updatedPiece.width,
          thickness: updatedPiece.thickness,
          species: updatedPiece.species,
          quantity: updatedPiece.quantity
        })
        .eq('id', updatedPiece.id)

      if (error) throw error

      const cutPieces = currentProject.cutPieces || []
      const updatedProject = {
        ...currentProject,
        cutPieces: cutPieces.map(p =>
          p.id === updatedPiece.id ? updatedPiece : p
        ),
        cutPlan: null
      }
      setProjects(projects.map(p => p.id === currentProject.id ? updatedProject : p))
      setCurrentProject(updatedProject)
      setEditingCutPiece(null)

      // Clear cut_plan in database
      await supabase
        .from('projects')
        .update({ cut_plan: null })
        .eq('id', currentProject.id)

      setSyncStatus('synced')
    } catch (error) {
      console.error('Error updating cut piece:', error)
      setSyncStatus('error')
    }
  }

  const handleDeleteCutPiece = async (pieceId) => {
    setSyncStatus('syncing')
    try {
      const { error } = await supabase
        .from('cut_pieces')
        .delete()
        .eq('id', pieceId)

      if (error) throw error

      const cutPieces = currentProject.cutPieces || []
      const updatedProject = {
        ...currentProject,
        cutPieces: cutPieces.filter(p => p.id !== pieceId),
        cutPlan: null
      }
      setProjects(projects.map(p => p.id === currentProject.id ? updatedProject : p))
      setCurrentProject(updatedProject)

      // Clear cut_plan in database
      await supabase
        .from('projects')
        .update({ cut_plan: null })
        .eq('id', currentProject.id)

      setSyncStatus('synced')
    } catch (error) {
      console.error('Error deleting cut piece:', error)
      setSyncStatus('error')
    }
  }

  // Cut piece drag and drop handlers
  const handleCutPieceDragStart = (e, pieceId) => {
    setDraggingCutPieceId(pieceId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleCutPieceDragOver = (e, pieceId) => {
    e.preventDefault()
    if (pieceId !== draggingCutPieceId) {
      setDragOverCutPieceId(pieceId)
    }
  }

  const handleCutPieceDrop = async (e, targetPieceId) => {
    e.preventDefault()
    if (!draggingCutPieceId || draggingCutPieceId === targetPieceId) {
      setDraggingCutPieceId(null)
      setDragOverCutPieceId(null)
      return
    }

    const cutPiecesList = [...(currentProject.cutPieces || [])]
    const dragIndex = cutPiecesList.findIndex(p => p.id === draggingCutPieceId)
    const dropIndex = cutPiecesList.findIndex(p => p.id === targetPieceId)

    if (dragIndex === -1 || dropIndex === -1) return

    // Remove from old position and insert at new position
    const [removed] = cutPiecesList.splice(dragIndex, 1)
    cutPiecesList.splice(dropIndex, 0, removed)

    // Update local state immediately
    const updatedProject = {
      ...currentProject,
      cutPieces: cutPiecesList,
      cutPlan: null // Clear cut plan since order changed
    }
    setProjects(projects.map(p => p.id === currentProject.id ? updatedProject : p))
    setCurrentProject(updatedProject)

    setDraggingCutPieceId(null)
    setDragOverCutPieceId(null)

    // Sync new order to Supabase
    setSyncStatus('syncing')
    try {
      // Delete and re-insert all cut pieces in the new order
      await supabase
        .from('cut_pieces')
        .delete()
        .eq('project_id', currentProject.id)

      const piecesToInsert = cutPiecesList.map(piece => ({
        id: piece.id,
        project_id: currentProject.id,
        name: piece.name,
        length: piece.length,
        width: piece.width,
        thickness: piece.thickness,
        species: piece.species,
        quantity: piece.quantity
      }))

      await supabase
        .from('cut_pieces')
        .insert(piecesToInsert)

      // Clear cut_plan
      await supabase
        .from('projects')
        .update({ cut_plan: null })
        .eq('id', currentProject.id)

      setSyncStatus('synced')
    } catch (error) {
      console.error('Error reordering cut pieces:', error)
      setSyncStatus('error')
    }
  }

  const handleCutPieceDragEnd = () => {
    setDraggingCutPieceId(null)
    setDragOverCutPieceId(null)
  }

  // Generate cut plan
  const handleGenerateCutPlan = async () => {
    const cutPieces = currentProject.cutPieces || []
    if (cutPieces.length === 0) {
      alert('Add cut pieces first before generating a plan.')
      return
    }
    if (currentProject.boards.length === 0) {
      alert('Add stock boards first before generating a plan.')
      return
    }

    setIsRegenerating(true)

    // Small delay to show the loading state (especially for fast calculations)
    await new Promise(resolve => setTimeout(resolve, 100))

    // Multiply cut pieces by project quantity
    const projectQty = currentProject.quantity || 1
    const multipliedCutPieces = projectQty > 1
      ? cutPieces.map(p => ({ ...p, quantity: (p.quantity || 1) * projectQty }))
      : cutPieces

    const cutPlan = optimizeCuts(currentProject.boards, multipliedCutPieces)

    // Update local state
    const updatedProject = {
      ...currentProject,
      cutPlan
    }
    setProjects(projects.map(p => p.id === currentProject.id ? updatedProject : p))
    setCurrentProject(updatedProject)
    setActiveTab('plan')

    // Sync to Supabase
    setSyncStatus('syncing')
    try {
      const { error } = await supabase
        .from('projects')
        .update({ cut_plan: cutPlan })
        .eq('id', currentProject.id)

      if (error) throw error
      setSyncStatus('synced')
    } catch (error) {
      console.error('Error saving cut plan:', error)
      setSyncStatus('error')
    } finally {
      setIsRegenerating(false)
    }
  }

  // Apply calculated stock boards to project
  const handleApplyCalculatedStock = async (boards, cutPlan) => {
    setSyncStatus('syncing')
    try {
      // Delete existing boards for this project
      await supabase
        .from('boards')
        .delete()
        .eq('project_id', currentProject.id)

      // Insert new boards
      const boardsToInsert = boards.map(board => ({
        project_id: currentProject.id,
        name: board.name,
        length: board.length,
        width: board.width,
        thickness: board.thickness,
        thickness_inches: board.thicknessInches,
        species: board.species,
        quantity: board.quantity || 1,
        board_feet_per_piece: board.boardFeetPerPiece || board.boardFeet,
        board_feet: board.boardFeet
      }))

      const { data: insertedBoards, error: boardsError } = await supabase
        .from('boards')
        .insert(boardsToInsert)
        .select()

      if (boardsError) throw boardsError

      // Update cut_plan in projects
      const { error: projectError } = await supabase
        .from('projects')
        .update({ cut_plan: cutPlan })
        .eq('id', currentProject.id)

      if (projectError) throw projectError

      // Update local state with new board IDs
      const newBoards = insertedBoards.map(b => ({
        id: b.id,
        name: b.name,
        length: Number(b.length),
        width: Number(b.width),
        thickness: b.thickness,
        thicknessInches: Number(b.thickness_inches),
        species: b.species,
        quantity: b.quantity,
        boardFeetPerPiece: Number(b.board_feet_per_piece),
        boardFeet: Number(b.board_feet)
      }))

      const updatedProject = {
        ...currentProject,
        boards: newBoards,
        cutPlan
      }
      setProjects(projects.map(p => p.id === currentProject.id ? updatedProject : p))
      setCurrentProject(updatedProject)
      setActiveTab('plan')
      setSyncStatus('synced')
    } catch (error) {
      console.error('Error applying calculated stock:', error)
      setSyncStatus('error')
    }
  }

  // Sign out handler
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setCurrentProject(null)
    setProjects([])
  }

  const availableThicknesses = currentProject ? getStockThicknesses(currentProject.boards) : []
  const availableSpecies = currentProject
    ? [...new Set(currentProject.boards.map(b => b.species).filter(Boolean))]
    : []
  const cutPieces = currentProject?.cutPieces || []
  const projectQuantity = currentProject?.quantity || 1

  // Multiply cut pieces by project quantity for calculations
  const getMultipliedCutPieces = () => {
    if (projectQuantity <= 1) return cutPieces
    return cutPieces.map(piece => ({
      ...piece,
      quantity: (piece.quantity || 1) * projectQuantity
    }))
  }

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  // Show auth form if not logged in
  if (!session) {
    return <Auth />
  }

  return (
    <div className="app">
      {/* User header with sign out */}
      <div className="user-header">
        <span className="user-email">{session.user.email}</span>
        <div className="sync-status">
          <span className={`sync-indicator ${syncStatus}`}></span>
          <span>{syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'error' ? 'Sync error' : 'Synced'}</span>
        </div>
        <button onClick={handleSignOut} className="btn-signout">
          Sign Out
        </button>
      </div>

      <header>
        <div className="header-content">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="CutSmart by The Joinery" className="header-logo" />
          <Dropdown
            icon="☰"
            label="Menu"
            className="header-menu"
            items={[
              { icon: '⚙', label: 'Settings', onClick: () => setShowSettings(true) },
              { icon: '?', label: 'Help', onClick: () => setShowHelp(true) },
            ]}
          />
        </div>
      </header>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        userProfile={userProfile}
        onSave={handleUpdateProfile}
      />
      <PurchaseOrderModal
        isOpen={showPurchaseOrder}
        onClose={() => setShowPurchaseOrder(false)}
        project={currentProject}
        boards={currentProject?.boards || []}
        userProfile={userProfile}
      />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirmDialog}
      />

      <main>
        {!currentProject ? (
          <div className="project-selection">
            {showProjectForm ? (
              <>
                <ProjectForm onSubmit={handleCreateProject} />
                <button
                  onClick={() => setShowProjectForm(false)}
                  className="btn-secondary"
                  style={{ marginTop: '1rem' }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowProjectForm(true)}
                  className="btn-primary btn-large"
                >
                  + New Project
                </button>

                {isLoadingProjects ? (
                  <SkeletonProjectList count={3} />
                ) : projects.length > 0 ? (
                  <div className="project-list">
                    <h2>Your Projects</h2>
                    {projects.map(project => (
                      <div key={project.id} className="project-card">
                        <div className="project-card-info" onClick={() => handleSelectProject(project)}>
                          <h3>{project.name}</h3>
                          {project.description && <p>{project.description}</p>}
                          <span className="project-meta">
                            {project.boards.length} boards •
                            {project.boards.reduce((sum, b) => sum + b.boardFeet, 0).toFixed(2)} BF
                            {(project.cutPieces?.length || 0) > 0 && (
                              <> • {project.cutPieces.length} cut pieces</>
                            )}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            showConfirmDialog(
                              'Delete Project?',
                              `Are you sure you want to delete "${project.name}"? This will also delete all boards and cut pieces in this project.`,
                              () => {
                                handleDeleteProject(project.id)
                                closeConfirmDialog()
                              }
                            )
                          }}
                          className="btn-delete"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state empty-state-projects">
                    <div className="empty-state-icon">📐</div>
                    <h3>No projects yet</h3>
                    <p>Create your first project to start planning your cuts and calculating lumber needs.</p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="project-view">
            <div className="project-header">
              <div className="project-header-top">
                <button onClick={() => setCurrentProject(null)} className="btn-back">
                  ← Back to Projects
                </button>
                <Dropdown
                  label="Actions"
                  className="project-actions-dropdown"
                  items={[
                    { icon: '📄', label: 'Export to PDF', onClick: () => exportProjectToPDF(currentProject) },
                    ...(currentProject.boards.length > 0 ? [
                      { icon: '📋', label: 'Purchase Order', onClick: () => setShowPurchaseOrder(true) },
                    ] : []),
                  ]}
                />
              </div>
              <div className="project-title">
                <h2>{currentProject.name}</h2>
                {currentProject.description && (
                  <p className="project-description">{currentProject.description}</p>
                )}
              </div>
              <div className="project-quantity-selector">
                <label>Making:</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={currentProject.quantity || 1}
                  onChange={(e) => handleUpdateProjectQuantity(e.target.value)}
                  className="project-quantity-input"
                />
                <span className="project-quantity-label">
                  {(currentProject.quantity || 1) === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>

            {/* Workflow Indicator */}
            <div className="workflow-indicator">
              {workflowType === 'calculate' ? (
                <span>📐 Calculate Stock Workflow</span>
              ) : (
                <span>🪵 Known Stock Workflow</span>
              )}
            </div>

            {/* Tab Navigation - Order based on workflow */}
            <div className="tab-nav">
              {workflowType === 'calculate' ? (
                <>
                  <button
                    className={`tab-btn ${activeTab === 'cutlist' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cutlist')}
                  >
                    <span className="tab-step">1</span>
                    Cut List ({cutPieces.length})
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'stock' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stock')}
                  >
                    <span className="tab-step">2</span>
                    Stock Boards ({currentProject.boards.length})
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'plan' ? 'active' : ''}`}
                    onClick={() => setActiveTab('plan')}
                  >
                    <span className="tab-step">3</span>
                    Cut Plan {currentProject.cutPlan ? '✓' : ''}
                  </button>
                </>
              ) : (
                <>
                  <button
                    className={`tab-btn ${activeTab === 'stock' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stock')}
                  >
                    <span className="tab-step">1</span>
                    Stock Boards ({currentProject.boards.length})
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'cutlist' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cutlist')}
                  >
                    <span className="tab-step">2</span>
                    Cut List ({cutPieces.length})
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'plan' ? 'active' : ''}`}
                    onClick={() => setActiveTab('plan')}
                  >
                    <span className="tab-step">3</span>
                    Cut Plan {currentProject.cutPlan ? '✓' : ''}
                  </button>
                </>
              )}
            </div>

            <div className="project-content">
              <div className="main-section">
                {/* Stock Boards Tab */}
                {activeTab === 'stock' && (
                  <div className="boards-section">
                    {/* For "calculate" workflow, show calculator if no boards yet */}
                    {workflowType === 'calculate' && currentProject.boards.length === 0 && cutPieces.length > 0 ? (
                      <StockCalculator
                        cutPieces={getMultipliedCutPieces()}
                        onApplyStock={handleApplyCalculatedStock}
                        projectQuantity={projectQuantity}
                      />
                    ) : workflowType === 'calculate' && currentProject.boards.length === 0 && cutPieces.length === 0 ? (
                      <div className="workflow-prompt">
                        <h3>Step 2: Calculate Stock Needed</h3>
                        <p>First, add your cut pieces in the Cut List tab to calculate how much lumber you need.</p>
                        <button
                          onClick={() => setActiveTab('cutlist')}
                          className="btn-primary"
                        >
                          Go to Cut List
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Show form for manual entry or editing */}
                        {editingBoard ? (
                          <BoardForm
                            initialData={editingBoard}
                            onSubmit={handleUpdateBoard}
                            onCancel={() => setEditingBoard(null)}
                          />
                        ) : (
                          <BoardForm onSubmit={handleAddBoard} />
                        )}

                        {currentProject.boards.length > 0 ? (
                          <div className="board-list">
                            <h3>Stock Boards</h3>
                            <p className="reorder-hint">Drag to reorder</p>
                            {currentProject.boards.map(board => (
                              <BoardItem
                                key={board.id}
                                board={board}
                                onEdit={setEditingBoard}
                                onDelete={confirmDeleteBoard}
                                onDragStart={handleBoardDragStart}
                                onDragOver={handleBoardDragOver}
                                onDrop={handleBoardDrop}
                                onDragEnd={handleBoardDragEnd}
                                isDragging={draggingBoardId === board.id}
                                isDragOver={dragOverBoardId === board.id}
                              />
                            ))}

                            {/* Next step prompt for "known" workflow */}
                            {workflowType === 'known' && cutPieces.length === 0 && (
                              <div className="next-step-prompt">
                                <p>Stock boards added! Now add your cut pieces.</p>
                                <button
                                  onClick={() => setActiveTab('cutlist')}
                                  className="btn-primary"
                                >
                                  Continue to Cut List →
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="empty-state empty-state-inline">
                            <div className="empty-state-icon">🪵</div>
                            <h3>No stock boards yet</h3>
                            <p>Add the lumber you have available using the form above.</p>
                          </div>
                        )}

                        {/* Recalculate option for "calculate" workflow */}
                        {workflowType === 'calculate' && currentProject.boards.length > 0 && cutPieces.length > 0 && (
                          <div className="recalculate-section">
                            <button
                              onClick={async () => {
                                setSyncStatus('syncing')
                                try {
                                  // Delete all boards for this project
                                  await supabase
                                    .from('boards')
                                    .delete()
                                    .eq('project_id', currentProject.id)

                                  // Clear cut_plan
                                  await supabase
                                    .from('projects')
                                    .update({ cut_plan: null })
                                    .eq('id', currentProject.id)

                                  const updatedProject = {
                                    ...currentProject,
                                    boards: [],
                                    cutPlan: null
                                  }
                                  setProjects(projects.map(p => p.id === currentProject.id ? updatedProject : p))
                                  setCurrentProject(updatedProject)
                                  setSyncStatus('synced')
                                } catch (error) {
                                  console.error('Error clearing boards:', error)
                                  setSyncStatus('error')
                                }
                              }}
                              className="btn-secondary"
                            >
                              Clear Boards & Recalculate
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Cut List Tab */}
                {activeTab === 'cutlist' && (
                  <div className="cut-list-section">
                    {editingCutPiece ? (
                      <CutPieceForm
                        initialData={editingCutPiece}
                        onSubmit={handleUpdateCutPiece}
                        onCancel={() => setEditingCutPiece(null)}
                        availableThicknesses={availableThicknesses}
                        availableSpecies={availableSpecies}
                      />
                    ) : (
                      <CutPieceForm
                        onSubmit={handleAddCutPiece}
                        availableThicknesses={availableThicknesses}
                        availableSpecies={availableSpecies}
                      />
                    )}

                    {cutPieces.length > 0 ? (
                      <div className="cut-piece-list">
                        <h3>Cut Pieces</h3>
                        <p className="reorder-hint">Drag to reorder</p>
                        {cutPieces.map(piece => (
                          <CutPieceItem
                            key={piece.id}
                            piece={piece}
                            onEdit={setEditingCutPiece}
                            onDelete={confirmDeleteCutPiece}
                            onDragStart={handleCutPieceDragStart}
                            onDragOver={handleCutPieceDragOver}
                            onDrop={handleCutPieceDrop}
                            onDragEnd={handleCutPieceDragEnd}
                            isDragging={draggingCutPieceId === piece.id}
                            isDragOver={dragOverCutPieceId === piece.id}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state empty-state-inline">
                        <div className="empty-state-icon">✂️</div>
                        <h3>No cut pieces yet</h3>
                        <p>Add the pieces you need to cut for your project using the form above.</p>
                      </div>
                    )}

                    {/* Next step prompts based on workflow */}
                    {cutPieces.length > 0 && (
                      <div className="next-step-section">
                        {workflowType === 'calculate' && currentProject.boards.length === 0 && (
                          <div className="next-step-prompt">
                            <p>Cut list ready! Now calculate how much lumber you need.</p>
                            <button
                              onClick={() => setActiveTab('stock')}
                              className="btn-primary btn-large"
                            >
                              Continue to Calculate Stock →
                            </button>
                          </div>
                        )}

                        {workflowType === 'known' && currentProject.boards.length === 0 && (
                          <div className="workflow-prompt">
                            <p>You need stock boards to generate a cut plan.</p>
                            <button
                              onClick={() => setActiveTab('stock')}
                              className="btn-primary"
                            >
                              Go to Stock Boards
                            </button>
                          </div>
                        )}

                        {currentProject.boards.length > 0 && (
                          <div className="generate-plan-section">
                            <button
                              onClick={handleGenerateCutPlan}
                              className="btn-primary btn-large"
                            >
                              Generate Cut Plan →
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Cut Plan Tab */}
                {activeTab === 'plan' && (
                  <div className="cut-plan-section">
                    {currentProject.cutPlan ? (
                      <CutPlanDisplay
                        cutPlan={currentProject.cutPlan}
                        boards={currentProject.boards}
                        onRegenerate={handleGenerateCutPlan}
                        isRegenerating={isRegenerating}
                        workflowType={currentProject.workflow}
                      />
                    ) : (
                      <div className="no-plan">
                        <h3>Cut Plan</h3>
                        <p>No cut plan generated yet.</p>

                        {workflowType === 'calculate' ? (
                          <>
                            {cutPieces.length === 0 && (
                              <div className="workflow-prompt">
                                <p>Start by adding your cut pieces.</p>
                                <button onClick={() => setActiveTab('cutlist')} className="btn-primary">
                                  Go to Cut List
                                </button>
                              </div>
                            )}
                            {cutPieces.length > 0 && currentProject.boards.length === 0 && (
                              <div className="workflow-prompt">
                                <p>Next, calculate how much lumber you need.</p>
                                <button onClick={() => setActiveTab('stock')} className="btn-primary">
                                  Calculate Stock Needed
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {currentProject.boards.length === 0 && (
                              <div className="workflow-prompt">
                                <p>Start by adding your stock boards.</p>
                                <button onClick={() => setActiveTab('stock')} className="btn-primary">
                                  Go to Stock Boards
                                </button>
                              </div>
                            )}
                            {currentProject.boards.length > 0 && cutPieces.length === 0 && (
                              <div className="workflow-prompt">
                                <p>Next, add your cut pieces.</p>
                                <button onClick={() => setActiveTab('cutlist')} className="btn-primary">
                                  Go to Cut List
                                </button>
                              </div>
                            )}
                          </>
                        )}

                        {cutPieces.length > 0 && currentProject.boards.length > 0 && (
                          <button
                            onClick={handleGenerateCutPlan}
                            className="btn-primary btn-large"
                          >
                            Generate Cut Plan
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <aside className="summary-section">
                <ProjectSummary project={currentProject} />
              </aside>
            </div>
          </div>
        )}
      </main>

      <footer>
        <p>Board Feet = (Thickness × Width × Length) / 144</p>
      </footer>
    </div>
  )
}

export default App

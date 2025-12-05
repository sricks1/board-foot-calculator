/**
 * Cut List Optimizer
 * Uses strip-based guillotine cutting for realistic woodworking optimization
 *
 * Strategy:
 * 1. Group pieces by width (pieces of same width can share a rip cut)
 * 2. Create "strips" - full-length rip cuts at specific widths
 * 3. Pack pieces into strips, allowing multiple pieces side-by-side if they fit
 * 4. Optimize strip placement on stock boards
 */

const DEFAULT_KERF = 0.125 // 1/8 inch saw blade kerf

/**
 * Parse lumber notation (e.g., "4/4") to inches
 */
function parseThickness(notation) {
  const match = notation.match(/^(\d+)\/(\d+)$/)
  if (match) {
    return parseInt(match[1]) / parseInt(match[2])
  }
  const num = parseFloat(notation)
  return isNaN(num) ? null : num
}

/**
 * Expand boards with quantity > 1 into individual board instances
 */
function expandStockBoards(boards) {
  const expanded = []
  boards.forEach(board => {
    const qty = board.quantity || 1
    for (let i = 0; i < qty; i++) {
      expanded.push({
        ...board,
        instanceIndex: i,
        originalId: board.id,
        uniqueId: `${board.id}-${i}`
      })
    }
  })
  return expanded
}

/**
 * Expand cut pieces with quantity > 1 into individual pieces
 */
function expandCutPieces(pieces) {
  const expanded = []
  pieces.forEach(piece => {
    const qty = piece.quantity || 1
    for (let i = 0; i < qty; i++) {
      expanded.push({
        ...piece,
        instanceIndex: i,
        originalId: piece.id,
        uniqueId: `${piece.id}-${i}`
      })
    }
  })
  return expanded
}

/**
 * Group pieces by their width (for efficient rip cuts)
 * Also considers rotation - a piece can be rotated if it fits better
 */
function groupByWidth(pieces, kerf) {
  const groups = {}

  pieces.forEach(piece => {
    // Use the smaller dimension as width (pieces are typically ripped to width, then crosscut to length)
    // But we'll track both orientations
    const w1 = piece.width
    const w2 = piece.length

    // Primary: use stated width
    const key = w1.toFixed(3)
    if (!groups[key]) {
      groups[key] = { width: w1, pieces: [] }
    }
    groups[key].pieces.push({ ...piece, rotated: false, effectiveLength: piece.length, effectiveWidth: w1 })
  })

  return groups
}

/**
 * Try to fit pieces into strips on a board
 * A strip is a full-length rip cut at a specific width
 */
function createStripsForBoard(board, pieces, kerf) {
  const strips = []
  let remainingWidth = board.width
  let currentY = 0 // Y position tracks width usage

  // Sort pieces by width (descending) to place wider pieces first
  const sortedPieces = [...pieces].sort((a, b) => b.effectiveWidth - a.effectiveWidth)
  const unplacedPieces = []
  const placedPieceIds = new Set()

  // Group remaining pieces by width for efficient strip creation
  const piecesByWidth = {}
  sortedPieces.forEach(p => {
    const widthKey = p.effectiveWidth.toFixed(3)
    if (!piecesByWidth[widthKey]) {
      piecesByWidth[widthKey] = []
    }
    piecesByWidth[widthKey].push(p)
  })

  // Process each unique width
  const uniqueWidths = Object.keys(piecesByWidth)
    .map(k => parseFloat(k))
    .sort((a, b) => b - a) // Largest first

  for (const stripWidth of uniqueWidths) {
    const widthKey = stripWidth.toFixed(3)
    const piecesAtWidth = piecesByWidth[widthKey].filter(p => !placedPieceIds.has(p.uniqueId))

    if (piecesAtWidth.length === 0) continue

    // Check if we can fit this strip width
    const neededWidth = stripWidth + (strips.length > 0 ? kerf : 0)
    if (neededWidth > remainingWidth) {
      // Can't fit this width, try to combine with narrower pieces
      continue
    }

    // Create a strip at this width
    const strip = {
      y: currentY + (strips.length > 0 ? kerf : 0),
      width: stripWidth,
      length: board.length,
      pieces: []
    }

    // Pack pieces into this strip along the length
    let currentX = 0
    let remainingLength = board.length

    // Sort pieces at this width by length (descending) for better packing
    piecesAtWidth.sort((a, b) => b.effectiveLength - a.effectiveLength)

    for (const piece of piecesAtWidth) {
      if (placedPieceIds.has(piece.uniqueId)) continue

      const neededLength = piece.effectiveLength + (strip.pieces.length > 0 ? kerf : 0)

      if (neededLength <= remainingLength) {
        // Place the piece
        strip.pieces.push({
          ...piece,
          x: currentX + (strip.pieces.length > 0 ? kerf : 0),
          y: strip.y,
          placedLength: piece.effectiveLength,
          placedWidth: stripWidth
        })

        currentX += piece.effectiveLength + (strip.pieces.length > 1 ? kerf : 0)
        remainingLength -= neededLength
        placedPieceIds.add(piece.uniqueId)
      }
    }

    if (strip.pieces.length > 0) {
      strips.push(strip)
      currentY = strip.y + stripWidth
      remainingWidth = board.width - currentY
    }
  }

  // Now try to fit remaining pieces by checking if they can be rotated or fit in remaining space
  // Second pass: try to fit pieces that didn't match exact widths
  for (const piece of sortedPieces) {
    if (placedPieceIds.has(piece.uniqueId)) continue

    // Try to fit in existing strips' remaining length
    for (const strip of strips) {
      const stripUsedLength = strip.pieces.reduce((sum, p) => sum + p.placedLength + kerf, 0) - (strip.pieces.length > 0 ? kerf : 0)
      const stripRemainingLength = board.length - stripUsedLength

      // Check if piece fits (same width or narrower, and fits in remaining length)
      if (piece.effectiveWidth <= strip.width && piece.effectiveLength + kerf <= stripRemainingLength) {
        strip.pieces.push({
          ...piece,
          x: stripUsedLength + kerf,
          y: strip.y,
          placedLength: piece.effectiveLength,
          placedWidth: piece.effectiveWidth
        })
        placedPieceIds.add(piece.uniqueId)
        break
      }

      // Try rotated
      if (piece.effectiveLength <= strip.width && piece.effectiveWidth + kerf <= stripRemainingLength) {
        strip.pieces.push({
          ...piece,
          x: stripUsedLength + kerf,
          y: strip.y,
          placedLength: piece.effectiveWidth,
          placedWidth: piece.effectiveLength,
          rotated: true
        })
        placedPieceIds.add(piece.uniqueId)
        break
      }
    }
  }

  // Third pass: create new strips for remaining pieces if space allows
  for (const piece of sortedPieces) {
    if (placedPieceIds.has(piece.uniqueId)) continue

    const neededWidth = piece.effectiveWidth + (strips.length > 0 ? kerf : 0)

    if (neededWidth <= remainingWidth && piece.effectiveLength <= board.length) {
      // Can create a new strip
      const strip = {
        y: currentY + (strips.length > 0 ? kerf : 0),
        width: piece.effectiveWidth,
        length: board.length,
        pieces: [{
          ...piece,
          x: 0,
          y: currentY + (strips.length > 0 ? kerf : 0),
          placedLength: piece.effectiveLength,
          placedWidth: piece.effectiveWidth
        }]
      }

      strips.push(strip)
      currentY = strip.y + strip.width
      remainingWidth = board.width - currentY
      placedPieceIds.add(piece.uniqueId)
    } else if (piece.effectiveLength + (strips.length > 0 ? kerf : 0) <= remainingWidth && piece.effectiveWidth <= board.length) {
      // Try rotated
      const strip = {
        y: currentY + (strips.length > 0 ? kerf : 0),
        width: piece.effectiveLength,
        length: board.length,
        pieces: [{
          ...piece,
          x: 0,
          y: currentY + (strips.length > 0 ? kerf : 0),
          placedLength: piece.effectiveWidth,
          placedWidth: piece.effectiveLength,
          rotated: true
        }]
      }

      strips.push(strip)
      currentY = strip.y + strip.width
      remainingWidth = board.width - currentY
      placedPieceIds.add(piece.uniqueId)
    }
  }

  // Collect unplaced pieces
  for (const piece of sortedPieces) {
    if (!placedPieceIds.has(piece.uniqueId)) {
      unplacedPieces.push(piece)
    }
  }

  return { strips, unplacedPieces, placedPieceIds }
}

/**
 * Flatten strips into individual cut placements
 *
 * Coordinate system for SVG display:
 * - x: horizontal position (along the board's LENGTH)
 * - y: vertical position (along the board's WIDTH)
 * - length: horizontal dimension
 * - width: vertical dimension
 */
function flattenStrips(strips) {
  const cuts = []
  for (const strip of strips) {
    for (const piece of strip.pieces) {
      cuts.push({
        cutPieceId: piece.originalId,
        cutPieceName: piece.name,
        cutPieceIndex: piece.instanceIndex,
        x: piece.x,           // Position along length (horizontal in SVG)
        y: piece.y,           // Position along width (vertical in SVG)
        length: piece.placedLength,  // Horizontal dimension
        width: piece.placedWidth,    // Vertical dimension
        rotated: piece.rotated || false
      })
    }
  }
  return cuts
}

/**
 * Main optimization function
 */
export function optimizeCuts(stockBoards, cutPieces, kerf = DEFAULT_KERF) {
  const warnings = []
  const assignments = []

  // Group stock boards by thickness
  const stockByThickness = {}
  expandStockBoards(stockBoards).forEach(board => {
    if (!stockByThickness[board.thickness]) {
      stockByThickness[board.thickness] = []
    }
    stockByThickness[board.thickness].push({
      ...board,
      used: false
    })
  })

  // Expand cut pieces and group by thickness
  const expandedCuts = expandCutPieces(cutPieces)
  const cutsByThickness = {}
  expandedCuts.forEach(piece => {
    if (!cutsByThickness[piece.thickness]) {
      cutsByThickness[piece.thickness] = []
    }
    // Add effective dimensions (allowing for rotation consideration)
    cutsByThickness[piece.thickness].push({
      ...piece,
      effectiveWidth: piece.width,
      effectiveLength: piece.length
    })
  })

  // Track all unplaced pieces
  let allUnplacedPieces = []

  // Process each thickness
  for (const thickness in cutsByThickness) {
    const piecesForThickness = cutsByThickness[thickness]
    const availableStock = stockByThickness[thickness] || []

    if (availableStock.length === 0) {
      warnings.push(`No stock boards with thickness ${thickness} available`)
      allUnplacedPieces = allUnplacedPieces.concat(piecesForThickness)
      continue
    }

    // Sort pieces by area (largest first) for better packing
    piecesForThickness.sort((a, b) => (b.length * b.width) - (a.length * a.width))

    let remainingPieces = [...piecesForThickness]

    // Try to fit pieces on each available board
    for (const board of availableStock) {
      if (remainingPieces.length === 0) break

      const { strips, unplacedPieces, placedPieceIds } = createStripsForBoard(board, remainingPieces, kerf)

      if (strips.length > 0 && strips.some(s => s.pieces.length > 0)) {
        board.used = true

        const cuts = flattenStrips(strips)
        const boardArea = board.length * board.width
        const cutsArea = cuts.reduce((sum, cut) => sum + (cut.length * cut.width), 0)

        assignments.push({
          stockBoardId: board.originalId,
          stockBoardName: board.name,
          stockBoardIndex: board.instanceIndex,
          uniqueId: board.uniqueId,
          thickness: board.thickness,
          length: board.length,
          width: board.width,
          cuts,
          strips, // Include strip info for visualization
          boardArea,
          cutsArea
        })

        remainingPieces = unplacedPieces
      }
    }

    // Any remaining pieces couldn't be placed
    if (remainingPieces.length > 0) {
      remainingPieces.forEach(p => {
        warnings.push(`Could not fit "${p.name}" (${p.length}" × ${p.width}") on any ${thickness} stock`)
      })
      allUnplacedPieces = allUnplacedPieces.concat(remainingPieces)
    }
  }

  // Calculate totals
  let totalStockUsed = 0
  let totalCutArea = 0

  assignments.forEach(a => {
    totalStockUsed += a.boardArea
    totalCutArea += a.cutsArea
  })

  const thicknessInches = stockBoards.length > 0
    ? parseThickness(stockBoards[0].thickness) || 1
    : 1

  const totalStockBF = (totalStockUsed * thicknessInches) / 144
  const totalCutBF = (totalCutArea * thicknessInches) / 144
  const waste = totalStockBF - totalCutBF
  const efficiency = totalStockUsed > 0 ? (totalCutArea / totalStockUsed) * 100 : 0

  // Count boards
  const boardsUsed = assignments.length
  const totalStockBoards = Object.values(stockByThickness).flat().length

  return {
    assignments,
    waste: Math.max(0, waste),
    efficiency: Math.min(100, efficiency),
    warnings,
    unplacedPieces: allUnplacedPieces,
    boardsUsed,
    totalStockBoards,
    generatedAt: new Date().toISOString()
  }
}

/**
 * Calculate total board feet needed for cut pieces
 */
export function calculateCutPiecesBF(cutPieces) {
  return cutPieces.reduce((sum, piece) => {
    const thickness = parseThickness(piece.thickness) || 1
    const qty = piece.quantity || 1
    return sum + (piece.length * piece.width * thickness * qty) / 144
  }, 0)
}

/**
 * Get unique thicknesses from stock boards
 */
export function getStockThicknesses(boards) {
  const thicknesses = new Set(boards.map(b => b.thickness))
  return Array.from(thicknesses)
}


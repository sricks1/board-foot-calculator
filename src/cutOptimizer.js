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
 * Try to fit pieces into strips on a board using 2D bin packing
 *
 * Uses a shelf-based approach where we track rectangular free spaces
 * and can place narrow pieces alongside wide pieces on the same "row"
 */
function createStripsForBoard(board, pieces, kerf) {
  const placedPieceIds = new Set()
  const placements = []

  // Sort pieces by width (widest first), then by length (longest first)
  // This ensures we establish wide strips first, then fill in with narrow pieces
  const sortedPieces = [...pieces].sort((a, b) => {
    const widthDiff = b.effectiveWidth - a.effectiveWidth
    if (Math.abs(widthDiff) > 0.01) return widthDiff
    return b.effectiveLength - a.effectiveLength
  })

  // Track free rectangles: { x, y, width, height }
  // width = along board length (horizontal), height = along board width (vertical)
  let freeRects = [{ x: 0, y: 0, width: board.length, height: board.width }]

  // Helper: find best fit for a piece (minimize wasted space)
  // Kerf is accounted for:
  // 1. At board edges (rough lumber needs jointing/ripping to get clean edge)
  // 2. In splitRect when dividing remaining space between pieces
  const findBestFit = (pieceLength, pieceWidth) => {
    let bestRect = null
    let bestRotated = false
    let bestScore = Infinity

    for (const rect of freeRects) {
      // Calculate usable space in this rect
      // If rect is at a board edge (x=0 or y=0), we need kerf for jointing
      const needsLengthEdgeKerf = rect.x < 0.001 // At left edge of board
      const needsWidthEdgeKerf = rect.y < 0.001  // At bottom edge of board

      const usableWidth = rect.width - (needsLengthEdgeKerf ? kerf : 0)
      const usableHeight = rect.height - (needsWidthEdgeKerf ? kerf : 0)

      // Try normal orientation: piece length along rect width, piece width along rect height
      if (pieceLength <= usableWidth + 0.001 && pieceWidth <= usableHeight + 0.001) {
        // Score: prefer smaller rects (less leftover space)
        const score = (usableWidth - pieceLength) + (usableHeight - pieceWidth)
        if (score < bestScore) {
          bestScore = score
          bestRect = rect
          bestRotated = false
        }
      }

      // Try rotated: piece width along rect width, piece length along rect height
      if (pieceWidth <= usableWidth + 0.001 && pieceLength <= usableHeight + 0.001) {
        const score = (usableWidth - pieceWidth) + (usableHeight - pieceLength)
        if (score < bestScore) {
          bestScore = score
          bestRect = rect
          bestRotated = true
        }
      }
    }

    return bestRect ? { rect: bestRect, rotated: bestRotated } : null
  }

  // Helper: split a rectangle after placing a piece (guillotine split)
  const splitRect = (rect, placedWidth, placedHeight) => {
    const newRects = []

    // Right remainder (to the right of the placed piece)
    const rightWidth = rect.width - placedWidth - kerf
    if (rightWidth > 1) { // At least 1" useful
      newRects.push({
        x: rect.x + placedWidth + kerf,
        y: rect.y,
        width: rightWidth,
        height: rect.height
      })
    }

    // Top remainder (above the placed piece, but only as wide as the piece)
    const topHeight = rect.height - placedHeight - kerf
    if (topHeight > 1) { // At least 1" useful
      newRects.push({
        x: rect.x,
        y: rect.y + placedHeight + kerf,
        width: placedWidth, // Only as wide as the placed piece
        height: topHeight
      })
    }

    return newRects
  }

  // Helper: merge adjacent free rectangles where possible
  const mergeRects = () => {
    // Simple merge: combine rects that share an edge and have same dimension
    let merged = true
    while (merged) {
      merged = false
      for (let i = 0; i < freeRects.length && !merged; i++) {
        for (let j = i + 1; j < freeRects.length && !merged; j++) {
          const a = freeRects[i]
          const b = freeRects[j]

          // Same y and height, adjacent in x
          if (Math.abs(a.y - b.y) < 0.01 && Math.abs(a.height - b.height) < 0.01) {
            if (Math.abs(a.x + a.width - b.x) < 0.01) {
              // a is to the left of b
              a.width += b.width
              freeRects.splice(j, 1)
              merged = true
            } else if (Math.abs(b.x + b.width - a.x) < 0.01) {
              // b is to the left of a
              a.x = b.x
              a.width += b.width
              freeRects.splice(j, 1)
              merged = true
            }
          }

          // Same x and width, adjacent in y
          if (Math.abs(a.x - b.x) < 0.01 && Math.abs(a.width - b.width) < 0.01) {
            if (Math.abs(a.y + a.height - b.y) < 0.01) {
              // a is below b
              a.height += b.height
              freeRects.splice(j, 1)
              merged = true
            } else if (Math.abs(b.y + b.height - a.y) < 0.01) {
              // b is below a
              a.y = b.y
              a.height += b.height
              freeRects.splice(j, 1)
              merged = true
            }
          }
        }
      }
    }
  }

  // Place pieces
  for (const piece of sortedPieces) {
    if (placedPieceIds.has(piece.uniqueId)) continue

    const pl = piece.effectiveLength
    const pw = piece.effectiveWidth

    const fit = findBestFit(pl, pw)
    if (fit) {
      const { rect, rotated } = fit
      const placedLength = rotated ? pw : pl
      const placedWidth = rotated ? pl : pw

      // Calculate offset for edge kerf (jointing rough edges)
      const needsLengthEdgeKerf = rect.x < 0.001
      const needsWidthEdgeKerf = rect.y < 0.001
      const xOffset = needsLengthEdgeKerf ? kerf : 0
      const yOffset = needsWidthEdgeKerf ? kerf : 0

      placements.push({
        ...piece,
        x: rect.x + xOffset,
        y: rect.y + yOffset,
        placedLength,
        placedWidth,
        rotated
      })

      placedPieceIds.add(piece.uniqueId)

      // Remove used rect and add new free rects
      // Account for edge kerf in what we consumed from the rect
      freeRects = freeRects.filter(r => r !== rect)
      const consumedLength = placedLength + xOffset
      const consumedWidth = placedWidth + yOffset
      const newRects = splitRect(rect, consumedLength, consumedWidth)
      freeRects.push(...newRects)

      // Sort rects by position (top-left first) for consistent placement
      freeRects.sort((a, b) => {
        if (Math.abs(a.y - b.y) > 0.01) return a.y - b.y
        return a.x - b.x
      })

      // Merge adjacent rects
      mergeRects()
    }
  }

  // Convert to output format (group by y position for strip visualization)
  const outputStrips = []
  const stripsByY = new Map()

  for (const p of placements) {
    const key = p.y.toFixed(3)
    if (!stripsByY.has(key)) {
      stripsByY.set(key, {
        y: p.y,
        width: p.placedWidth,
        length: board.length,
        pieces: []
      })
    }
    const strip = stripsByY.get(key)
    strip.width = Math.max(strip.width, p.placedWidth)
    strip.pieces.push(p)
  }

  for (const [, strip] of stripsByY) {
    outputStrips.push(strip)
  }

  outputStrips.sort((a, b) => a.y - b.y)

  const unplacedPieces = sortedPieces.filter(p => !placedPieceIds.has(p.uniqueId))

  return { strips: outputStrips, unplacedPieces, placedPieceIds }
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
 * Create a compound key for thickness + species grouping
 */
function makeGroupKey(thickness, species) {
  return `${thickness}|${species || 'unspecified'}`
}

/**
 * Parse a compound key back into thickness and species
 */
function parseGroupKey(key) {
  const [thickness, species] = key.split('|')
  return { thickness, species: species === 'unspecified' ? null : species }
}

/**
 * Main optimization function
 */
export function optimizeCuts(stockBoards, cutPieces, kerf = DEFAULT_KERF) {
  const warnings = []
  const assignments = []

  // Group stock boards by thickness AND species
  const stockByGroup = {}
  expandStockBoards(stockBoards).forEach(board => {
    const key = makeGroupKey(board.thickness, board.species)
    if (!stockByGroup[key]) {
      stockByGroup[key] = []
    }
    stockByGroup[key].push({
      ...board,
      used: false
    })
  })

  // Expand cut pieces and group by thickness AND species
  const expandedCuts = expandCutPieces(cutPieces)
  const cutsByGroup = {}
  expandedCuts.forEach(piece => {
    const key = makeGroupKey(piece.thickness, piece.species)
    if (!cutsByGroup[key]) {
      cutsByGroup[key] = []
    }
    // Add effective dimensions (allowing for rotation consideration)
    cutsByGroup[key].push({
      ...piece,
      effectiveWidth: piece.width,
      effectiveLength: piece.length
    })
  })

  // Track all unplaced pieces
  let allUnplacedPieces = []

  // Process each thickness+species group
  for (const groupKey in cutsByGroup) {
    const { thickness, species } = parseGroupKey(groupKey)
    const piecesForGroup = cutsByGroup[groupKey]
    const availableStock = stockByGroup[groupKey] || []

    if (availableStock.length === 0) {
      const speciesLabel = species ? ` (${species})` : ''
      warnings.push(`No stock boards with thickness ${thickness}${speciesLabel} available`)
      allUnplacedPieces = allUnplacedPieces.concat(piecesForGroup)
      continue
    }

    // Sort pieces by area (largest first) for better packing
    piecesForGroup.sort((a, b) => (b.length * b.width) - (a.length * a.width))

    let remainingPieces = [...piecesForGroup]

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
          species: board.species,
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
      const speciesLabel = species ? ` (${species})` : ''
      remainingPieces.forEach(p => {
        warnings.push(`Could not fit "${p.name}" (${p.length}" × ${p.width}") on any ${thickness}${speciesLabel} stock`)
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
  const totalStockBoards = Object.values(stockByGroup).flat().length

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

/**
 * Get unique thicknesses from cut pieces
 */
export function getCutPieceThicknesses(pieces) {
  const thicknesses = new Set(pieces.map(p => p.thickness))
  return Array.from(thicknesses)
}

/**
 * Calculate how many stock boards are needed to fit all cut pieces
 * Supports multiple board templates for optimal material usage
 * Groups by both thickness AND species
 *
 * @param {Array} cutPieces - Array of cut pieces needed
 * @param {Array} stockTemplates - Array of templates { length, width, thickness, species, name }
 * @param {number} kerf - Saw blade kerf (default 1/8")
 * @returns {Object} - { boardsNeeded, boards, cutPlan, boardsByTemplate }
 */
export function calculateStockNeeded(cutPieces, stockTemplates, kerf = DEFAULT_KERF) {
  if (!cutPieces || cutPieces.length === 0) {
    return { boardsNeeded: 0, boards: [], cutPlan: null, boardsByTemplate: [] }
  }

  // Normalize to array
  const templates = Array.isArray(stockTemplates) ? stockTemplates : [stockTemplates]

  if (templates.length === 0) {
    return { boardsNeeded: 0, boards: [], cutPlan: null, boardsByTemplate: [] }
  }

  // Group templates by thickness + species
  const templatesByGroup = {}
  templates.forEach(t => {
    const key = makeGroupKey(t.thickness || '4/4', t.species)
    if (!templatesByGroup[key]) {
      templatesByGroup[key] = []
    }
    templatesByGroup[key].push(t)
  })

  // Group cut pieces by thickness + species
  const piecesByGroup = {}
  cutPieces.forEach(piece => {
    const key = makeGroupKey(piece.thickness || '4/4', piece.species)
    if (!piecesByGroup[key]) {
      piecesByGroup[key] = []
    }
    piecesByGroup[key].push(piece)
  })

  // Calculate stock needed for each thickness+species group separately
  const allBoards = []
  const allBoardsByTemplate = []
  let boardIdCounter = Date.now()

  for (const groupKey in piecesByGroup) {
    const { thickness, species } = parseGroupKey(groupKey)
    const piecesForGroup = piecesByGroup[groupKey]
    const templatesForGroup = templatesByGroup[groupKey] || []

    if (templatesForGroup.length === 0) {
      // No templates for this group - will show as warning in the cut plan
      continue
    }

    // Calculate for this group
    let result
    if (templatesForGroup.length === 1) {
      result = calculateStockForSingleTemplate(piecesForGroup, templatesForGroup[0], kerf)
    } else {
      result = calculateStockForMultipleTemplates(piecesForGroup, templatesForGroup, kerf)
    }

    if (result && result.boards) {
      // Add unique IDs and species to boards
      result.boards.forEach(board => {
        board.id = boardIdCounter++
        board.species = species // Ensure species is set
        allBoards.push(board)
      })

      if (result.boardsByTemplate) {
        allBoardsByTemplate.push(...result.boardsByTemplate)
      }
    }
  }

  // Generate final cut plan with all boards
  const finalCutPlan = optimizeCuts(allBoards, cutPieces, kerf)

  return {
    boardsNeeded: allBoards.length,
    boards: allBoards,
    cutPlan: finalCutPlan,
    boardsByTemplate: allBoardsByTemplate
  }
}

/**
 * Calculate stock for multiple templates of the same thickness
 */
function calculateStockForMultipleTemplates(cutPieces, templates, kerf) {
  const templateThickness = parseThickness(templates[0].thickness) || 1

  // Calculate estimated boards needed
  const totalCutBF = calculateCutPiecesBF(cutPieces)
  const avgTemplateBF = templates.reduce((sum, t) => {
    return sum + (t.length * t.width * templateThickness) / 144
  }, 0) / templates.length
  const estimatedBoards = Math.max(1, Math.ceil((totalCutBF * 1.3) / avgTemplateBF))

  // Find minimum boards needed by testing incrementally
  for (let totalBoards = 1; totalBoards <= estimatedBoards * 3; totalBoards++) {
    const result = tryBoardDistribution(cutPieces, templates, totalBoards, kerf)
    if (result) {
      return result
    }
  }

  // Fallback: use first template only
  return calculateStockForSingleTemplate(cutPieces, templates[0], kerf)
}

/**
 * Try different distributions of boards across templates for a given total
 */
function tryBoardDistribution(cutPieces, templates, totalBoards, kerf) {
  // Generate all possible distributions of totalBoards across templates
  const distributions = generateDistributions(templates.length, totalBoards)

  let bestResult = null
  let bestEfficiency = 0

  for (const dist of distributions) {
    // Build test boards array
    const testBoards = []
    const boardsByTemplate = []
    let boardId = Date.now()

    templates.forEach((template, idx) => {
      const count = dist[idx]
      boardsByTemplate.push({ template, count })

      const thicknessInches = parseThickness(template.thickness) || 1
      const bf = (template.length * template.width * thicknessInches) / 144
      for (let i = 0; i < count; i++) {
        testBoards.push({
          id: boardId++,
          name: `${template.name || 'Board'} ${i + 1}`,
          length: template.length,
          width: template.width,
          thickness: template.thickness,
          thicknessInches: thicknessInches,
          species: template.species,
          quantity: 1,
          boardFeet: bf,
          templateIndex: idx
        })
      }
    })

    if (testBoards.length === 0) continue

    // Test this distribution
    const cutPlan = optimizeCuts(testBoards, cutPieces, kerf)

    if (cutPlan.unplacedPieces.length === 0) {
      // All pieces fit - check if this is better than previous results
      if (cutPlan.efficiency > bestEfficiency) {
        bestEfficiency = cutPlan.efficiency
        bestResult = {
          boardsNeeded: testBoards.length,
          boards: testBoards,
          cutPlan,
          boardsByTemplate: boardsByTemplate.filter(b => b.count > 0)
        }
      }
    }
  }

  return bestResult
}

/**
 * Generate all distributions of n items across k buckets
 */
function generateDistributions(numTemplates, total) {
  const results = []

  function generate(remaining, buckets, index) {
    if (index === numTemplates - 1) {
      buckets[index] = remaining
      results.push([...buckets])
      return
    }

    for (let i = 0; i <= remaining; i++) {
      buckets[index] = i
      generate(remaining - i, buckets, index + 1)
    }
  }

  generate(total, new Array(numTemplates).fill(0), 0)
  return results
}

/**
 * Helper function for single template calculation
 */
function calculateStockForSingleTemplate(cutPieces, stockTemplate, kerf) {
  if (!cutPieces || cutPieces.length === 0) {
    return { boardsNeeded: 0, boards: [], cutPlan: null }
  }

  const totalCutBF = calculateCutPiecesBF(cutPieces)
  const templateThickness = parseThickness(stockTemplate.thickness) || 1
  const templateBF = (stockTemplate.length * stockTemplate.width * templateThickness) / 144
  const estimatedBoards = Math.max(1, Math.ceil((totalCutBF * 1.2) / templateBF))

  let low = 1
  let high = Math.max(estimatedBoards * 2, 10)
  let result = null

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)

    const testBoards = []
    for (let i = 0; i < mid; i++) {
      testBoards.push({
        id: Date.now() + i,
        name: `${stockTemplate.name || 'Board'} ${i + 1}`,
        length: stockTemplate.length,
        width: stockTemplate.width,
        thickness: stockTemplate.thickness,
        thicknessInches: templateThickness,
        species: stockTemplate.species,
        quantity: 1,
        boardFeet: templateBF
      })
    }

    const cutPlan = optimizeCuts(testBoards, cutPieces, kerf)

    if (cutPlan.unplacedPieces.length === 0) {
      result = {
        boardsNeeded: mid,
        boards: testBoards,
        cutPlan,
        boardsByTemplate: [{ template: stockTemplate, count: mid }]
      }
      high = mid - 1
    } else {
      low = mid + 1
    }
  }

  if (!result) {
    const testBoards = []
    for (let i = 0; i < high + 1; i++) {
      testBoards.push({
        id: Date.now() + i,
        name: `${stockTemplate.name || 'Board'} ${i + 1}`,
        length: stockTemplate.length,
        width: stockTemplate.width,
        thickness: stockTemplate.thickness,
        thicknessInches: templateThickness,
        species: stockTemplate.species,
        quantity: 1,
        boardFeet: templateBF
      })
    }
    const cutPlan = optimizeCuts(testBoards, cutPieces, kerf)
    result = {
      boardsNeeded: high + 1,
      boards: testBoards,
      cutPlan,
      boardsByTemplate: [{ template: stockTemplate, count: high + 1 }]
    }
  }

  return result
}


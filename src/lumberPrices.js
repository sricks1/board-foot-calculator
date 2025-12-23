/**
 * Lumber Price Database
 * Prices from Capital Hardwood and Supply, Madison WI
 * https://capitalhardwood.com/pages/in-store-price-list
 *
 * NOTE: These prices are estimates and subject to change.
 * Contact your supplier for actual costs.
 */

// Prices per board foot by species and thickness
// Thickness keys: '4/4', '5/4', '6/4', '8/4'
export const lumberPrices = {
  // Domestic Hardwoods
  'Alder - Knotty': { '4/4': 4.95, category: 'Domestic', grade: 'Premium Knotty' },
  'Ash - White': { '4/4': 4.95, '8/4': 5.95, category: 'Domestic', grade: 'Select & Better' },
  'Basswood': { '4/4': 3.95, '8/4': 4.95, category: 'Domestic', grade: 'Select & Better' },
  'Beech': { '4/4': 4.95, category: 'Domestic', grade: 'Select & Better' },
  'Birch - Yellow': { '4/4': 5.45, category: 'Domestic', grade: 'Select & Better' },
  'Butternut': { '4/4': 12.95, category: 'Domestic', grade: 'Select & Better' },
  'Catalpa': { '4/4': 4.95, category: 'Domestic', grade: 'Select & Better' },
  'Cedar - Aromatic': { '4/4': 5.95, category: 'Domestic', grade: '#1 Com & Better' },
  'Cedar - Western Red': { '4/4': 7.95, category: 'Domestic', grade: 'Select Tight Knot' },
  'Cherry': { '4/4': 5.95, '6/4': 6.45, '8/4': 6.95, category: 'Domestic', grade: 'FAS/F1F/S&B' },
  'Cherry - Select': { '4/4': 4.45, category: 'Domestic', grade: 'Select 90/70' },
  'Douglas Fir': { '4/4': 14.95, category: 'Domestic', grade: 'Clear Vertical Grain' },
  'Hickory - Calico': { '4/4': 5.95, '8/4': 6.95, category: 'Domestic', grade: 'Select & Better' },
  'Hickory - Heart': { '4/4': 6.45, '6/4': 6.45, category: 'Domestic', grade: 'Select & Better 90/70' },
  'Maple - Ambrosia': { '4/4': 7.95, category: 'Domestic', grade: 'Select & Better' },
  'Maple - Birds Eye': { '4/4': 9.95, category: 'Domestic', grade: 'Select & Better' },
  'Maple - Curly': { '4/4': 8.95, category: 'Domestic', grade: 'Select & Better' },
  'Maple - Hard': { '4/4': 5.95, '6/4': 5.95, '8/4': 6.95, '10/4': 7.95, category: 'Domestic', grade: 'Select & Better' },
  'Maple - Soft': { '4/4': 4.95, category: 'Domestic', grade: 'Select & Better' },
  'Oak - Red': { '4/4': 4.95, '8/4': 5.95, category: 'Domestic', grade: 'FAS/S&B' },
  'Oak - Red QS': { '4/4': 6.95, category: 'Domestic', grade: 'Select & Better' },
  'Oak - Red Rift': { '4/4': 6.95, category: 'Domestic', grade: 'Select & Better' },
  'Oak - White': { '4/4': 10.95, '6/4': 11.95, '8/4': 14.95, category: 'Domestic', grade: 'Select & Better' },
  'Oak - White QS': { '4/4': 12.95, category: 'Domestic', grade: 'Select & Better' },
  'Oak - White Rift': { '4/4': 16.95, category: 'Domestic', grade: 'Select & Better' },
  'Poplar': { '4/4': 3.95, '8/4': 4.45, category: 'Domestic', grade: 'Select & Better' },
  'Sycamore - QS': { '5/4': 7.95, category: 'Domestic', grade: 'Select & Better' },
  'Walnut - Natural': { '4/4': 9.95, category: 'Domestic', grade: 'Select & Better' },
  'Walnut': { '4/4': 10.95, '6/4': 13.45, '8/4': 15.95, category: 'Domestic', grade: 'Select & Better' },
  'Walnut - Prime': { '4/4': 12.95, '6/4': 15.95, category: 'Domestic', grade: 'F1F & Better - Prime' },

  // Exotic Hardwoods
  'Beli': { '4/4': 14.95, category: 'Exotic', grade: 'FEQ' },
  'Black Limba': { '4/4': 11.95, '8/4': 13.95, category: 'Exotic', grade: 'FEQ' },
  'Bloodwood': { '4/4': 10.95, category: 'Exotic', grade: 'FEQ' },
  'Canarywood': { '4/4': 14.95, category: 'Exotic', grade: 'FEQ' },
  'Ebiara': { '4/4': 9.95, category: 'Exotic', grade: 'FEQ' },
  'Iroko': { '4/4': 12.95, '8/4': 13.95, category: 'Exotic', grade: 'FEQ' },
  'Jatoba': { '4/4': 11.95, category: 'Exotic', grade: 'FEQ' },
  'Leopardwood': { '4/4': 18.95, category: 'Exotic', grade: 'FEQ' },
  'Mahogany - African': { '4/4': 9.95, '8/4': 10.95, category: 'Exotic', grade: 'FEQ' },
  'Olivewood': { '4/4': 23.95, '8/4': 24.95, category: 'Exotic', grade: 'FEQ' },
  'Osage Orange': { '4/4': 15.95, category: 'Exotic', grade: 'FEQ' },
  'Padauk': { '4/4': 10.95, category: 'Exotic', grade: 'FEQ' },
  'Peruvian Walnut': { '4/4': 11.95, category: 'Exotic', grade: 'FEQ' },
  'Purple Heart': { '4/4': 13.95, category: 'Exotic', grade: 'FEQ' },
  'Sapele - QS': { '4/4': 9.95, '8/4': 12.95, category: 'Exotic', grade: 'FEQ' },
  'Spanish Cedar': { '8/4': 9.95, category: 'Exotic', grade: 'FEQ' },
  'Wenge': { '4/4': 22.95, category: 'Exotic', grade: 'FEQ' },
  'Wenge - Shorts': { '4/4': 17.95, category: 'Exotic', grade: 'FEQ' },
}

// Sheet goods prices (per sheet, not per BF)
export const sheetGoodsPrices = {
  'Baltic Birch 5x5': { '1/2': 39.95, '5/8': 54.95, '3/4': 69.95, '7/8': 89.95, '1': 114.95, grade: 'B/BB' },
  'Baltic Birch 4x8': { '1/2': 69.95, '3/4': 108.95, '7/8': 119.95, '1': 129.95, grade: 'BB/BB' },
  'Bending Ply 4x8': { '1/2': 69.95, grade: 'Column Bend' },
  'Birch SpartanPly 4x8': { '3/4': 99.95, grade: 'B2' },
  'Hex Plywood 4x8': { '3/4': 149.95 },
  'Pre-Finished Birch 4x8': { '1/2': 43.95, '3/4': 74.95, '1': 84.95, grade: 'C2, PR FIN' },
  'Pre-Finished Maple 4x8': { '1/2': 69.95, '1': 129.95, grade: 'C2, PR FIN' },
  'Maple 4x8': { '1/4': 69.95, '1/2': 145.95, '3/4': 119.95, grade: 'B4/A1/B1' },
  'Red Oak 4x8': { '1/4': 91.95, '3/4': 159.95, grade: 'A1/A4' },
  'Walnut 4x8 - A1': { '1/4': 164.95, '3/4': 239.95, grade: 'A1' },
  'Walnut 4x8 - B4': { '1/4': 114.95, grade: 'B4' },
  'White Oak Rift 4x8': { '3/4': 249.95, grade: 'A1' },
  'White Oak 4x8': { '1/4': 139.95, '3/4': 229.95, grade: 'A1/A4' },
  'Cherry 4x8 - A1': { '1/4': 144.95, '1/2': 169.95, '3/4': 189.95, grade: 'A1' },
  'Cherry 4x8 - A4': { '1/4': 129.95, grade: 'A4' },
  'MDF 4x8': { '1/2': 34.95, '3/4': 49.95, '1': 69.95, grade: 'Ultra-Light' },
}

/**
 * Get price per board foot for a species and thickness
 * @param {string} species - The wood species
 * @param {string} thickness - Thickness in lumber notation (e.g., '4/4', '8/4')
 * @returns {number|null} Price per board foot, or null if not found
 */
export function getPricePerBF(species, thickness) {
  // Direct match
  if (lumberPrices[species] && lumberPrices[species][thickness]) {
    return lumberPrices[species][thickness]
  }

  // Try to find a partial match (e.g., "Cherry" matches "Cherry" or "Cherry - Select")
  const speciesLower = species.toLowerCase()
  for (const [key, prices] of Object.entries(lumberPrices)) {
    if (key.toLowerCase().includes(speciesLower) || speciesLower.includes(key.toLowerCase())) {
      if (prices[thickness]) {
        return prices[thickness]
      }
    }
  }

  // If exact thickness not found, try to find closest available thickness
  const speciesData = lumberPrices[species]
  if (speciesData) {
    // Parse requested thickness to quarters
    const requestedQuarters = parseThicknessToQuarters(thickness)
    if (requestedQuarters) {
      let closestThickness = null
      let closestDiff = Infinity

      for (const t of Object.keys(speciesData)) {
        if (t === 'category' || t === 'grade') continue
        const quarters = parseThicknessToQuarters(t)
        if (quarters) {
          const diff = Math.abs(quarters - requestedQuarters)
          if (diff < closestDiff) {
            closestDiff = diff
            closestThickness = t
          }
        }
      }

      if (closestThickness) {
        return speciesData[closestThickness]
      }
    }
  }

  return null
}

/**
 * Parse thickness notation to quarters of an inch
 * @param {string} thickness - e.g., '4/4', '6/4', '8/4'
 * @returns {number|null} Number of quarters
 */
function parseThicknessToQuarters(thickness) {
  const match = thickness.match(/^(\d+)\/4$/)
  if (match) {
    return parseInt(match[1])
  }
  return null
}

/**
 * Get all available species for selection
 * @returns {Array} Array of { name, category, grade } objects
 */
export function getAvailableSpecies() {
  return Object.entries(lumberPrices).map(([name, data]) => ({
    name,
    category: data.category,
    grade: data.grade,
    thicknesses: Object.keys(data).filter(k => k !== 'category' && k !== 'grade')
  })).sort((a, b) => {
    // Sort by category first (Domestic before Exotic), then by name
    if (a.category !== b.category) {
      return a.category === 'Domestic' ? -1 : 1
    }
    return a.name.localeCompare(b.name)
  })
}

/**
 * Calculate estimated cost for a board
 * @param {number} boardFeet - Total board feet
 * @param {string} species - Wood species
 * @param {string} thickness - Thickness notation
 * @returns {{ cost: number|null, pricePerBF: number|null, found: boolean }}
 */
export function calculateBoardCost(boardFeet, species, thickness) {
  const pricePerBF = getPricePerBF(species, thickness)
  if (pricePerBF !== null) {
    return {
      cost: boardFeet * pricePerBF,
      pricePerBF,
      found: true
    }
  }
  return { cost: null, pricePerBF: null, found: false }
}

/**
 * Calculate total estimated cost for multiple boards
 * @param {Array} boards - Array of { boardFeet, species, thickness }
 * @returns {{ totalCost: number, itemizedCosts: Array, missingPrices: Array }}
 */
export function calculateTotalCost(boards) {
  let totalCost = 0
  const itemizedCosts = []
  const missingPrices = []

  for (const board of boards) {
    const result = calculateBoardCost(board.boardFeet, board.species, board.thickness)
    if (result.found) {
      totalCost += result.cost
      itemizedCosts.push({
        ...board,
        cost: result.cost,
        pricePerBF: result.pricePerBF
      })
    } else {
      missingPrices.push({
        species: board.species,
        thickness: board.thickness
      })
    }
  }

  return { totalCost, itemizedCosts, missingPrices }
}

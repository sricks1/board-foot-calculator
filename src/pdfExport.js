import { jsPDF } from 'jspdf'

// Brand colors
const COLORS = {
  slateBlue: [50, 65, 104],
  craftsmanOrange: [224, 104, 41],
  skyBlue: [175, 207, 228],
  deepNavy: [10, 17, 42],
  charcoal: [44, 44, 44],
  workshopCream: [245, 241, 232],
  white: [255, 255, 255]
}

// Cut piece colors for diagram
const CUT_COLORS = [
  [224, 104, 41],  // Craftsman Orange
  [50, 65, 104],   // Slate Blue
  [175, 207, 228], // Sky Blue
  [139, 90, 43],   // Brown
  [107, 142, 35],  // Olive
  [205, 133, 63],  // Peru
  [70, 130, 180],  // Steel Blue
  [210, 105, 30],  // Chocolate
  [112, 128, 144], // Slate Gray
  [188, 143, 143]  // Rosy Brown
]

/**
 * Parse lumber notation to inches
 */
function parseThickness(notation) {
  const match = notation.match(/^(\d+)\/(\d+)$/)
  if (match) {
    return parseInt(match[1]) / parseInt(match[2])
  }
  const num = parseFloat(notation)
  return isNaN(num) ? 1 : num
}

/**
 * Calculate board feet
 */
function calculateBoardFeet(thickness, width, length) {
  return (thickness * width * length) / 144
}

/**
 * Export project to PDF
 */
export function exportProjectToPDF(project) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  const contentWidth = pageWidth - (margin * 2)
  let y = margin

  // Helper to add new page if needed
  const checkPageBreak = (neededHeight) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage()
      y = margin
      return true
    }
    return false
  }

  // Title
  doc.setFillColor(...COLORS.deepNavy)
  doc.rect(0, 0, pageWidth, 80, 'F')

  doc.setTextColor(...COLORS.white)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text(project.name, margin, 45)

  if (project.description) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(project.description, margin, 65)
  }

  y = 100

  // Stock Boards Section
  doc.setTextColor(...COLORS.slateBlue)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Stock Boards', margin, y)
  y += 20

  if (project.boards && project.boards.length > 0) {
    // Table header
    doc.setFillColor(...COLORS.skyBlue)
    doc.rect(margin, y, contentWidth, 20, 'F')

    doc.setTextColor(...COLORS.deepNavy)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')

    const stockCols = [margin + 5, margin + 150, margin + 250, margin + 320, margin + 380, margin + 450]
    doc.text('Name', stockCols[0], y + 14)
    doc.text('Dimensions', stockCols[1], y + 14)
    doc.text('Thickness', stockCols[2], y + 14)
    doc.text('Qty', stockCols[3], y + 14)
    doc.text('BF Each', stockCols[4], y + 14)
    doc.text('Total BF', stockCols[5], y + 14)
    y += 20

    // Table rows
    doc.setFont('helvetica', 'normal')
    let totalStockBF = 0
    let totalStockPieces = 0

    project.boards.forEach((board, idx) => {
      checkPageBreak(20)

      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 250)
        doc.rect(margin, y, contentWidth, 18, 'F')
      }

      const qty = board.quantity || 1
      const thicknessInches = parseThickness(board.thickness)
      const bfEach = calculateBoardFeet(thicknessInches, board.width, board.length)
      const totalBF = bfEach * qty
      totalStockBF += totalBF
      totalStockPieces += qty

      doc.setTextColor(...COLORS.charcoal)
      doc.text(board.name || 'Unnamed', stockCols[0], y + 12)
      doc.text(`${board.length}" × ${board.width}"`, stockCols[1], y + 12)
      doc.text(board.thickness, stockCols[2], y + 12)
      doc.text(qty.toString(), stockCols[3], y + 12)
      doc.text(bfEach.toFixed(2), stockCols[4], y + 12)
      doc.text(totalBF.toFixed(2), stockCols[5], y + 12)
      y += 18
    })

    // Totals row
    doc.setFillColor(...COLORS.craftsmanOrange)
    doc.rect(margin, y, contentWidth, 22, 'F')
    doc.setTextColor(...COLORS.white)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL', stockCols[0], y + 15)
    doc.text(`${totalStockPieces} pcs`, stockCols[3], y + 15)
    doc.text(`${totalStockBF.toFixed(2)} BF`, stockCols[5], y + 15)
    y += 35
  } else {
    doc.setTextColor(...COLORS.charcoal)
    doc.setFontSize(11)
    doc.text('No stock boards defined.', margin, y + 5)
    y += 25
  }

  // Cut Pieces Section
  checkPageBreak(60)
  doc.setTextColor(...COLORS.slateBlue)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Cut List', margin, y)
  y += 20

  const cutPieces = project.cutPieces || []
  if (cutPieces.length > 0) {
    // Table header
    doc.setFillColor(...COLORS.skyBlue)
    doc.rect(margin, y, contentWidth, 20, 'F')

    doc.setTextColor(...COLORS.deepNavy)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')

    const cutCols = [margin + 5, margin + 150, margin + 280, margin + 350, margin + 420]
    doc.text('Piece Name', cutCols[0], y + 14)
    doc.text('Dimensions', cutCols[1], y + 14)
    doc.text('Thickness', cutCols[2], y + 14)
    doc.text('Quantity', cutCols[3], y + 14)
    doc.text('Board Feet', cutCols[4], y + 14)
    y += 20

    // Table rows
    doc.setFont('helvetica', 'normal')
    let totalCutBF = 0
    let totalCutPieces = 0

    cutPieces.forEach((piece, idx) => {
      checkPageBreak(20)

      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 250)
        doc.rect(margin, y, contentWidth, 18, 'F')
      }

      const qty = piece.quantity || 1
      const thicknessInches = parseThickness(piece.thickness)
      const bf = calculateBoardFeet(thicknessInches, piece.width, piece.length) * qty
      totalCutBF += bf
      totalCutPieces += qty

      doc.setTextColor(...COLORS.charcoal)
      doc.text(piece.name || 'Unnamed', cutCols[0], y + 12)
      doc.text(`${piece.length}" × ${piece.width}"`, cutCols[1], y + 12)
      doc.text(piece.thickness, cutCols[2], y + 12)
      doc.text(qty.toString(), cutCols[3], y + 12)
      doc.text(bf.toFixed(2), cutCols[4], y + 12)
      y += 18
    })

    // Totals row
    doc.setFillColor(...COLORS.craftsmanOrange)
    doc.rect(margin, y, contentWidth, 22, 'F')
    doc.setTextColor(...COLORS.white)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL', cutCols[0], y + 15)
    doc.text(`${totalCutPieces} pcs`, cutCols[3], y + 15)
    doc.text(`${totalCutBF.toFixed(2)} BF`, cutCols[4], y + 15)
    y += 35
  } else {
    doc.setTextColor(...COLORS.charcoal)
    doc.setFontSize(11)
    doc.text('No cut pieces defined.', margin, y + 5)
    y += 25
  }

  // Cut Plan Section
  const cutPlan = project.cutPlan
  if (cutPlan && cutPlan.assignments && cutPlan.assignments.length > 0) {
    checkPageBreak(80)

    doc.setTextColor(...COLORS.slateBlue)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Cut Plan', margin, y)
    y += 25

    // Stats bar
    doc.setFillColor(...COLORS.deepNavy)
    doc.rect(margin, y, contentWidth, 35, 'F')

    const statWidth = contentWidth / 3
    doc.setTextColor(...COLORS.white)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')

    doc.text(`${cutPlan.efficiency.toFixed(1)}%`, margin + statWidth * 0.5, y + 15, { align: 'center' })
    doc.text(`${cutPlan.waste.toFixed(2)} BF`, margin + statWidth * 1.5, y + 15, { align: 'center' })
    doc.text(`${cutPlan.boardsUsed}/${cutPlan.totalStockBoards}`, margin + statWidth * 2.5, y + 15, { align: 'center' })

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('EFFICIENCY', margin + statWidth * 0.5, y + 28, { align: 'center' })
    doc.text('WASTE', margin + statWidth * 1.5, y + 28, { align: 'center' })
    doc.text('BOARDS USED', margin + statWidth * 2.5, y + 28, { align: 'center' })
    y += 50

    // Warnings
    if (cutPlan.warnings && cutPlan.warnings.length > 0) {
      cutPlan.warnings.forEach(warning => {
        checkPageBreak(25)
        doc.setFillColor(255, 243, 205)
        doc.rect(margin, y, contentWidth, 20, 'F')
        doc.setDrawColor(255, 193, 7)
        doc.rect(margin, y, contentWidth, 20, 'S')
        doc.setTextColor(133, 100, 4)
        doc.setFontSize(9)
        doc.text(warning, margin + 10, y + 13)
        y += 25
      })
    }

    // Draw each board with cuts
    cutPlan.assignments.forEach((assignment, boardIdx) => {
      // Calculate scale to fit board diagram
      const maxDiagramWidth = contentWidth
      const maxDiagramHeight = 150
      const scaleX = maxDiagramWidth / assignment.length
      const scaleY = maxDiagramHeight / assignment.width
      const scale = Math.min(scaleX, scaleY, 4) // Max 4 pixels per inch

      const diagramWidth = assignment.length * scale
      const diagramHeight = assignment.width * scale

      checkPageBreak(diagramHeight + 50)

      // Board label
      doc.setTextColor(...COLORS.deepNavy)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      let boardLabel = assignment.stockBoardName
      if (assignment.stockBoardIndex > 0) {
        boardLabel += ` (#${assignment.stockBoardIndex + 1})`
      }
      doc.text(boardLabel, margin, y + 12)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...COLORS.charcoal)
      doc.text(` - ${assignment.length}" × ${assignment.width}" × ${assignment.thickness}`, margin + doc.getTextWidth(boardLabel), y + 12)
      y += 20

      // Board background
      const diagramX = margin + (contentWidth - diagramWidth) / 2
      doc.setFillColor(...COLORS.workshopCream)
      doc.setDrawColor(...COLORS.charcoal)
      doc.rect(diagramX, y, diagramWidth, diagramHeight, 'FD')

      // Draw cuts
      assignment.cuts.forEach((cut, cutIdx) => {
        const cutX = diagramX + cut.x * scale
        const cutY = y + cut.y * scale
        const cutWidth = cut.length * scale
        const cutHeight = cut.width * scale

        // Cut rectangle
        const color = CUT_COLORS[cutIdx % CUT_COLORS.length]
        doc.setFillColor(...color)
        doc.setDrawColor(...COLORS.deepNavy)
        doc.rect(cutX, cutY, cutWidth, cutHeight, 'FD')

        // Cut label (if it fits)
        if (cutWidth > 30 && cutHeight > 12) {
          doc.setTextColor(...COLORS.white)
          doc.setFontSize(Math.min(9, cutHeight * 0.5))
          doc.setFont('helvetica', 'bold')

          let label = cut.cutPieceName
          if (cut.cutPieceIndex > 0) {
            label += ` #${cut.cutPieceIndex + 1}`
          }

          // Truncate if too long
          const maxLabelWidth = cutWidth - 6
          while (doc.getTextWidth(label) > maxLabelWidth && label.length > 3) {
            label = label.slice(0, -4) + '...'
          }

          doc.text(label, cutX + cutWidth / 2, cutY + cutHeight / 2 + 3, { align: 'center' })
        }
      })

      y += diagramHeight + 20
    })
  }

  // Footer on last page
  const footerY = pageHeight - 25
  doc.setTextColor(...COLORS.charcoal)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, margin, footerY)
  doc.text('Board Foot Calculator', pageWidth - margin, footerY, { align: 'right' })

  // Save the PDF
  const fileName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_cut_plan.pdf`
  doc.save(fileName)
}

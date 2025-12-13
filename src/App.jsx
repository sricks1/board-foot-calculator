import { useState, useEffect } from 'react'
import './App.css'
import { optimizeCuts, calculateCutPiecesBF, getStockThicknesses } from './cutOptimizer'
import { exportProjectToPDF } from './pdfExport'

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
      setQuantity(initialData.quantity || 1)
    } else {
      setName('')
      setLength('')
      setWidth('')
      setThickness('4/4')
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
      quantity: quantityNum,
      boardFeetPerPiece,
      boardFeet: totalBoardFeet
    })

    if (!initialData) {
      setName('')
      setLength('')
      setWidth('')
      setThickness('4/4')
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
function BoardItem({ board, onEdit, onDelete }) {
  const qty = board.quantity || 1
  const perPiece = board.boardFeetPerPiece || board.boardFeet

  return (
    <div className="board-item">
      <div className="board-info">
        <h4>{board.name}</h4>
        <p className="board-dimensions">
          {board.length}" × {board.width}" × {board.thickness}
          {qty > 1 && <span className="board-quantity"> × {qty} pcs</span>}
        </p>
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
function CutPieceForm({ onSubmit, initialData, onCancel, availableThicknesses }) {
  const [name, setName] = useState(initialData?.name || '')
  const [length, setLength] = useState(initialData?.length || '')
  const [width, setWidth] = useState(initialData?.width || '')
  const [thickness, setThickness] = useState(initialData?.thickness || availableThicknesses[0] || '4/4')
  const [quantity, setQuantity] = useState(initialData?.quantity || 1)
  const [error, setError] = useState('')

  const thicknessOptions = availableThicknesses.length > 0
    ? availableThicknesses
    : ['4/4', '5/4', '6/4', '8/4', '10/4', '12/4', '16/4']

  // Update form fields when initialData changes (for editing different pieces)
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setLength(initialData.length || '')
      setWidth(initialData.width || '')
      setThickness(initialData.thickness || availableThicknesses[0] || '4/4')
      setQuantity(initialData.quantity || 1)
    } else {
      setName('')
      setLength('')
      setWidth('')
      setThickness(availableThicknesses[0] || '4/4')
      setQuantity(1)
    }
    setError('')
  }, [initialData, availableThicknesses])

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

      {availableThicknesses.length === 0 && (
        <div className="warning">
          Add stock boards first to define available thicknesses
        </div>
      )}

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
function CutPieceItem({ piece, onEdit, onDelete }) {
  const qty = piece.quantity || 1

  return (
    <div className="cut-piece-item">
      <div className="cut-piece-info">
        <h4>{piece.name}</h4>
        <p className="cut-piece-dimensions">
          {piece.length}" × {piece.width}" × {piece.thickness}
          {qty > 1 && <span className="cut-piece-quantity"> × {qty} pcs</span>}
        </p>
      </div>
      <div className="cut-piece-actions">
        <button onClick={() => onEdit(piece)} className="btn-edit">Edit</button>
        <button onClick={() => onDelete(piece.id)} className="btn-delete">Delete</button>
      </div>
    </div>
  )
}

// Cut Plan Board Visualization
function CutPlanBoard({ assignment, scale }) {
  const boardWidth = assignment.width * scale
  const boardLength = assignment.length * scale

  // Generate colors for cuts
  const colors = [
    '#E06829', '#324168', '#AFCFE4', '#8B5A2B', '#6B8E23',
    '#CD853F', '#4682B4', '#D2691E', '#708090', '#BC8F8F'
  ]

  return (
    <div className="cut-plan-board">
      <div className="cut-plan-board-label">
        {assignment.stockBoardName}
        {assignment.stockBoardIndex > 0 && ` (#${assignment.stockBoardIndex + 1})`}
        <span className="cut-plan-board-dims">
          {assignment.length}" × {assignment.width}" × {assignment.thickness}
        </span>
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
        {assignment.cuts.map((cut, idx) => (
          <g key={idx}>
            <rect
              x={1 + cut.x * scale}
              y={1 + cut.y * scale}
              width={cut.length * scale}
              height={cut.width * scale}
              fill={colors[idx % colors.length]}
              stroke="#0A112A"
              strokeWidth={1}
              opacity={0.85}
            />
            <text
              x={1 + cut.x * scale + (cut.length * scale) / 2}
              y={1 + cut.y * scale + (cut.width * scale) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize={Math.min(12, Math.min(cut.length, cut.width) * scale * 0.4)}
              fontWeight="500"
            >
              {cut.cutPieceName}
              {cut.cutPieceIndex > 0 && ` #${cut.cutPieceIndex + 1}`}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

// Cut Plan Display Component
function CutPlanDisplay({ cutPlan, onRegenerate }) {
  if (!cutPlan) return null

  const scale = 3 // pixels per inch

  return (
    <div className="cut-plan-display">
      <div className="cut-plan-header">
        <h3>Cut Plan</h3>
        <button onClick={onRegenerate} className="btn-secondary">
          Regenerate Plan
        </button>
      </div>

      <div className="cut-plan-stats">
        <div className="cut-plan-stat">
          <span className="stat-value">{cutPlan.efficiency.toFixed(1)}%</span>
          <span className="stat-label">Efficiency</span>
        </div>
        <div className="cut-plan-stat">
          <span className="stat-value">{cutPlan.waste.toFixed(2)}</span>
          <span className="stat-label">Waste (BF)</span>
        </div>
        <div className="cut-plan-stat">
          <span className="stat-value">{cutPlan.boardsUsed}/{cutPlan.totalStockBoards}</span>
          <span className="stat-label">Boards Used</span>
        </div>
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
    </div>
  )
}

// Project Summary Component
function ProjectSummary({ project }) {
  const totalBoardFeet = project.boards.reduce((sum, board) => sum + board.boardFeet, 0)
  const totalPieces = project.boards.reduce((sum, board) => sum + (board.quantity || 1), 0)

  const cutPieces = project.cutPieces || []
  const totalCutPieces = cutPieces.reduce((sum, piece) => sum + (piece.quantity || 1), 0)
  const totalCutBF = calculateCutPiecesBF(cutPieces)

  return (
    <div className="project-summary">
      <h3>Project Summary</h3>

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
          <div className="summary-section-label">Cut List</div>
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-value">{totalCutPieces}</span>
              <span className="stat-label">Pieces</span>
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

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return

    onSubmit({
      id: Date.now(),
      name: name.trim(),
      description: description.trim(),
      boards: [],
      cutPieces: [],
      cutPlan: null,
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
          placeholder="e.g., Dining Table, Bookshelf"
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

      <button type="submit" className="btn-primary">Create Project</button>
    </form>
  )
}

// Main App Component
function App() {
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('boardFootProjects')
    return saved ? JSON.parse(saved) : []
  })
  const [currentProject, setCurrentProject] = useState(null)
  const [editingBoard, setEditingBoard] = useState(null)
  const [editingCutPiece, setEditingCutPiece] = useState(null)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [activeTab, setActiveTab] = useState('stock') // 'stock' | 'cutlist' | 'plan'

  // Save to localStorage whenever projects change
  useEffect(() => {
    localStorage.setItem('boardFootProjects', JSON.stringify(projects))
  }, [projects])

  // Helper to update current project
  const updateProject = (updatedProject) => {
    setProjects(projects.map(p => p.id === currentProject.id ? updatedProject : p))
    setCurrentProject(updatedProject)
  }

  const handleCreateProject = (project) => {
    setProjects([...projects, project])
    setCurrentProject(project)
    setShowProjectForm(false)
  }

  const handleSelectProject = (project) => {
    setCurrentProject(project)
    setEditingBoard(null)
    setEditingCutPiece(null)
    setActiveTab('stock')
  }

  const handleDeleteProject = (projectId) => {
    if (confirm('Are you sure you want to delete this project?')) {
      setProjects(projects.filter(p => p.id !== projectId))
      if (currentProject?.id === projectId) {
        setCurrentProject(null)
      }
    }
  }

  // Stock board handlers
  const handleAddBoard = (board) => {
    updateProject({
      ...currentProject,
      boards: [...currentProject.boards, board],
      cutPlan: null // Clear cut plan when stock changes
    })
  }

  const handleUpdateBoard = (updatedBoard) => {
    updateProject({
      ...currentProject,
      boards: currentProject.boards.map(b =>
        b.id === updatedBoard.id ? updatedBoard : b
      ),
      cutPlan: null
    })
    setEditingBoard(null)
  }

  const handleDeleteBoard = (boardId) => {
    updateProject({
      ...currentProject,
      boards: currentProject.boards.filter(b => b.id !== boardId),
      cutPlan: null
    })
  }

  // Cut piece handlers
  const handleAddCutPiece = (piece) => {
    const cutPieces = currentProject.cutPieces || []
    updateProject({
      ...currentProject,
      cutPieces: [...cutPieces, piece],
      cutPlan: null
    })
  }

  const handleUpdateCutPiece = (updatedPiece) => {
    const cutPieces = currentProject.cutPieces || []
    updateProject({
      ...currentProject,
      cutPieces: cutPieces.map(p =>
        p.id === updatedPiece.id ? updatedPiece : p
      ),
      cutPlan: null
    })
    setEditingCutPiece(null)
  }

  const handleDeleteCutPiece = (pieceId) => {
    const cutPieces = currentProject.cutPieces || []
    updateProject({
      ...currentProject,
      cutPieces: cutPieces.filter(p => p.id !== pieceId),
      cutPlan: null
    })
  }

  // Generate cut plan
  const handleGenerateCutPlan = () => {
    const cutPieces = currentProject.cutPieces || []
    if (cutPieces.length === 0) {
      alert('Add cut pieces first before generating a plan.')
      return
    }
    if (currentProject.boards.length === 0) {
      alert('Add stock boards first before generating a plan.')
      return
    }

    const cutPlan = optimizeCuts(currentProject.boards, cutPieces)
    updateProject({
      ...currentProject,
      cutPlan
    })
    setActiveTab('plan')
  }

  const availableThicknesses = currentProject ? getStockThicknesses(currentProject.boards) : []
  const cutPieces = currentProject?.cutPieces || []

  return (
    <div className="app">
      <header>
        <h1>Board Foot Calculator</h1>
        <p className="subtitle">Calculate lumber requirements for your woodworking projects</p>
      </header>

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

                {projects.length > 0 && (
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
                            handleDeleteProject(project.id)
                          }}
                          className="btn-delete"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
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
                <button
                  onClick={() => exportProjectToPDF(currentProject)}
                  className="btn-export"
                >
                  Export to PDF
                </button>
              </div>
              <div className="project-title">
                <h2>{currentProject.name}</h2>
                {currentProject.description && (
                  <p className="project-description">{currentProject.description}</p>
                )}
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="tab-nav">
              <button
                className={`tab-btn ${activeTab === 'stock' ? 'active' : ''}`}
                onClick={() => setActiveTab('stock')}
              >
                Stock Boards ({currentProject.boards.length})
              </button>
              <button
                className={`tab-btn ${activeTab === 'cutlist' ? 'active' : ''}`}
                onClick={() => setActiveTab('cutlist')}
              >
                Cut List ({cutPieces.length})
              </button>
              <button
                className={`tab-btn ${activeTab === 'plan' ? 'active' : ''}`}
                onClick={() => setActiveTab('plan')}
              >
                Cut Plan {currentProject.cutPlan ? '✓' : ''}
              </button>
            </div>

            <div className="project-content">
              <div className="main-section">
                {/* Stock Boards Tab */}
                {activeTab === 'stock' && (
                  <div className="boards-section">
                    {editingBoard ? (
                      <BoardForm
                        initialData={editingBoard}
                        onSubmit={handleUpdateBoard}
                        onCancel={() => setEditingBoard(null)}
                      />
                    ) : (
                      <BoardForm onSubmit={handleAddBoard} />
                    )}

                    {currentProject.boards.length > 0 && (
                      <div className="board-list">
                        <h3>Stock Boards</h3>
                        {currentProject.boards.map(board => (
                          <BoardItem
                            key={board.id}
                            board={board}
                            onEdit={setEditingBoard}
                            onDelete={handleDeleteBoard}
                          />
                        ))}
                      </div>
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
                      />
                    ) : (
                      <CutPieceForm
                        onSubmit={handleAddCutPiece}
                        availableThicknesses={availableThicknesses}
                      />
                    )}

                    {cutPieces.length > 0 && (
                      <div className="cut-piece-list">
                        <h3>Cut Pieces</h3>
                        {cutPieces.map(piece => (
                          <CutPieceItem
                            key={piece.id}
                            piece={piece}
                            onEdit={setEditingCutPiece}
                            onDelete={handleDeleteCutPiece}
                          />
                        ))}
                      </div>
                    )}

                    {cutPieces.length > 0 && currentProject.boards.length > 0 && (
                      <div className="generate-plan-section">
                        <button
                          onClick={handleGenerateCutPlan}
                          className="btn-primary btn-large"
                        >
                          Generate Cut Plan
                        </button>
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
                        onRegenerate={handleGenerateCutPlan}
                      />
                    ) : (
                      <div className="no-plan">
                        <p>No cut plan generated yet.</p>
                        {cutPieces.length === 0 && (
                          <p>Add cut pieces in the Cut List tab first.</p>
                        )}
                        {cutPieces.length > 0 && currentProject.boards.length === 0 && (
                          <p>Add stock boards in the Stock Boards tab first.</p>
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

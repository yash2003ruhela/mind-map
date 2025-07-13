// Global variables
let nodes = [];
let lines = [];
let history = [];
let redoStack = [];
let selectedNodes = [];
let draggedNode = null;

// Helper to get elements
const getElement = (id) => document.getElementById(id);

// Event listeners
getElement('newMindMap').addEventListener('click', () => {
    if (confirm('Are you sure you want to create a new Mind Map?')) {
        clearMindMap();
        saveHistory();
        alert('New Mind Map created!');
    }
});

getElement('saveMindMap').addEventListener('click', () => {
    saveMindMap();
});

getElement('deleteMindMap').addEventListener('click', () => {
    if (confirm('Are you sure you want to delete this Mind Map?')) {
        deleteSelectedNodes();
        saveHistory();
    }
});

getElement('addNode').addEventListener('click', () => {
    const nodeId = 'node-' + (nodes.length + 1);
    const newNode = createNode(nodeId, 50, 50);
    getElement('mindMapCanvas').appendChild(newNode);
    nodes.push(newNode);
    saveHistory();
});

getElement('connectNodes').addEventListener('click', () => {
    if (selectedNodes.length < 2) {
        alert('Select two nodes to connect.');
        return;
    }
    const [node1, node2] = selectedNodes;
    const line = createLine(node1, node2);
    getElement('lines').appendChild(line);
    lines.push(line);
    clearNodeSelection();
    saveHistory();
});

getElement('exportMindMap').addEventListener('click', () => {
    saveMindMap();
});

getElement('undo').addEventListener('click', undo);
getElement('redo').addEventListener('click', redo);

// Core functions
function clearMindMap() {
    nodes.forEach(node => node.remove());
    lines.forEach(line => line.remove());
    nodes = [];
    lines = [];
    selectedNodes = [];
}

function deleteSelectedNodes() {
    selectedNodes.forEach(node => {
        // Remove node from array & DOM
        nodes = nodes.filter(n => n !== node);
        node.remove();
    });

    // Remove connected lines from both array & DOM
    lines = lines.filter(line => {
        const nodeIds = selectedNodes.map(node => node.id);
        const node1 = line.getAttribute('data-node1');
        const node2 = line.getAttribute('data-node2');

        const isConnected = nodeIds.includes(node1) || nodeIds.includes(node2);

        if (isConnected) {
            line.remove(); // remove from DOM
            return false;  // remove from array
        }

        return true; // keep line if not connected
    });

    selectedNodes = [];
}

function createNode(id, x, y) {
    const node = document.createElement('div');
    node.classList.add('node');
    node.id = id;
    node.contentEditable = 'true';
    Object.assign(node.style, { left: `${x}px`, top: `${y}px` });
    node.textContent = id;
    node.addEventListener('mousedown', startDrag);
    node.addEventListener('click', selectNode);
    return node;
}

function createLine(node1, node2) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    updateLineAttributes(line, node1, node2);
    line.setAttribute('stroke', 'black');
    line.setAttribute('stroke-width', '2');
    line.dataset.node1 = node1.id;
    line.dataset.node2 = node2.id;
    return line;
}

function updateLineAttributes(line, node1, node2) {
    line.setAttribute('x1', node1.offsetLeft + node1.offsetWidth / 2);
    line.setAttribute('y1', node1.offsetTop + node1.offsetHeight / 2);
    line.setAttribute('x2', node2.offsetLeft + node2.offsetWidth / 2);
    line.setAttribute('y2', node2.offsetTop + node2.offsetHeight / 2);
}

function saveState() {
    return {
        nodes: nodes.map(node => ({
            id: node.id,
            x: node.offsetLeft,
            y: node.offsetTop,
            text: node.textContent
        })),
        lines: lines.map(line => ({
            x1: line.getAttribute('x1'),
            y1: line.getAttribute('y1'),
            x2: line.getAttribute('x2'),
            y2: line.getAttribute('y2'),
            node1: line.dataset.node1,
            node2: line.dataset.node2
        }))
    };
}

function saveHistory() {
    history.push(JSON.stringify(saveState()));
    redoStack = []; // Clear redo stack whenever a new action is performed
}

function undo() {
    if (history.length > 1) {
        redoStack.push(history.pop()); // Save current state to redo stack
        restoreState(history[history.length - 1]); // Restore previous state
    }
}

function redo() {
    if (redoStack.length > 0) {
        history.push(redoStack.pop()); // Move state from redoStack back to history
        restoreState(history[history.length - 1]); // Restore latest state
    }
}

function restoreState(state) {
    clearMindMap();
    const savedState = JSON.parse(state);
    savedState.nodes.forEach(({ id, x, y, text }) => {
        const node = createNode(id, x, y);
        node.textContent = text;
        getElement('mindMapCanvas').appendChild(node);
        nodes.push(node);
    });
    savedState.lines.forEach(({ node1, node2 }) => {
        const line = createLine(getElement(node1), getElement(node2));
        getElement('lines').appendChild(line);
        lines.push(line);
    });
}

// Dragging and selection
function startDrag(event) {
    draggedNode = event.target;
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
}

function drag(event) {
    if (draggedNode) {
        const canvas = getElement('mindMapCanvas');
        const rect = canvas.getBoundingClientRect();
        draggedNode.style.left = `${Math.min(Math.max(0, event.clientX - rect.left - draggedNode.offsetWidth / 2), rect.width - draggedNode.offsetWidth)}px`;
        draggedNode.style.top = `${Math.min(Math.max(0, event.clientY - rect.top - draggedNode.offsetHeight / 2), rect.height - draggedNode.offsetHeight)}px`;
        updateLines(draggedNode);
    }
}

function endDrag() {
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', endDrag);
    draggedNode = null;
    saveHistory(); // Save state after drag ends
}

function updateLines(node) {
    lines.forEach(line => {
        if (line.dataset.node1 === node.id || line.dataset.node2 === node.id) {
            const node1 = getElement(line.dataset.node1);
            const node2 = getElement(line.dataset.node2);
            updateLineAttributes(line, node1, node2);
        }
    });
}

function selectNode(event) {
    const node = event.target;
    node.classList.toggle('selected');
    selectedNodes = node.classList.contains('selected') ? [...selectedNodes, node] : selectedNodes.filter(n => n !== node);
    if (selectedNodes.length > 2) selectedNodes.shift().classList.remove('selected');
}

function clearNodeSelection() {
    selectedNodes.forEach(node => node.classList.remove('selected'));
    selectedNodes = [];
}

// Save and Export
function saveMindMap() {
    const canvas = getElement('mindMapCanvasElement');
    const ctx = canvas.getContext('2d');

    canvas.width = getElement('mindMapCanvas').offsetWidth;
    canvas.height = getElement('mindMapCanvas').offsetHeight;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    nodes.forEach(node => {
        ctx.fillStyle = node.classList.contains('selected') ? 'lightgreen' : 'lightblue';
        ctx.fillRect(node.offsetLeft, node.offsetTop, node.offsetWidth, node.offsetHeight);
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.textContent, node.offsetLeft + node.offsetWidth / 2, node.offsetTop + node.offsetHeight / 2);
    });

    const link = document.createElement('a');
    link.download = 'mindmap.png';
    link.href = canvas.toDataURL();
    link.click();
}

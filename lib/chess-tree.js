// A game as a tree rather than a list, so an analysis board can hold the moves
// that were played and the moves that were not.
//
// Every node is one move; the root is the starting position and holds none.
// A node's first child is its main line, the rest are its variations. Nothing
// here knows the rules — chess.js has already judged the move by the time it
// arrives.

export function newTree(fen) {
  return {
    next: 1,
    root: "0",
    nodes: { 0: { id: "0", parent: null, move: null, fen, children: [] } },
  };
}

// Playing a move that is already a child walks into it instead of adding a
// second copy of the same line.
export function addMove(tree, parentId, move) {
  const parent = tree.nodes[parentId];
  if (!parent) return { tree, id: parentId };

  const twin = parent.children.find((id) => tree.nodes[id].move.san === move.san);
  if (twin) return { tree, id: twin };

  const id = String(tree.next);
  return {
    tree: {
      ...tree,
      next: tree.next + 1,
      nodes: {
        ...tree.nodes,
        [id]: { id, parent: parentId, move, fen: move.after, children: [] },
        [parentId]: { ...parent, children: [...parent.children, id] },
      },
    },
    id,
  };
}

// Root first, the node itself last. The root carries no move, so callers that
// want moves drop the head.
export function pathTo(tree, id) {
  const path = [];
  let node = tree.nodes[id];
  while (node) {
    path.unshift(node);
    node = node.parent ? tree.nodes[node.parent] : null;
  }
  return path;
}

export function lineTo(tree, id) {
  return pathTo(tree, id).filter((node) => node.move);
}

// The main line from a node down: first child, then its first child, and so on.
export function mainLineFrom(tree, id) {
  const line = [];
  let node = tree.nodes[id];
  while (node && node.children.length) {
    node = tree.nodes[node.children[0]];
    line.push(node);
  }
  return line;
}

function descendants(tree, id, out = []) {
  out.push(id);
  for (const child of tree.nodes[id].children) descendants(tree, child, out);
  return out;
}

// Cuts a node and everything under it. Returns the tree and where to stand now.
export function removeNode(tree, id) {
  const node = tree.nodes[id];
  if (!node || !node.parent) return { tree, id: tree.root };

  const parent = tree.nodes[node.parent];
  const nodes = { ...tree.nodes };
  for (const gone of descendants(tree, id)) delete nodes[gone];
  nodes[parent.id] = { ...parent, children: parent.children.filter((c) => c !== id) };

  return { tree: { ...tree, nodes }, id: parent.id };
}

// Makes a variation its parent's main line.
export function promoteNode(tree, id) {
  const node = tree.nodes[id];
  if (!node || !node.parent) return tree;
  const parent = tree.nodes[node.parent];
  if (parent.children[0] === id) return tree;
  return {
    ...tree,
    nodes: {
      ...tree.nodes,
      [parent.id]: { ...parent, children: [id, ...parent.children.filter((c) => c !== id)] },
    },
  };
}

// One straight line of moves, as a tree with no branches. Games played against
// the bot or in a room arrive this way, and the move list only speaks tree.
export function treeFromMoves(moves, startFen) {
  const first = moves[0]?.before || startFen;
  let tree = newTree(first);
  let id = tree.root;
  for (const move of moves) {
    const added = addMove(tree, id, move);
    tree = added.tree;
    id = added.id;
  }
  return { tree, tip: id };
}

// How deep in variations a node sits: zero on the main line of the whole game.
export function depthOf(tree, id) {
  let depth = 0;
  let node = tree.nodes[id];
  while (node?.parent) {
    const parent = tree.nodes[node.parent];
    if (parent.children[0] !== node.id) depth += 1;
    node = parent;
  }
  return depth;
}

// Which move number a node is, and whether it is white's half.
export function plyOf(tree, id) {
  return pathTo(tree, id).length - 1;
}

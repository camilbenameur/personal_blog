// Wraps <table> and build-time Mermaid <svg> in a keyboard-focusable scroll region.
// Diagrams are rendered at their natural size (viewBox width x height) so text never shrinks.
// Each region gets its own accessible name (landmarks must be unique): a diagram is named after its
// <title> (Mermaid accTitle), a table by its position when a post has more than one.
const isDiagram = (node) =>
  node.type === 'element' && node.tagName === 'svg' && String(node.properties?.id ?? '').startsWith('mermaid');
const isTable = (node) => node.type === 'element' && node.tagName === 'table';

const textOf = (node) =>
  node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join('');

// Collect the wide blocks of one post, in document order.
function collect(parent, found = { tables: [], diagrams: [] }) {
  for (const child of parent.children ?? []) {
    if (child.type !== 'element') continue;
    if (isTable(child)) found.tables.push(child);
    else if (isDiagram(child)) found.diagrams.push(child);
    else collect(child, found);
  }
  return found;
}

const wrap = (node, label) => ({
  type: 'element',
  tagName: 'div',
  properties: { className: ['scroll'], tabIndex: 0, role: 'region', ariaLabel: label },
  children: [node],
});

function diagramName(svg) {
  const title = (svg.children ?? []).find((c) => c.type === 'element' && c.tagName === 'title');
  return title ? textOf(title).replace(/\s+/g, ' ').trim() : '';
}

function walk(parent, labels) {
  parent.children = parent.children.map((child) => {
    if (child.type !== 'element') return child;
    if (isTable(child)) return wrap(child, labels.get(child));
    if (isDiagram(child)) {
      const vb = String(child.properties.viewBox ?? '').split(/\s+/).map(Number);
      if (vb.length === 4 && vb.every(Number.isFinite)) {
        child.properties.width = Math.round(vb[2]);
        child.properties.height = Math.round(vb[3]);
        delete child.properties.style;
      }
      return wrap(child, labels.get(child));
    }
    if (child.children) walk(child, labels);
    return child;
  });
}

export default function rehypeWrapWide() {
  return (tree) => {
    const { tables, diagrams } = collect(tree);
    const labels = new Map();

    tables.forEach((table, i) => {
      const n = tables.length > 1 ? ` ${i + 1} of ${tables.length}` : '';
      labels.set(table, `Table${n}, scrolls horizontally`);
    });

    const names = diagrams.map(diagramName);
    diagrams.forEach((svg, i) => {
      const name = names[i];
      const unique = name && names.filter((other) => other === name).length === 1;
      const n = diagrams.length > 1 ? ` ${i + 1} of ${diagrams.length}` : '';
      const base = unique ? `Diagram: ${name}` : name ? `Diagram${n}: ${name}` : `Diagram${n}`;
      labels.set(svg, `${base}, scrolls horizontally`);
    });

    walk(tree, labels);
  };
}

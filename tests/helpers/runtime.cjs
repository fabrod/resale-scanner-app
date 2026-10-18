const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

function loadSource(relativePath, mocks = {}) {
  const filename = path.resolve(__dirname, '../..', relativePath);
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename,
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs', '@babel/plugin-transform-react-jsx'],
  });
  const module = { exports: {} };
  const requireMock = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    throw new Error(`Unexpected import: ${name}`);
  };
  new Function('require', 'module', 'exports', code)(requireMock, module, module.exports);
  return module.exports;
}

// Exercise handlers and rendered props without adding a native renderer dependency.
function createHooks() {
  const values = [];
  const effects = [];
  let cursor = 0;
  return {
    react: {
      createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
      useState: (initial) => {
        const index = cursor++;
        if (!(index in values)) values[index] = initial;
        return [values[index], (next) => { values[index] = next; }];
      },
      useRef: (initial) => {
        const index = cursor++;
        if (!(index in values)) values[index] = { current: initial };
        return values[index];
      },
      useCallback: (callback) => {
        const index = cursor++;
        if (!(index in values)) values[index] = callback;
        return values[index];
      },
      useEffect: (effect) => {
        const index = cursor++;
        if (!(index in values)) {
          values[index] = true;
          effects.push(effect);
        }
      },
    },
    render: (component) => {
      cursor = 0;
      const tree = component();
      effects.splice(0).forEach((effect) => effect());
      return tree;
    },
  };
}

function nodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  return [
    ...(predicate(tree) ? [tree] : []),
    ...(tree.props?.children || []).flatMap((child) => nodes(child, predicate)),
  ];
}

module.exports = { loadSource, createHooks, nodes };

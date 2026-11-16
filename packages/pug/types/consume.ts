/**
 * Consume the pug type surface the way a TS engine/editor would.
 * This file is type-checked (not run) to prove the declarations are usable.
 */
import * as pug from 'pug';

// --- tree ---
function treeDemo(src: string): void {
  const nodes: pug.PugTreeNode[] = pug.tree(src, { positions: true });

  for (const node of nodes) {
    // Narrow by the discriminating keys each node carries.
    if ('tag' in node) {
      const tag = node; // PugTagNode
      const owner: pug.PugAttrValue | undefined = tag.attrs.owner;
      void owner;
      void tag.children;
    }
    if ('each' in node) {
      const each = node; // PugEachNode
      void each.each.val; // string
      void each.each.obj; // string
    }
    if ('use' in node) {
      const use = node; // PugUseNode
      void use.children; // optional passed content
    }
    if ('yield' in node) {
      const y = node; // PugYieldNode
      void y.yield; // 'block' | 'content'
    }
  }
}

// --- data ---
function dataDemo(src: string): void {
  const value: pug.DataValue = pug.data(src);
  const yaml: string = pug.renderData(src);
  const yaml2: string = pug.toYaml({ name: 'pug', count: 3 });
  void [value, yaml, yaml2];
}

// --- compile / render ---
function compileDemo(src: string): void {
  const tmpl: pug.PugTemplate = pug.compile(src, { pretty: true });
  const html: string = tmpl({ title: 'hi' });
  void html;

  const sync: string = pug.render(src, { compileDebug: true });
  void sync;

  pug.render(src, (err, result) => {
    if (err) {
      throw err;
    }
    void result;
  });
}

// --- runtime helpers ---
function runtimeDemo(): void {
  const escaped: string = pug.runtime.escape('<a>');
  void escaped;
}

void [treeDemo, dataDemo, compileDemo, runtimeDemo];

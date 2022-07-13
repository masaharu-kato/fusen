import { Evaluator } from './evaluator';
import { TemplateText } from './tmpl-text';

abstract class FusNode {
  abstract make_nodes(evl: Evaluator): Generator<Node>;
}

abstract class SingleNode extends FusNode {
  abstract make_node(evl: Evaluator): Node;

  *make_nodes(evl: Evaluator): Generator<Node> {
    yield this.make_node(evl);
  }
}

class MultipleNode extends FusNode {
  nodes: Array<FusNode>;

  constructor(nodes: Array<FusNode>) {
    super();
    this.nodes = nodes;
  }

  *make_nodes(evl: Evaluator): Generator<Node> {
    for (const node of this.nodes) yield* node.make_nodes(evl);
  }
}

class PlainTextNode extends SingleNode {
  text_node: Node;
  constructor(text: string) {
    super();
    this.text_node = document.createTextNode(text);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  make_node(evl: Evaluator): Node {
    return this.text_node;
  }
}

class TemplateTextNode extends SingleNode {
  tmpl_text: TemplateText;
  constructor(tmpl_text: TemplateText) {
    super();
    this.tmpl_text = tmpl_text;
  }
  make_node(evl: Evaluator): Node {
    return document.createTextNode(this.tmpl_text.make_text(evl));
  }
}

abstract class FlowNode extends FusNode {}

class FusIf extends FlowNode {
  expr: string;
  node_true: FusNode;
  node_false: FusNode | null;

  constructor(expr: string, node_true: FusNode, node_false: FusNode | null = null) {
    super();
    this.expr = expr;
    this.node_true = node_true;
    this.node_false = node_false;
  }

  *make_nodes(evl: Evaluator): Generator<Node> {
    if (evl.eval_bool(this.expr)) {
      yield* this.node_true.make_nodes(evl);
    } else {
      if (this.node_false !== null) yield* this.node_false.make_nodes(evl);
    }
  }
}

class FusFor extends FlowNode {
  iter_name: string;
  val_name: string;
  node_iter: FusNode;
  node_else: FusNode | null;

  constructor(iter_name: string, val_name: string, node_iter: FusNode, node_else: FusNode | null = null) {
    super();
    this.iter_name = iter_name;
    this.val_name = val_name;
    this.node_iter = node_iter;
    this.node_else = node_else;
  }

  *make_nodes(evl: Evaluator): Generator<Node> {
    let cnt = 0;
    for (const val of evl.eval_iter(this.iter_name)) {
      const c_evl = evl.copy_with_locals({ [this.val_name]: val });
      yield* this.node_iter.make_nodes(c_evl);
      cnt++;
    }
    if (!cnt) {
      if (this.node_else !== null) yield* this.node_else.make_nodes(evl);
    }
  }
}

class FusElement extends SingleNode {
  base_elm: Element;
  tmpl_attrs: { [name: string]: TemplateText };
  child: FusNode | null;

  constructor(tag: string, attrs: { [name: string]: string }, child: FusNode | null = null) {
    super();

    //  Create base element
    this.base_elm = document.createElement(tag);

    //  Process attributes
    this.tmpl_attrs = {};
    for (const [name, value] of Object.entries(attrs)) {
      const tmpl = new TemplateText(value);
      if (tmpl.has_codes()) {
        this.tmpl_attrs[name] = tmpl;
      } else {
        this.base_elm.setAttribute(name, value);
      }
    }

    //  Process child nodes
    this.child = child;
  }

  make_node(evl: Evaluator): Node {
    const elm = <Element>this.base_elm.cloneNode();
    for (const [name, tmpl] of Object.entries(this.tmpl_attrs)) {
      elm.setAttribute(name, tmpl.make_text(evl));
    }
    if (this.child !== null) {
      for (const c_elm of this.child.make_nodes(evl)) elm.append(c_elm);
    }
    return elm;
  }
}

export function* make_fus_nodes(nodes: Array<Node>): Generator<FusNode> {
  let last_fus_elm: FusNode | null = null;
  //  Process nodes
  for (const node of nodes) {
    let c_fus_elm = null;
    const child = new MultipleNode([...make_fus_nodes([...node.childNodes])]);
    if (node instanceof Element) {
      const elm = node;
      const tag = elm.tagName;
      //
      if (tag == 'fus-if') {
        const expr = elm.getAttribute('v');
        if (!expr) throw new Error('Expression not specified.');
        c_fus_elm = new FusIf(expr, child);
      } //
      else if (tag == 'fus-else') {
        if (!(last_fus_elm instanceof FusIf)) throw new Error('Invalid use of Fus-else.');
        last_fus_elm.node_false = child;
      } //
      else if (tag == 'fus-for') {
        const iter_name = elm.getAttribute('v');
        if (!iter_name) throw new Error('Variable not specified.');
        const val_name = elm.getAttribute('as') || '';
        c_fus_elm = new FusFor(iter_name, val_name, child);
      } //
      else if (tag == 'fus-for-else') {
        if (!(last_fus_elm instanceof FusFor)) throw new Error('Invalid use of Fus-for-else.');
        last_fus_elm.node_else = child;
      } else {
        const attrs = Object.fromEntries([...elm.attributes].map((v) => [v.name, v.value]));
        // if (attrs['fus-if']) return new FusIf(attrs['fus-if'], child)
        // if (attrs['fus-else']) return new FusIf(attrs['fus-if'], child)

        c_fus_elm = new FusElement(tag, attrs, child);
      }
      //
    } //
    else {
      const text = node.textContent;
      if (text !== null) {
        const tmpl = new TemplateText(text);
        if (tmpl.has_codes()) {
          c_fus_elm = new TemplateTextNode(tmpl);
        } else {
          c_fus_elm = new PlainTextNode(text);
        }
      }
    }
    //  Output current fus-element
    if (c_fus_elm !== null) yield c_fus_elm;
    last_fus_elm = c_fus_elm;
  }
}

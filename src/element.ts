import { Evaluator } from './evaluator';
import { TemplateText } from './tmpl-text';

export type NodeType = FusNode | Node;

export abstract class FusNode {
  abstract make_nodes(evl: Evaluator): Generator<Node>;
}

export abstract class FusFlowNode extends FusNode {}

abstract class SingleFusNode extends FusNode {
  abstract make_node(evl: Evaluator): Node;

  *make_nodes(evl: Evaluator): Generator<Node> {
    yield this.make_node(evl);
  }

  abstract fus_required(): boolean;
}

export function* make_nodes(node: NodeType | null, evl: Evaluator): Generator<Node> {
  if (node !== null) {
    if (node instanceof FusNode) {
      yield* node.make_nodes(evl);
    } else {
      yield node;
    }
  }
}

class FusNodeList extends FusNode {
  nodes: Array<NodeType>;

  constructor(nodes: Array<NodeType>) {
    super();
    this.nodes = nodes;
  }

  *make_nodes(evl: Evaluator): Generator<Node> {
    for (const node of this.nodes) yield* make_nodes(node, evl);
  }
}

export type ChildNodeType = FusNodeList | Node | null;

class TemplateTextNode extends SingleFusNode {
  tmpl_text: TemplateText;
  constructor(tmpl_text: TemplateText) {
    super();
    this.tmpl_text = tmpl_text;
  }

  make_node(evl: Evaluator): Node {
    return document.createTextNode(this.tmpl_text.make_text(evl));
  }

  fus_required(): boolean {
    return this.tmpl_text.has_codes();
  }
}

export class FusElement extends SingleFusNode {
  base_elm: Element;
  tmpl_attrs: { [name: string]: TemplateText };
  child: FusNodeList | null;

  constructor(elm: Element) {
    super();
    this.base_elm = document.createElement(elm.tagName);

    //  Process attributes
    this.tmpl_attrs = {};
    for (const attr of [...elm.attributes]) {
      const tmpl = new TemplateText(attr.value);
      //  If the attribute value contains codes, add to template list and remove original attribute
      if (tmpl.has_codes()) {
        this.tmpl_attrs[attr.name] = tmpl;
      } else {
        this.base_elm.setAttribute(attr.name, attr.value);
      }
    }

    //  Process child nodes
    this.child = process_nodes([...elm.childNodes]);
    //  If the result is null, child nodes consists of only pure nodes,
    //  so append them to the base element.
    if (this.child === null) this.base_elm.append(...[...elm.childNodes].map((node) => node.cloneNode(true)));
  }

  make_node(evl: Evaluator): Node {
    //  Clone from the base element (which may contains child nodes)
    const elm = <Element>this.base_elm.cloneNode(true);
    for (const [name, v] of Object.entries(this.tmpl_attrs)) {
      elm.setAttribute(name, v.make_text(evl));
    }
    if (this.child !== null) elm.append(...this.child.make_nodes(evl));
    return elm;
  }

  fus_required(): boolean {
    return Object.keys(this.tmpl_attrs).length !== 0 || this.child !== null;
  }
}

export function process_nodes(nodes: Array<Node>): FusNodeList | null {
  const result: Array<NodeType> = [];
  let fus_required = false;

  //  Process nodes
  for (const node of nodes) {
    let last_fus_node = null;

    //  Element
    if (node instanceof Element) {
      const elm = node;
      const tag = elm.tagName.toLowerCase();
      const attrs = Object.fromEntries([...elm.attributes].map((attr) => [attr.name, attr.value]));
      //  Fus element
      if (tag.startsWith('fus-')) {
        const child = process_nodes([...node.childNodes]);
        const new_fus_node = process_fus_tag_element(tag, attrs, child, last_fus_node);
        if (new_fus_node !== null) result.push(new_fus_node);
        last_fus_node = new_fus_node;
      }
      //  Normal element which may have Fus attributes
      else {
        // let fus_attr_name = null;
        // for (const name in attrs) {
        //   if (name.startsWith('fus-')) {
        //     fus_attr_name = name;
        //     break;
        //   }
        // }
        // if (fus_attr_name) {
        //   //  Fus attribute exists
        //   const fus_attr_value = attrs[fus_attr_name];
        //   elm.removeAttribute(fus_attr_name);
        //   const child = process_nodes([elm]);
        //   const new_fus_node = process_fus_tag_element(elm, tag, attrs, child, last_fus_node);
        //   if (new_fus_node !== null) result.push(new_fus_node);
        //   elm.remove();
        // } else {
        //   result.push(new FusElement(elm));
        // }
        const fus_elm = new FusElement(elm);
        if (fus_elm.fus_required()) {
          fus_required = true;
          result.push(fus_elm);
        } else {
          result.push(elm.cloneNode(true));
        }
      }

      //  Text Node
    } else {
      const text = node.textContent;
      let tmpl;
      if (text !== null && (tmpl = new TemplateText(text)).has_codes()) {
        result.push(new TemplateTextNode(tmpl));
        fus_required = true;
      } else {
        result.push(node.cloneNode(true));
      }
    }
  }
  if (fus_required) return new FusNodeList(result);
  return null;
}

class FusIf extends FusFlowNode {
  expr: string;
  node_true: ChildNodeType;
  node_false: ChildNodeType;

  constructor(expr: string, node_true: ChildNodeType, node_false: ChildNodeType = null) {
    super();
    this.expr = expr;
    this.node_true = node_true;
    this.node_false = node_false;
  }

  *make_nodes(evl: Evaluator): Generator<Node> {
    if (evl.eval_bool(this.expr)) {
      yield* make_nodes(this.node_true, evl);
    } else {
      yield* make_nodes(this.node_false, evl);
    }
  }
}

class FusFor extends FusFlowNode {
  iter_name: string;
  val_name: string;
  node_iter: ChildNodeType;
  node_else: ChildNodeType;

  constructor(iter_name: string, val_name: string, node_iter: ChildNodeType, node_else: ChildNodeType = null) {
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
      yield* make_nodes(this.node_iter, c_evl);
      cnt++;
    }
    if (!cnt) yield* make_nodes(this.node_else, evl);
  }
}

export function process_fus_tag_element(tag: string, attrs: { [name: string]: string }, child: ChildNodeType, last_fus_node: FusNode | null): FusNode | null {
  switch (tag) {
    case 'fus-if':
      return new FusIf(attrs.v, child);
    case 'fus-else':
      if (!(last_fus_node instanceof FusIf)) throw new Error('Invalid use of Fus-else.');
      last_fus_node.node_false = child;
      return null;
    case 'fus-for':
      return new FusFor(attrs.v, attrs.as, child);
    case 'fus-for-else':
      if (!(last_fus_node instanceof FusFor)) throw new Error('Invalid use of Fus-for-else.');
      last_fus_node.node_else = child;
      return null;
    default:
      throw new Error('Invalid fus element.');
  }
}

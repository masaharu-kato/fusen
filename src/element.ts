import { Evaluator } from './evaluator';
import { TemplateText } from './tmpl-text';

export type NodeType = FusNode | Node;

export abstract class FusNode {
  abstract make_nodes(evl: Evaluator): Generator<Node>;
}

export abstract class FusFlowNode extends FusNode {}

abstract class SingleFusNode extends FusNode {
  base_node: Node;

  constructor(base_node: Node) {
    super();
    this.base_node = base_node;
  }

  abstract make_node(evl: Evaluator): Node;

  abstract make_node_with_base(node: Node, evl: Evaluator): void;

  *make_nodes(evl: Evaluator): Generator<Node> {
    yield this.make_node(evl);
  }
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

  // *get_base_nodes(): Generator<Node> {
  //   for (const node of this.nodes) {
  //     if (node instanceof FusNode) {
  //       if (node instanceof SingleFusNode) yield node.base_node;
  //     } else {
  //       yield node;
  //     }
  //   }
  // }

  make_nodes_with_base(elm: Element, evl: Evaluator) {
    const elm_cnodes = [...elm.childNodes];

    //  No existing base nodes
    if (!elm_cnodes.length) {
      for (const node of this.nodes) {
        if (node instanceof FusNode) elm.append(...node.make_nodes(evl));
      }
    }
    //  Base nodes exists
    else {
      let next_cnode_i = 0; //  Counter for elm_cnodes
      for (const node of this.nodes) {
        if (node instanceof FusNode) {
          if (node instanceof SingleFusNode) {
            //  Update existing base node
            node.make_node_with_base(elm_cnodes[next_cnode_i], evl);
            next_cnode_i++;
          } else {
            //  Process and add new nodes before the next base node
            elm_cnodes[next_cnode_i].before(...node.make_nodes(evl));
          }
        } else {
          next_cnode_i++;
        }
        if (next_cnode_i >= elm_cnodes.length) throw new Error('Base element child nodes out of range.');
      }
    }
  }

  *make_nodes(evl: Evaluator): Generator<Node> {
    for (const node of this.nodes) yield* make_nodes(node, evl);
  }
}

export type ChildNodeType = FusNodeList | Node | null;

class TemplateTextNode extends SingleFusNode {
  tmpl_text: TemplateText;
  constructor(tmpl_text: TemplateText) {
    super(document.createTextNode(''));
    this.tmpl_text = tmpl_text;
  }

  make_node_with_base(elm: Node, evl: Evaluator): void {
    elm.textContent = this.tmpl_text.make_text(evl);
  }

  make_node(evl: Evaluator): Node {
    return document.createTextNode(this.tmpl_text.make_text(evl));
  }
}

export class FusElement extends SingleFusNode {
  tmpl_attrs: { [name: string]: TemplateText };
  child: ChildNodeType;

  constructor(elm: Element) {
    super(elm);

    //  Process attributes
    this.tmpl_attrs = {};
    for (const attr of [...elm.attributes]) {
      const tmpl = new TemplateText(attr.value);
      //  If the attribute value contains codes, add to template list and remove original attribute
      if (tmpl.has_codes()) {
        this.tmpl_attrs[attr.name] = tmpl;
        elm.removeAttribute(attr.name);
      }
    }

    //  Process child nodes
    this.child = process_nodes([...elm.childNodes]);
  }

  make_node_with_base(node: Node, evl: Evaluator): void {
    if (!(node instanceof Element)) throw new TypeError('Invalid type of base node.');
    const elm = node;
    for (const [name, tmpl] of Object.entries(this.tmpl_attrs)) {
      elm.setAttribute(name, tmpl.make_text(evl));
    }
    if (this.child instanceof FusNodeList) this.child.make_nodes_with_base(elm, evl);
  }

  make_node(evl: Evaluator): Node {
    const node = this.base_node.cloneNode(true);
    this.make_node_with_base(node, evl);
    return node;
  }
}

export function process_nodes(nodes: Array<ChildNode>): FusNodeList {
  const result: Array<NodeType> = [];

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
        elm.remove();
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
        result.push(new FusElement(elm));
      }

      //  Text Node
    } else {
      const text = node.textContent;
      if (text !== null) {
        const tmpl = new TemplateText(text);
        if (tmpl.has_codes()) {
          result.push(new TemplateTextNode(tmpl));
          node.remove();
        }
      }
    }
  }
  return new FusNodeList(result);
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

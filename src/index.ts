/*
 *  Fusen main classes
 */

type Scalar = null | boolean | number | string;
type JSONArray = Array<JSONValue>;
type JSONDict = { [key: string]: JSONValue };
type JSONValue = Scalar | JSONArray | JSONDict;
type EnvValue = EnvABC | Scalar;
type JSONEnvValue = JSONValue | EnvValue;

interface Environment {
  get_from_keys(keys: string[]): EnvValue;
  get_enval(name: string | null): EnvValue;
  get_scalar(name: string | null): JSONValue;
}

abstract class EnvABC implements Environment {
  abstract _get_child(key: string): EnvValue;
  abstract iter_kv(): Generator<[string | number, EnvValue], void>;

  get_from_keys(keys: string[]): EnvValue {
    const val = this._get_child(keys[0]);
    const rest_keys = keys.slice(1);
    if (val instanceof EnvABC) {
      if (rest_keys) return val.get_from_keys(rest_keys);
      return val;
    }
    if (rest_keys) throw new Error('Too many properties: ' + keys);
    return val;
  }

  get_enval(name: string): EnvValue {
    const keys = name.split('.');
    if (!keys) throw new Error('Empty name.');
    return this.get_from_keys(keys);
  }

  get_scalar(name: string): Scalar {
    const val = this.get_enval(name);
    if (val instanceof EnvABC) throw new Error('Too few properties: ' + name);
    return val;
  }
}

function json_to_env(data: JSONEnvValue): EnvValue {
  if (data instanceof EnvABC) {
    return data;
  } else if (data instanceof Array) {
    return new ArrayEnv(data);
  } else if (data instanceof Object) {
    return new ObjectEnv(data);
  }
  return data;
}

class ArrayEnv extends EnvABC {
  #children: EnvValue[];

  constructor(children_obj: JSONEnvValue[]) {
    super();
    this.#children = children_obj.map((v) => json_to_env(v));
  }

  _get_child(key: string): EnvValue {
    return this.#children[Number(key)];
  }

  *iter_kv(): Generator<[string | number, EnvValue], void> {
    for (let i = 0; i < this.#children.length; i++) {
      yield [i, this.#children[i]];
    }
  }
}

class ObjectEnv extends EnvABC {
  #children: { [key: string]: EnvValue };

  constructor(children_obj: { [key: string]: JSONEnvValue }) {
    super();
    this.#children = Object.fromEntries(
      Object.entries(children_obj).map(([k, v]) => [k, json_to_env(v)])
    );
  }

  _get_child(key: string): EnvValue {
    return this.#children[key];
  }

  copy(): ObjectEnv {
    return new ObjectEnv({ ...this.#children });
  }

  add(key: string, value: EnvValue) {
    this.#children[key] = value;
  }

  *iter_kv(): Generator<[string | number, EnvValue], void> {
    for (const i in this.#children) {
      yield [i, this.#children[i]];
    }
  }
}

class MainEnv {
  data: ObjectEnv;
  functions: { [key: string]: ElementFunction };
  sys: SystemEnv;

  constructor(
    data: ObjectEnv,
    functions: { [key: string]: ElementFunction },
    system: SystemEnv
  ) {
    this.data = data;
    this.functions = functions;
    this.sys = system;
  }

  copy(): MainEnv {
    return new MainEnv(
      this.data.copy(),
      { ...this.functions },
      { ...this.sys }
    );
  }
}

interface SystemEnv {
  last_if: boolean | null;
  last_for: number | null;
  case_matched: boolean | null;
  switch_target: EnvValue;
}

class FusElement {
  #elm: Element;
  #env: MainEnv;

  constructor(elm: Element, env: MainEnv) {
    this.#elm = elm;
    this.#env = env;
  }

  // prettier-ignore
  static TAG_METHODS: {[key: string]: (v :FusElement) => void} = {
    // comment
    'fus-out'         : (v: FusElement) => v.tag_fus_out,
    'fus-if'          : (v: FusElement) => v.tag_fus_if,
    'fus-else'        : (v: FusElement) => v.tag_fus_else,
    'fus-else-if'     : (v: FusElement) => v.tag_fus_else_if,
    'fus-with'        : (v: FusElement) => v.tag_fus_with,
    'fus-for'         : (v: FusElement) => v.tag_fus_for,
    'fus-for-else'    : (v: FusElement) => v.tag_fus_for_else,
    'fus-switch'      : (v: FusElement) => v.tag_fus_switch,
    'fus-case'        : (v: FusElement) => v.tag_fus_case,
    'fus-case-default': (v: FusElement) => v.tag_fus_case_default,
    'fus-def'         : (v: FusElement) => v.tag_fus_def,
    'fus-use'         : (v: FusElement) => v.tag_fus_use,
    'fus--'           : (v: FusElement) => v.tag_fus_comment,
  };

  // Main process method
  process() {
    const tag = this.#elm.tagName;
    if (tag.startsWith('fus-')) {
      const method = FusElement.TAG_METHODS[tag];
      if (method === undefined) throw new Error('Invalid Fusen tag: ' + tag);
      return method(this);
    }
    this.process_attrs();
  }

  // process_attrs() {
  //   this.attr_fus_def();
  //   this.attr_fus_with();
  //   this.attr_fus_for();
  //   this.attr_fus_if();
  //   this.attr_fus_if_not();
  //   this.attr_fus_if_is_null();
  //   this.attr_fus_else();
  //   this.attr_fus_switch();
  //   this.attr_fus_case();
  //   this.attr_fus_use();
  //   // this.attr_fus:*
  //   // this.attr_fus:*:-if
  //   // this.attr_fus:*:-if-not
  //   // this.attr_fus-class:*:-if
  //   // this.attr_fus-class:*:-if-not
  //   this.attr_fus_v();
  // }

  attr_or_null(attr_name: string): string | null {
    return this.#elm.getAttribute(attr_name);
  }

  attr(attr_name: string, _default: string | undefined = undefined): string {
    const val = this.attr_or_null(attr_name);
    if (val === null) {
      if (_default !== undefined) return _default;
      throw new Error('Attribute not set: ' + attr_name);
    }
    return val;
  }

  has_attr(attr_name: string): boolean {
    return this.#elm.hasAttribute(attr_name);
  }

  getenv(env_name: string): EnvValue {
    return this.#env.data.get_enval(env_name);
  }

  getval(env_name: string): EnvValue {
    return this.#env.data.get_scalar(env_name);
  }

  env_add(env_name: string, val: EnvValue) {
    this.#env.data.add(env_name, val);
  }

  process_attrs() {
    if (this.has_attr('fus-def')) {
      this.fus_def(this.attr('fus-def'), 'fus-def-arg:');
    }

    for (const attr in this.#elm.attributes) {
      const alias = parse_prefix(attr, 'fus-with:');
      if (alias !== null) this.env_add(alias, this.getenv(this.attr(alias)));
    }

    if (this.has_attr('fus-for')) {
      const prefix = 'fus-for-';
      return this.fus_for({
        iter_name: this.attr(prefix + 'iter'),
        v_name: this.attr(prefix + 'name'),
        k_name: this.attr(prefix + 'keyname'),
        i_name: this.attr(prefix + 'iname'),
        i_start: Number(this.attr(prefix + 'i-start', '0')),
        i_step: Number(this.attr(prefix + 'i-step', '1')),
        to_top: this.has_attr(prefix + 'to-top'),
      });
    }

    if (this.has_attr('fus-switch')) {
      return this.fus_switch(this.attr('fus-switch'));
    }

    if (this.has_attr('fus-case')) {
      return this.fus_case(this.attr('fus-case'));
    }

    const ifopt: FusIfOptions = {
      v_name: this.attr('fus-if'),
      is_null: false,
      has_eq: this.has_attr('fus-if-eq'),
      eq: this.attr_or_null('fus-if-eq'),
      gt: Number(this._get_attr_val_or_var('fus-if-gt')),
      ge: Number(this._get_attr_val_or_var('fus-if-ge')),
      lt: Number(this._get_attr_val_or_var('fus-if-lt')),
      le: Number(this._get_attr_val_or_var('fus-if-le')),
      not: false,
    };

    let f_proc = null;
    if (this.has_attr('fus-for-else')) {
      f_proc = this.fus_for_else();
    }

    if (!f_proc) return;

    if (this.has_attr('fus-if')) {
      f_proc = this.fus_if(ifopt);
      //
    } else if (this.has_attr('fus-else-if')) {
      f_proc = this.fus_else_if(ifopt);
      //
    } else if (this.has_attr('fus-if-not')) {
      ifopt.v_name = this.attr('fus-if-not');
      ifopt.not = true;
      f_proc = this.fus_if(ifopt);
      //
    } else if (this.has_attr('fus-else-if-not')) {
      ifopt.v_name = this.attr('fus-else-if-not');
      ifopt.not = true;
      f_proc = this.fus_else_if(ifopt);
      //
    } else if (this.has_attr('fus-if-is-null')) {
      ifopt.v_name = this.attr('fus-if-is-null');
      ifopt.is_null = true;
      ifopt.not = true;
      f_proc = this.fus_if(ifopt);
      //
    } else if (this.has_attr('fus-if-is-not-null')) {
      ifopt.v_name = this.attr('fus-if-is-not-null');
      ifopt.is_null = true;
      ifopt.not = true;
      f_proc = this.fus_if(ifopt);
      //
    } else if (this.has_attr('fus-else')) {
      f_proc = this.fus_else();
    }

    if (!f_proc) return;

    if (this.has_attr('fus-use')) {
      return this.fus_use(this.attr('fus-use'), 'fus-arg:');
    }

    if (this.has_attr('fus-v')) {
      this.#elm.textContent = String(this.getval(this.attr('fus-v')) ?? '');
    } else {
      this.process_child();
    }
  }

  tag_fus_out(): void {
    const text_node = document.createTextNode(
      String(this.getval(this.attr('v')) ?? '') // Handle null
    );
    this.#elm.after(text_node);
    this.#elm.remove();
  }

  tag_fus_if(): void {
    if (this.fus_if(this._tag_fus_if_opts())) this.process_child();
  }

  tag_fus_else(): void {
    if (this.fus_else()) this.process_child();
  }

  tag_fus_else_if(): void {
    if (this.fus_else_if(this._tag_fus_if_opts())) this.process_child();
  }

  _tag_fus_if_opts(): FusIfOptions {
    return {
      v_name: this.attr('v'),
      is_null: this.has_attr('is-null'),
      has_eq: this.has_attr('eq'),
      eq: this.attr_or_null('eq'),
      gt: Number(this._get_attr_val_or_var('gt')),
      ge: Number(this._get_attr_val_or_var('ge')),
      lt: Number(this._get_attr_val_or_var('lt')),
      le: Number(this._get_attr_val_or_var('le')),
      not: this.has_attr('not'),
    };
  }

  tag_fus_for(): void {
    return this.fus_for({
      iter_name: this.attr('iter'),
      v_name: this.attr('name'),
      k_name: this.attr('keyname'),
      i_name: this.attr('iname'),
      i_start: Number(this.attr('i-start', '0')),
      i_step: Number(this.attr('i-step', '1')),
      to_top: this.has_attr('to-top'),
    });
  }

  tag_fus_for_else(): void {
    if (this.fus_for_else()) this.process_child();
  }

  tag_fus_with(): void {
    return this.fus_with();
  }

  tag_fus_switch(): void {
    return this.fus_switch(this.attr('v'));
  }

  tag_fus_case(): void {
    return this.fus_case(this.attr('value'));
  }

  tag_fus_case_default(): void {
    return this.fus_case_default();
  }

  tag_fus_def(): void {
    return this.fus_def(this.attr('name'), 'arg:');
  }

  tag_fus_use(): void {
    return this.fus_use(this.attr('name'), 'arg:');
  }

  tag_fus_comment(): void {
    return this.fus_comment();
  }

  fus_if(opt: FusIfOptions): boolean {
    const val = this.getval(opt.v_name);
    let f = null;
    if (opt.is_null) {
      f = val === null;
    } else {
      if (opt.has_eq) f = val == opt.eq;
      const nv = Number(val);
      if (f !== false && opt.gt !== null) f = nv > opt.gt;
      if (f !== false && opt.ge !== null) f = nv >= opt.ge;
      if (f !== false && opt.lt !== null) f = nv < opt.lt;
      if (f !== false && opt.le !== null) f = nv <= opt.le;
      if (f === null) f = Boolean(val);
    }
    if (opt.not) f = !f;
    return f;
  }

  fus_else(): boolean {
    return !this._get_last_if();
  }

  fus_else_if(opt: FusIfOptions): boolean {
    if (!this._get_last_if()) return this.fus_if(opt);
    return false;
  }

  _get_last_if(): boolean {
    const last_if = this.#env.sys.last_if;
    if (last_if === null) {
      throw new Error('Last element is not `if`.');
    }
    return last_if;
  }

  fus_with() {
    const new_env = this.#env.copy();
    for (const alias in this.#elm.attributes) {
      new_env.data.add(alias, this.getenv(this.attr(alias)));
    }
    this.process_child(new_env);
  }

  fus_for(opt: FusForOptions) {
    const iter_val = this.getenv(opt.iter_name);
    if (!(iter_val instanceof EnvABC))
      throw new Error('Value is not iterable.');
    let i0 = 0;
    let ival = opt.i_start;
    for (const [key, val] of iter_val.iter_kv()) {
      const child = this.clone();
      if (opt.i_name !== null) child.env_add(opt.i_name, ival);
      if (opt.k_name !== null) child.env_add(opt.k_name, key);
      if (opt.v_name !== null) child.env_add(opt.v_name, val);
      child.process();
      if (opt.to_top) {
        this.#elm.before(...child.#elm.children);
      } else {
        this.#elm.after(...child.#elm.children);
      }
      i0++;
      ival += opt.i_step;
    }
    this.#env.sys.last_for = i0;
  }

  fus_for_else(): boolean {
    return !this._get_last_if();
  }

  _get_last_for(): number | null {
    const last_for = this.#env.sys.last_for;
    if (last_for === null) {
      throw new Error('Last element is not `for`.');
    }
    return last_for;
  }

  fus_switch(v_name: string) {
    const new_env = this.#env.copy();
    const _var = this.getenv(v_name);
    if (_var === null) throw new Error('Switch variable cannot be null.');
    new_env.sys.switch_target = _var;
  }

  fus_case(value: Scalar) {
    if (!this.#env.sys.case_matched) {
      const target = this.#env.sys.switch_target;
      if (target === null) throw new Error('Switch target is not set.');
      if (target == value) {
        this.#env.sys.case_matched = true;
        this.process_child();
      }
    }
  }

  fus_case_default() {
    if (!this.#env.sys.case_matched) this.process_child();
  }

  fus_def(func_name: string, arg_prefix: string) {
    const args: string[] = [];
    for (const attr in this.#elm.attributes) {
      const argname = parse_prefix(attr, arg_prefix);
      if (argname !== null) {
        args.push(argname);
      }
    }
    const new_func = new ElementFunction(func_name, args, this.#elm, this.#env);
    this.#env.functions[func_name] = new_func;
  }

  fus_use(func_name: string, arg_prefix: string) {
    const argvals: { [key: string]: string | null } = {};
    for (const attr in this.#elm.attributes) {
      const argname = parse_prefix(attr, arg_prefix);
      if (argname !== null) {
        argvals[argname] = this.attr(attr);
      }
    }
    // use function
    const func = this.#env.functions[func_name];
    const child = func.clone();
    for (const arg in argvals) child.env_add(arg, argvals[arg]);
    child.process();
    this.#elm.after(...child.#elm.children);
    this.#elm.remove();
  }

  fus_comment() {
    // Do nothing.
  }

  process_child(env: MainEnv | null = null) {
    for (const _elm of this.#elm.children) {
      const elm = new FusElement(_elm, env ?? this.#env);
      elm.process();
    }
  }

  clone(): FusElement {
    return new FusElement(
      this.#elm.cloneNode(true) as Element,
      this.#env.copy()
    );
  }

  _get_attr_val_or_var(name: string): EnvValue {
    if (this.has_attr(name + '-v')) return this.getval(this.attr(name));
    return this.attr_or_null(name);
  }
}

interface FusForOptions {
  iter_name: string;
  v_name: string;
  k_name: string;
  i_name: string;
  i_start: number;
  i_step: number;
  to_top: boolean;
}

interface FusIfOptions {
  v_name: string;
  is_null: boolean;
  has_eq: boolean;
  eq: Scalar;
  gt: number | null;
  ge: number | null;
  lt: number | null;
  le: number | null;
  not: boolean;
}

//   f_proc_c &&= val == this.getval(elm_val);
// } else if ((elm_val = elm.getAttribute('more-than'))) {
//   f_proc_c &&= Number(val) > Number(env.data.get_scalar(elm_val));
// } else if ((elm_val = elm.getAttribute('more-than-eq'))) {
//   f_proc_c &&= Number(val) >= Number(env.data.get_scalar(elm_val));
// } else if ((elm_val = elm.getAttribute('less-than'))) {
//   f_proc_c &&= Number(val) < Number(env.data.get_scalar(elm_val));
// } else if ((elm_val = elm.getAttribute('less-than-eq'))) {
//   f_proc_c &&= Number(val) <= Number(env.data.get_scalar(elm_val));
// }

class ElementFunction extends FusElement {
  #name: string;
  #args: string[];

  constructor(name: string, args: string[], elm: Element, env: MainEnv) {
    super(elm, env);
    this.#name = name;
    this.#args = args;
  }

  get name() {
    return this.#name;
  }

  get args() {
    return this.#args;
  }
}

function parse_prefix(
  target: string,
  prefix: string,
  _default: string | null = null
): string | null {
  const len_prefix = prefix.length;
  if (target.slice(0, len_prefix) == prefix) return target.slice(len_prefix);
  return _default;
}

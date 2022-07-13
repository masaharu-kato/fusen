import { JSONValue, data_by_path } from './data';

export class Evaluator {
  data: JSONValue;
  locals: { [name: string]: JSONValue };

  constructor(data: JSONValue, locals: { [name: string]: JSONValue } = {}) {
    this.data = data;
    this.locals = locals;
  }

  copy_with_locals(locals: { [name: string]: JSONValue } = {}): Evaluator {
    return new Evaluator(this.data, Object.assign(this.locals, locals));
  }

  get_by_path(path: string): JSONValue {
    if (this.locals) {
      const v_local = data_by_path(this.locals, path);
      if (v_local !== undefined) return v_local;
    }
    const v_data = data_by_path(this.data, path);
    if (v_data !== undefined) return v_data;
    throw new Error(`Undefined value on path '${path}'`);
  }

  eval(code: string) {
    return this.get_by_path(code);
  }

  eval_bool(code: string): boolean {
    return !!this.eval(code);
  }

  eval_num(code: string): number {
    const val = this.eval(code);
    if (val instanceof Object) throw new TypeError('Cannot convert object to number.');
    return Number(val);
  }

  eval_str(code: string): string {
    const val = this.eval(code);
    if (val instanceof Object) throw new TypeError('Cannot convert object to number.');
    return '' + val;
  }

  *eval_iter(code: string): Generator<JSONValue, void> {
    const val = this.eval(code);
    if (!(val instanceof Object)) throw new TypeError('Cannot iterate non-object value.');
    if (val instanceof Array) {
      for (const v of val) yield v;
    } else {
      for (const v in val) yield val[v];
    }
  }

  *eval_iter_kv(code: string): Generator<[string, JSONValue], void> {
    const val = this.eval(code);
    if (!(val instanceof Object) || val instanceof Array) throw new TypeError('Cannot iterate with key for array or non-object value.');
    for (const v in val) yield [v, val[v]];
  }
}

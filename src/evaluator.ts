import { JSONValue, multi_data_by_path } from './data';

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
    const value = multi_data_by_path([this.locals, this.data], path);
    if (value === undefined) throw new Error(`Value not found on path '${path}'`);
    return value;
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
    if (!(val instanceof Array)) throw new TypeError('Cannot iterate non-array value.');
    for (const v of val) yield v;
  }

  *eval_iter_kv(code: string): Generator<[string, JSONValue], void> {
    const val = this.eval(code);
    if (!(val instanceof Object) || val instanceof Array) throw new TypeError('Cannot iterate with key for array or non-object value.');
    for (const v in val) yield [v, val[v]];
  }
}

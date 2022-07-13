export type JSONValue = null | boolean | number | string | JSONArray | JSONObject;
export type JSONArray = JSONValue[];
export type JSONObject = { [key: string]: JSONValue };

export function data_by_name(data: JSONValue, name: string): JSONValue | undefined {
  name = name.trim();
  if (data instanceof Array) return data[parseInt(name)];
  if (data instanceof Object) return data[name];
  throw new Error(`Invalid property '${name}'.`);
}

export function data_by_path(data: JSONValue, path: string): JSONValue | undefined {
  const dot0_pos = path.indexOf('.');
  if (dot0_pos < 0) return data_by_name(data, path);

  const name0 = path.slice(0, dot0_pos);
  const data0 = data_by_name(data, name0);

  const name_rest = path.slice(dot0_pos).trim();
  if (name_rest) {
    if (data0 === undefined) throw new Error('Cannot access to undefined value.');
    return data_by_name(data0, name_rest);
  }
  return data0;
}

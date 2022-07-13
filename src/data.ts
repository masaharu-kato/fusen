export type JSONValue = null | boolean | number | string | JSONArray | JSONObject;
export type JSONArray = JSONValue[];
export type JSONObject = { [key: string]: JSONValue };

const PATH_DELIMITER = '.';
function _split_path_first(path: string): [string, string] {
  //  Find first dot character in path and split
  const dot0_pos = path.indexOf(PATH_DELIMITER);
  const name0 = dot0_pos >= 0 ? path.slice(0, dot0_pos) : path;
  const name_rest = dot0_pos >= 0 ? path.slice(dot0_pos + PATH_DELIMITER.length).trim() : '';
  return [name0, name_rest];
}

export function data_by_name(data: JSONValue, name: string): JSONValue | undefined {
  name = name.trim();
  if (!(data instanceof Object) || data instanceof Array) throw new Error(`Invalid data type.`);
  return data[name];
}

export function data_by_path(data: JSONValue, path: string): JSONValue | undefined {
  const [name0, name_rest] = _split_path_first(path);
  const data0 = data_by_name(data, name0);
  if (data0 === undefined || !name_rest) return data0;
  return data_by_path(data0, name_rest);
}

export function multi_data_by_name(data_list: Array<JSONValue>, name: string): JSONValue | undefined {
  name = name.trim();
  for (const data of data_list) {
    if (!(data instanceof Object) || data instanceof Array) throw new Error(`Invalid data type.`);
    const value = data[name];
    if (value !== undefined) return value;
  }
  return undefined;
}

export function multi_data_by_path(data_list: Array<JSONValue>, path: string): JSONValue | undefined {
  const [name0, name_rest] = _split_path_first(path);
  const data0 = multi_data_by_name(data_list, name0);
  if (data0 === undefined || !name_rest) return data0;
  return data_by_path(data0, name_rest);
}

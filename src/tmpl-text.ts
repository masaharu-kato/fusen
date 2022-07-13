import assert from 'assert';
import { Evaluator } from './evaluator';

interface _PosCode {
  pos: number;
  code: string;
}

const DEFAULT_CODE_REGEX = new RegExp(/{{(.*?)}}/g);

export class TemplateText {
  plain_text: string;
  pos_codes: Array<_PosCode>;

  constructor(text_with_codes: string, code_regex = DEFAULT_CODE_REGEX) {
    let plain_text = '';
    const pos_codes = new Array<_PosCode>();

    let last_code_end_pos = 0;
    for (const match of text_with_codes.matchAll(code_regex)) {
      assert(match.index !== undefined);
      plain_text += text_with_codes.slice(last_code_end_pos, match.index);
      pos_codes.push({ pos: plain_text.length, code: match[1] });
      last_code_end_pos = match.index + match[0].length;
    }
    plain_text += text_with_codes.slice(last_code_end_pos);

    this.plain_text = plain_text;
    this.pos_codes = pos_codes;
  }

  make_text(evaluator: Evaluator): string {
    let output = '';
    let last_pos = 0;
    for (const pos_code of this.pos_codes) {
      output += this.plain_text.slice(last_pos, pos_code.pos);
      output += evaluator.eval_str(pos_code.code);
      last_pos = pos_code.pos;
    }
    output += this.plain_text.slice(last_pos);
    return output;
  }

  has_codes(): boolean {
    return Boolean(this.pos_codes.length);
  }
}

import { hello } from '../src';

describe('Test hello()', () => {
  it('Output `Hello.`', () => {
    const log = jest.spyOn(console, 'log').mockReturnValue();

    hello();

    expect(log).toHaveBeenNthCalledWith(1, 'Hello.');

    log.mockRestore();
  });
});

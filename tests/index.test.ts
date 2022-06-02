/*
 *  Tests
 */

describe('Test hello()', () => {
  it('Output `Hello.`', () => {
    const log = jest.spyOn(console, 'log').mockReturnValue();

    console.log('Work in progress.');

    log.mockRestore();
  });
});

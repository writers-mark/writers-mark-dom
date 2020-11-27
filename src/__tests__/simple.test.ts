import { screen } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { dangerousRender } from '..';
import { Context } from 'writers-mark';

describe('test suite', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.body.removeAttribute('class');
  });

  test('Simple rendering', () => {
    const ctx = new Context();

    const style = ctx.compileStyle('para aaa {color: red;} para aaa {color: blue;}');
    const text = ctx.compileText('aaa\nallo!', [style]);

    dangerousRender(text, document.body);
    expect(screen.getByText('allo!')).toHaveStyle({ color: 'blue' });
  });

  test('Cleanup', () => {
    const ctx = new Context();

    const style = ctx.compileStyle('para aaa {color: red;}');
    const text = ctx.compileText('aaa\nallo!', [style]);

    const { styleElement } = dangerousRender(text, document.body);
    expect(screen.getByText('allo!')).toHaveStyle({ color: 'red' });
    document.head.removeChild(styleElement);

    expect(screen.getByText('allo!')).not.toHaveStyle({ color: 'red' });
  });

  test('Custom prefix', () => {
    const ctx = new Context();

    const style = ctx.compileStyle('para aaa {color: red;}');
    const text = ctx.compileText('aaa\nallo!', [style]);

    dangerousRender(text, document.body, { classPrefix: 'yohoho' });
    expect(screen.getByText('allo!').className).toContain('yohoho');
  });

  test('Combine Styles', () => {
    const ctx = new Context();

    const style1 = ctx.compileStyle('para aaa {color: red;}');
    const style2 = ctx.compileStyle('para aaa {margin: 12px;}');
    const text = ctx.compileText('aaa\nallo!', [style1, style2]);

    dangerousRender(text, document.body);
    expect(screen.getByText('allo!')).toHaveStyle({
      color: 'red',
      margin: '12px',
    });
  });

  test('Apply Container style', () => {
    const ctx = new Context();

    const style = ctx.compileStyle('cont {color: red;}');
    const text = ctx.compileText('allo!', [style]);

    dangerousRender(text, document.body);
    expect(document.body).toHaveStyle({ color: 'red' });
  });

  test('Apply two classes', () => {
    const ctx = new Context();

    const style = ctx.compileStyle('para aaa {color: red;} para bbb {margin: 12px;}');
    const text = ctx.compileText('aaa\nbbb\nallo!', [style]);

    dangerousRender(text, document.body);
    expect(screen.getByText('allo!')).toHaveStyle({
      color: 'red',
      margin: '12px',
    });
  });

  test('simple span', () => {
    const ctx = new Context();

    const style = ctx.compileStyle('span # {color: red;}');
    const text = ctx.compileText('hello #world#', [style]);

    dangerousRender(text, document.body);
    expect(screen.getByText('hello')).not.toHaveStyle({
      color: 'red',
    });

    expect(screen.getByText('world')).toHaveStyle({
      color: 'red',
    });
  });
});

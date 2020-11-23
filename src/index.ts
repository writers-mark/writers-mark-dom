import * as WM from 'writers-mark';
import { StyleRule } from 'writers-mark/lib/style';
import { Content, Span } from 'writers-mark/lib/text';

let nextUniqueNumber = 1;
const makeUniqueIndentifier = (prefix: string): string => {
  return prefix + (nextUniqueNumber++).toString();
};

const combineStyles = (
  styles: WM.Style[],
  classPrefix: string,
): [Record<string, Record<string, string>>, Record<string, string>] => {
  const classMapping: Record<string, string> = {};
  const cssClasses: Record<string, Record<string, string>> = {};

  const applyRules = (key: string, rule: StyleRule) => {
    if (!cssClasses[key]) {
      cssClasses[key] = {};
      classMapping[key] = makeUniqueIndentifier(classPrefix);
    }

    const tgt = cssClasses[key];
    for (const prop of Object.keys(rule.props)) {
      tgt[prop] = rule.props[prop];
    }
  };

  for (const style of styles) {
    if (style.cont) {
      applyRules('c_', style.cont);
    }

    Object.keys(style.para).forEach((k) => applyRules('p_' + k, style.para[k]));
    Object.keys(style.span).forEach((k) => applyRules('s_' + k, style.span[k]));
  }

  return [cssClasses, classMapping];
};

const renderContent = (content: Content, classMapping: Record<string, string>): Node => {
  const asSpan = content as Span;
  if (asSpan.contents && asSpan.styles) {
    const result = document.createElement('span');

    asSpan.styles.forEach((s) => result.classList.add(classMapping['s_' + s]));
    asSpan.contents.forEach((c) => result.appendChild(renderContent(c, classMapping)));

    return result;
  } else {
    return document.createTextNode(content as string);
  }
};

/** Creates the stylesheet for a block of Writer's Mark, and appends it to the document. Usefull for alternate renderers.
 *
 * @param text The text that will be rendered with this style.
 * @param doc The target document
 * @param classPrefix A string prefixed to all generated CSS classes.
 * @returns A callback that will cleanup the DOM's CSS stylesheet, and a mapping of internal classes to generated CSS class names.
 */
export const createStylesheet = (
  text: WM.Text,
  doc: HTMLDocument,
  classPrefix: string,
): [Record<string, string>, () => void] => {
  const [classes, mapping] = combineStyles(text.styles, classPrefix);
  const stylesheet = doc.createElement('style');
  doc.head.appendChild(stylesheet);

  for (const ruleKey of Object.keys(classes)) {
    const ruleProps = classes[ruleKey];
    let cssText = '.' + mapping[ruleKey] + '{';
    Object.keys(ruleProps).forEach((k) => {
      cssText += k + ': ' + ruleProps[k] + ';';
    });
    cssText += '}';
    stylesheet.sheet!.insertRule(cssText, stylesheet.sheet!.cssRules.length);
  }

  return [
    mapping,
    () => {
      doc.head.removeChild(stylesheet);
    },
  ];
};

/** Renders a block of Writer's Mark.
 *
 * @param text The text to render
 * @param target Container node to add the rendered content to.
 * @param classPrefix A string prefixed to all generated CSS classes.
 * @returns A callback that will cleanup the DOM's CSS stylesheet.
 */
export const render = (text: WM.Text, target: HTMLElement, classPrefix: string = 'wm__'): (() => void) => {
  const doc = target.ownerDocument;
  const [mapping, cleanup] = createStylesheet(text, target.ownerDocument, classPrefix);

  // This is to prevent closing around the full mapping in the returned callback.
  let cMapping: string | undefined;

  if (mapping.c_) {
    cMapping = mapping.c_;
    target.classList.add(mapping.c_);
  }

  for (const para of text.paragraphs) {
    const pElem = doc.createElement('p');

    para.styles.forEach((s) => pElem.classList.add(mapping['p_' + s]));
    para.contents.forEach((c) => pElem.appendChild(renderContent(c, mapping)));

    target.appendChild(pElem);
  }

  return () => {
    if (cMapping) {
      target.classList.remove(cMapping);
    }
    cleanup();
  };
};

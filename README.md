# Writer's Mark Dom Renderer

[![npm](https://badgen.net/npm/v/writers-mark-dom)](https://www.npmjs.com/package/writers-mark-dom)
[![install size](https://packagephobia.com/badge?p=writers-mark-dom)](https://packagephobia.com/result?p=writers-mark-dom)
[![github actions](https://github.com/writers-mark/writers-mark-dom/workflows/Tests/badge.svg)](https://github.com/writers-mark/writers-mark-dom/actions)
[![Known Vulnerabilities](https://snyk.io/test/github/writers-mark/writers-mark-dom/badge.svg?targetFile=package.json)](https://snyk.io/test/github/writers-mark/writers-mark-dom?targetFile=package.json)
[![codecov.io](https://codecov.io/github/writers-mark/writers-mark-dom/coverage.svg?branch=master)](https://codecov.io/github/writers-mark/writers-mark-dom?branch=master)

A standalone DOM renderer for [writers-mark](https://github.com/writers-mark/writers-mark)

## Installation

```
npm install writers-mark writers-mark-dom
```

## Usage

This library is meant to consume the output of the core [writers-mark-ts](https://github.com/writers-mark/writers-mark-ts) library.

The only real caveat to keep in mind is that the renderer works by injecting CSS rules into the DOM. 
The `render()` function returns a callback that will clean things up. This is particulalrly important if this will be used as part of a single page app.
Alternatively, if you use react, you could use [writers-mark-react](https://github.com/writers-mark/writers-mark-react) that will handle that part for you.

```
import {Context} from 'writers-mark'
import {render} from 'writers-mark-dom'

const ctx = new Context();

const style = ctx.compileStyle(styleString);
const text = ctx.compileText(contextString, [style]);

const cleanupCss = render(text, document.getElementById('root'));

// Eventually:
cleanupCss();
```
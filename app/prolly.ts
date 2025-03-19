import 'react-native-skia-offscreencanvas/polyfill';
import 'text-encoding-polyfill'; // support TextEncoder
import { Buffer } from 'buffer';
import XRegExp from 'xregexp';

const applyGlobalPolyfills = () => {
  // Apply Buffer polyfill
  global.Buffer = Buffer;

  // Replace default RegExp to support unicode
  const nativeRegExp = global.RegExp;
  const newRegExp = function(this: any, ...args: any) {
    global.RegExp = nativeRegExp;
    const result = XRegExp.apply(this, args);
    global.RegExp = newRegExp as any;
    return result;
  } as unknown as RegExpConstructor;
  
  Object.defineProperties(newRegExp, Object.getOwnPropertyDescriptors(nativeRegExp));
  global.RegExp = newRegExp;
};

export default applyGlobalPolyfills;

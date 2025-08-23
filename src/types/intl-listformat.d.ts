declare namespace Intl {
  // Minimal type declaration for ListFormat
  class ListFormat {
    constructor(locales?: string | string[], options?: ListFormatOptions);
    format(list: Array<string>): string;
    formatToParts(list: Array<string>): Array<{ type: string; value: string }>;
  }
  interface ListFormatOptions {
    localeMatcher?: 'best fit' | 'lookup';
    type?: 'conjunction' | 'disjunction' | 'unit';
    style?: 'long' | 'short' | 'narrow';
  }
}

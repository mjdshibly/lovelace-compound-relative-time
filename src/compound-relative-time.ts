import { LitElement, html, css } from 'lit';
import { property, customElement } from 'lit/decorators.js';

@customElement('compound-relative-time')
export class CompoundRelativeTime extends LitElement {
  @property({ type: String }) datetime = '';
  @property({ type: String }) locale = 'en';

  private timer?: number;

  static styles = css`
    :host {
      display: inline;
      font-family: sans-serif;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.timer = window.setInterval(() => this.requestUpdate(), 60000); // update every minute
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.timer) clearInterval(this.timer);
  }

  render() {
    const now = new Date();
    const target = new Date(this.datetime);
    const diffMs = target.getTime() - now.getTime();
    const tense = diffMs < 0 ? 'past' : 'future';
    const absMs = Math.abs(diffMs);
    const duration = this.msToDuration(absMs);
    const formatted = formatWithContext(duration, this.locale, tense);
    return html`${formatted}`;
  }

  msToDuration(ms: number) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    return {
      days,
      hours: hours % 24,
      minutes: minutes % 60,
      seconds: seconds % 60
    };
  }
}

// Include your formatter functions here: formatWithContext, formatCompoundDuration, getLocalizedUnit, getArabicUnit
function formatCompoundDuration(duration, locale = 'en') {
  const units = ['days', 'hours', 'minutes', 'seconds'];
  const numberFormatter = new Intl.NumberFormat(locale);
  let listFormatter;
  if (typeof Intl.ListFormat === 'function') {
    listFormatter = new Intl.ListFormat(locale, {
      style: 'long',
      type: 'conjunction'
    });
  }

  const parts = units
    .filter(unit => duration[unit])
    .map(unit => {
      const value = duration[unit];
      const label = getLocalizedUnit(unit, value, locale);
      return `${numberFormatter.format(value)} ${label}`;
    });

  if (listFormatter) {
    return listFormatter.format(parts);
  } else {
    // Fallback: join with commas and 'and'
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
  }
}

function getLocalizedUnit(unit, value, locale) {
  if (locale === 'ar') {
    return getArabicUnit(unit, value);
  }

  const labels = {
    en: {
      days: ['day', 'days'],
      hours: ['hour', 'hours'],
      minutes: ['minute', 'minutes'],
      seconds: ['second', 'seconds']
    },
    nl: {
      days: ['dag', 'dagen'],
      hours: ['uur', 'uur'], // invariant
      minutes: ['minuut', 'minuten'],
      seconds: ['seconde', 'seconden']
    }
  };

  const [singular, plural] = labels[locale]?.[unit] || [unit, unit + 's'];
  return value === 1 ? singular : plural;
}

function getArabicUnit(unit, value) {
  const forms = {
    days: { 1: 'يوم', 2: 'يومان', plural: 'أيام' },
    hours: { 1: 'ساعة', 2: 'ساعتان', plural: 'ساعات' },
    minutes: { 1: 'دقيقة', 2: 'دقيقتان', plural: 'دقائق' },
    seconds: { 1: 'ثانية', 2: 'ثانيتان', plural: 'ثوانٍ' }
  };

  if (value === 1) return forms[unit][1];
  if (value === 2) return forms[unit][2];
  return forms[unit].plural;
}

function formatWithContext(duration, locale = 'en', tense = 'past') {
  const phrase = formatCompoundDuration(duration, locale);
  if (locale === 'en') {
    return tense === 'past' ? `${phrase} ago` : `in ${phrase}`;
  } else if (locale === 'nl') {
    return tense === 'past' ? `${phrase} geleden` : `over ${phrase}`;
  } else if (locale === 'ar') {
    return tense === 'past' ? `منذ ${phrase}` : `بعد ${phrase}`;
  }
  return phrase;
}

// console.log(formatWithContext({ hours: 1, minutes: 30 }, 'en', 'future'));
// → "in 1 hour and 30 minutes"

// console.log(formatWithContext({ days: 2, hours: 4 }, 'nl', 'past'));
// → "2 dagen en 4 uur geleden"

// console.log(formatWithContext({ hours: 2, minutes: 15 }, 'ar', 'past'));
// → "منذ ساعتان و ١٥ دقائق"
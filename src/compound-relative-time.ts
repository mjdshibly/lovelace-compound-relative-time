import { HomeAssistant } from 'custom-card-helpers';
import { LitElement, html, css } from 'lit';
import { property, customElement, state } from 'lit/decorators.js';

@customElement('compound-relative-time')
export class CompoundRelativeTime extends LitElement {
  @property({ type: String }) datetime = '';
  @property({ type: String }) locale = 'en';
  @state() private hass!: HomeAssistant;

  private timer?: number;
  private entityId?: string;
  private _lastHtml?: unknown = undefined;

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

    if (this.hass && this.entityId && this.hass.states[this.entityId]) {
      this.datetime = this.hass.states[this.entityId].state;
    }

    if (!this.datetime) {
      this._lastHtml = html`<span>No datetime provided</span>`;
      return this._lastHtml;
    }

    const target = new Date(this.datetime);
    const diffMs = target.getTime() - now.getTime();
    const tense = diffMs < 0 ? 'past' : 'future';
    const absMs = Math.abs(diffMs);
    const duration = this.msToDuration(absMs);
    const formatted = formatWithContext(duration, this.locale, tense);
    this._lastHtml = html`${formatted}`;

    return this._lastHtml;
  }

  msToDuration(ms: number) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    const remainingDays = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    const units = [remainingDays, remainingHours, remainingMinutes, remainingSeconds];

    // Make sure that only the two most significant non-zero units are shown because, for example,
    // minutes and seconds do not add much value when days and hours are present, etc.
    // E.g. "1 day and 3 hours", "2 hours and 15 minutes", "5 minutes and 30 seconds"

    let indexOfThirdNonZero = 0;
    for (let i = 0, count = 0; i < units.length; i++) {
      if (units[i] !== 0) {
        count++;
        if (count === 3) {
          indexOfThirdNonZero = i;
          break;
        }
      }
    }

    for (let i = indexOfThirdNonZero; i < units.length; i++) {
      units[i] = 0;
    }

    return {
      days: units[0],
      hours: units[1],
      minutes: units[2],
      seconds: units[3]
    };
  }

  setConfig(config) {
    console.log("Condddfig set:", config);
    if (!config.entity) {
      throw new Error('You need to define an entity');
    }
    this.entityId = config.entity;
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
    return tense === 'past' ? `${phrase} ago` : `In ${phrase}`;
  } else if (locale === 'nl') {
    return tense === 'past' ? `${phrase} geleden` : `Over ${phrase}`;
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
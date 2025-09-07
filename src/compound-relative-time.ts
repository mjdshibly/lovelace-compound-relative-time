import { HomeAssistant } from 'custom-card-helpers';
import { LitElement, html, css, noChange } from 'lit';
import { property, customElement, state } from 'lit/decorators.js';
import { BoilerplateCardConfig } from './types';

@customElement('compound-relative-time')
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class CompoundRelativeTime extends LitElement
{
  private config?: BoilerplateCardConfig;
  // HA state - assigned by HA every time the state changes
  hass!: HomeAssistant;
  // Class properties
  private timer?: number;

  static styles = [
    css`
      :host {
        display: block;
        box-sizing: border-box;
        width: 100%;
        max-width: 400px;
        margin: var(--tile-card-margin);
      }
      ha-card {
        display: flex;
        flex-direction: column;
        padding: 10px;
        box-sizing: border-box;
        background: var(--card-background-color, white);
        color: var(--primary-text-color, #212121);
        border-radius: var(--ha-card-border-radius, 12px);
        box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0,0,0,0.1));
        width: 100%;
      }
      .tile-row {
        display: flex;
        align-items: center;
      }
      .tile-icon {
        font-size: 14px;
        margin-right: 16px;
        color: var(--state-icon-color, #44739e);
        flex-shrink: 0;
      }
      .tile-text {
        display: flex;
        flex-direction: column;
        justify-content: center;
        flex: 1;
      }
      .tile-title {
        font-size: 1.1em;
        font-weight: 500;
        line-height: 1.2;
      }
      .tile-content {
        font-size: 0.9em;
        line-height: 1.2;
        word-break: break-word;
      }
      .warning {
        color: var(--error-color, #b71c1c);
        font-size: 1em;
        margin-top: 8px;
      }
    `
  ];

  static getConfigForm() {
    return {
      schema: [
        { name: 'entity', selector: { entity: {} }, required: true },
        { name: 'name', selector: { text: {} } },
        { name: 'icon', selector: { icon: {} } },
        { name: 'locale', selector: { text: {} } },
      ]
    }
  }

  setConfig(config: BoilerplateCardConfig) {
    if (!config.entity) {
      throw new Error('You need to define an entity');
    }

    this.config = config;
  }

  public getGridOptions() {
    return {
      min_columns: 6,
      min_rows: 1,
      columns: 6,
      rows: 1,
    };
  }

  render() {
    if (!this.config) {
      return html`<ha-card><div class="warning">Card not configured!</div></ha-card>`;
    }

    // console.log(this.config)

    const now = new Date();
    const target = new Date(this.hass.states[this.config.entity].state);

    const name = this.config.name ?? this.hass.states[this.config.entity]?.attributes?.friendly_name ?? 'Relative Time';
    const icon = this.config.icon ?? this.hass.states[this.config.entity]?.attributes?.icon ?? 'mdi:clock-outline';
    const locale = this.config.locale ?? 'en';

    const timeHtml = html`<span title="${target}">${createFormattedTimeString(now, target, locale)}</span>`;

    return html`
      <ha-card>
        <div class="tile-row">
          <ha-icon class="tile-icon" .icon="${icon}"></ha-icon>
          <div class="tile-text">
            <span class="tile-title">${name}</span>
            <span class="tile-content">${timeHtml}</span>
          </div>
        </div>
      </ha-card>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    this.timer = window.setInterval(() => this.requestUpdate(), 1000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.timer)
      clearInterval(this.timer);
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
      days: ['d', 'd'],
      hours: ['h', 'h'],
      minutes: ['m', 'm'],
      seconds: ['s', 's']
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

function msToDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  const remainingDays = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;
  const units = [remainingDays, remainingHours, remainingMinutes, remainingSeconds];

  // console.log(`ms: ${ms} → ${remainingDays}d ${remainingHours}h ${remainingMinutes}m ${remainingSeconds}s`);

  // Make sure that only the two most significant non-zero units are shown because, for example,
  // minutes and seconds do not add much value when days and hours are present, etc.
  // E.g. "1 day and 3 hours", "2 hours and 15 minutes", "5 minutes and 30 seconds"
  for (let i = 0; i < units.length - 2; i++) {
    if (units[i] !== 0 && units[i + 1] !== 0) {
      // zero out all less significant units
      for (let j = i + 2; j < units.length; j++) {
        units[j] = 0;
      }
      break;
    }
  }

  return {
    days: units[0],
    hours: units[1],
    minutes: units[2],
    seconds: units[3]
  };
}

function createFormattedTimeString(sourceTime: Date, targetTime: Date, locale = 'en'): string {
  const diffMs = targetTime.getTime() - sourceTime.getTime();
  const tense = diffMs < 0 ? 'past' : 'future';
  const absMs = Math.abs(diffMs);
  const duration = msToDuration(absMs);

  const formatted = formatWithContext(duration, locale, tense);

  // console.log(`now: ${sourceTime.toISOString()}, target: ${targetTime.toISOString()}, diffMs: ${diffMs}, duration:`, duration, `→ formatted: ${formatted}`);

  return formatted;
}


// eslint-disable-next-line @typescript-eslint/no-unused-vars
function test() {
  // 1 day, 2 hours, 30 minutes, 45 seconds ago
  const now = new Date();
  const past = new Date(now.getTime() + ((1 * 24 * 60 * 60) + (2 * 60 * 60) + (30 * 60) + 45) * 1000);
  console.log(createFormattedTimeString(now, past));
  // 1 hour, 15 minutes from now
  const future = new Date(now.getTime() + ((1 * 60 * 60) + (15 * 60)) * 1000);
  console.log(createFormattedTimeString(now, future));
  // 1 day, 3 hours from now
  const future2 = new Date(now.getTime() + ((1 * 24 * 60 * 60) + (3 * 60 * 60)) * 1000);
  console.log(createFormattedTimeString(now, future2));
  // 1 day, 0 hours, 0 minutes, 5 seconds ago
  const past2 = new Date(now.getTime() + ((1 * 24 * 60 * 60) + (5)) * 1000);
  console.log(createFormattedTimeString(now, past2));
  // 1 day, 4 hours, 0 minutes, 5 seconds ago
  const past3 = new Date(now.getTime() + ((1 * 24 * 60 * 60) + (4 * 60 * 60) + (5)) * 1000);
  console.log(createFormattedTimeString(now, past3));
  // 4 hours, 0 minutes, 5 seconds ago
  const past4 = new Date(now.getTime() + ((4 * 60 * 60) + (5)) * 1000);
  console.log(createFormattedTimeString(now, past4));
  // 4 hours, 5 minutes, 0 seconds ago
  const past5 = new Date(now.getTime() + ((4 * 60 * 60) + (5 * 60)) * 1000);
  console.log(createFormattedTimeString(now, past5));
}


// console.log(formatWithContext({ hours: 1, minutes: 30 }, 'en', 'future'));
// → "in 1 hour and 30 minutes"

// console.log(formatWithContext({ days: 2, hours: 4 }, 'nl', 'past'));
// → "2 dagen en 4 uur geleden"

// console.log(formatWithContext({ hours: 2, minutes: 15 }, 'ar', 'past'));
// → "منذ ساعتان و ١٥ دقائق"
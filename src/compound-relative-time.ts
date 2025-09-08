import { ActionHandlerEvent, handleAction, hasAction, HomeAssistant } from 'custom-card-helpers';
import { LitElement, html, css, noChange } from 'lit';
import { property, customElement, state } from 'lit/decorators.js';
import { BoilerplateCardConfig } from './types';
import { mdiGestureTap } from "@mdi/js";
import { actionHandler } from './action-handler-directive';
import { ifDefined } from "lit/directives/if-defined";
import { createCompoundRelativeTimeString } from './time';

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
            .tile-row {
                display: flex;
                align-items: center;
                padding: 10px;
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

                text-overflow: ellipsis;
                overflow: hidden;
                white-space: nowrap;
            }
            .tile-title {
                font-size: 1.1em;
                font-weight: 500;
                line-height: 1.2;

                text-overflow: ellipsis;
                overflow: hidden;
                white-space: nowrap;
            }
            .tile-content {
                font-size: 0.9em;
                line-height: 1.2;

                text-overflow: ellipsis;
                overflow: hidden;
                white-space: nowrap;
            }
            .warning {
                color: var(--error-color, #b71c1c);
                font-size: 1em;
                margin-top: 8px;
            }
            [role="button"] {
                cursor: pointer;
                pointer-events: auto;
            }
                [role="button"]:focus {
                outline: none;
            }
        `,
    ];

    static getConfigForm()
    {
        return {
            schema: [
                { name: 'entity', selector: { entity: {} }, required: true },
                { name: 'name', selector: { text: {} } },
                { name: 'icon', selector: { icon: {} } },
                { name: 'locale', selector: { text: {} } },
                {
                    name: "interactions",
                    type: "expandable",
                    flatten: true,
                    iconPath: mdiGestureTap,
                    schema: [
                        {
                            name: "tap_action",
                            selector: {
                                ui_action: {
                                    default_action: "more-info", // Has to be stay this way to match the built in default of imported action handling functions.
                                    actions: [ "more-info", "toggle", "call-service", "navigate", "url", "none" ],
                                },
                            },
                        },
                    ],
                },
            ],
        };
    }

    setConfig(config: BoilerplateCardConfig)
    {
        if (!config.entity) {
            throw new Error('You need to define an entity');
        }

        // console.log(config);

        this.config = {
            // tap_action must always be defined for imported action handling functions to work.
            // Those function have a default tap_action of "more-info" built in them.
            // The user needs to explicitly set tap_action to "none" to disable it.
            tap_action: {
                action: "more-info",
            },
            ...config,
        };
    }

    public getGridOptions()
    {
        return {
            min_columns: 6,
            min_rows: 1,
            columns: 6,
            rows: 1,
        };
    }

    connectedCallback()
    {
        super.connectedCallback();
        this.timer = window.setInterval(() => this.requestUpdate(), 1000);
    }

    disconnectedCallback()
    {
        super.disconnectedCallback();
        if (this.timer)
            clearInterval(this.timer);
    }

    render()
    {
        if (!this.config) {
            return html`<ha-card><div class="warning">Card not configured!</div></ha-card>`;
        }

        // console.log(this.config)

        const now = new Date();
        const target = new Date(this.hass.states[ this.config.entity ].state);

        const name = this.config.name ?? this.hass.states[ this.config.entity ]?.attributes?.friendly_name ?? 'Relative Time';
        const icon = this.config.icon ?? this.hass.states[ this.config.entity ]?.attributes?.icon ?? 'mdi:clock-outline';
        const locale = this.config.locale ?? 'en';


        const fullTimeString = createCompoundRelativeTimeString(now, target, locale);

        // Check if the string is too long to fit in the card nicely.

        return html`
            <!-- Action handling is magic copied from HA's src/panels/lovelace/cards/hui-tile-card.ts -->
            <!-- Template guy just copied actionHandler from HA's source -->
            <ha-card
                @action=${this.handleAction}
                .actionHandler=${actionHandler({
                    hasHold: hasAction(this.config.hold_action),
                    hasDoubleClick: hasAction(this.config.double_tap_action),
                })}
                role=${ifDefined(this.hasCardAction ? "button" : undefined)}
                tabindex=${ifDefined(this.hasCardAction ? "0" : undefined)}
            >
                <ha-ripple .disabled=${!this.hasCardAction}></ha-ripple>
                <div class="tile-row">
                    <ha-icon class="tile-icon" .icon="${icon}"></ha-icon>
                    <div class="tile-text">
                        <span class="tile-title">${name}</span>
                        <span class="tile-content">${fullTimeString}</span>
                    </div>
                </div>
            </ha-card>
        `;
    }

    private get hasCardAction() {
        const res = (
            !this.config?.tap_action ||
            hasAction(this.config?.tap_action) ||
            hasAction(this.config?.hold_action) ||
            hasAction(this.config?.double_tap_action)
        );
        return res;
    }

    private handleAction(ev: ActionHandlerEvent): void
    {
        if (this.hass && this.config && ev.detail.action) {
            handleAction(this, this.hass, this.config, ev.detail.action);
        }
    }
}

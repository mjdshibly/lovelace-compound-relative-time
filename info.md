# Compound Relative Time

A custom frontend component for Home Assistant that displays compound durations like "2 days and 4 hours ago" with full localization support for English, Dutch, and Arabic.

## Features
- Compound time units
- Contextual phrases ("ago", "in")
- Auto-updating
- RTL support for Arabic

## Usage

```yaml
type: custom:compound-relative-time
datetime: '2025-08-23T04:30:00'
locale: 'nl'

# catppuccin-resonance

A CLI tool for generating custom [Catppuccin](https://github.com/catppuccin/catppuccin)-flavored themes harmonized to a seed color.

Produces light and dark themes based on **Catppuccin Latte** and **Catppuccin Mocha**, with accent colors shifted toward your seed using [Material Color Utilities](https://github.com/material-foundation/material-color-utilities)' `Blend.harmonize()` algorithm (HCT color space, ≤15° hue shift).

Themes follow the [Catppuccin style guide](https://github.com/catppuccin/catppuccin/blob/main/docs/style-guide.md).

## Usage

```bash
npm install

# Interactive — prompts for name, seed color, and pin option
npm run gen

# CLI flags
npm run gen -- --name "Resonance" --source "#5E81AC" --pin-source
```

### Flags

| Flag | Description |
|------|-------------|
| `--name <name>` | Theme name (e.g. `"Resonance"`) |
| `--source <hex>` | Seed color in hex (e.g. `"#5E81AC"`) |
| `--pin-source` | Replace the closest-matching accent token with your exact seed color |

## Output

Files are written to `dist/` named after your theme (slugified):

| File | Contents |
|------|----------|
| `dist/<name>.css` | CSS custom properties for both light and dark themes |
| `dist/<name>.json` | Palette and semantic tokens as structured JSON |

### Token structure

The CSS exposes two layers:

- `--ctp-<name>` — raw palette (e.g. `--ctp-blue`, `--ctp-base`)
- `--<role>` — semantic tokens mapped per the style guide (e.g. `--color-accent`, `--syntax-keyword`, `--bg-surface1`)

## How it works

1. **Closest token detection** — the seed color is compared against all 14 Catppuccin accent colors in HCT space (weighted: 60% hue, 25% chroma, 15% tone) to find the closest named token.
2. **Harmonization** — `Blend.harmonize()` shifts each accent color's hue up to 15° toward the seed, preserving chroma and tone. Neutral/surface colors receive a gentler ≤5° tint.
3. **Pin source** *(optional)* — replaces the closest accent slot with the exact seed hex in the light theme. For dark, the seed's hue and chroma are kept but tone is adapted to match Mocha's palette convention.

## References

- [Catppuccin](https://github.com/catppuccin/catppuccin)
- [Catppuccin style guide](https://github.com/catppuccin/catppuccin/blob/main/docs/style-guide.md)
- [Material Color Utilities](https://github.com/material-foundation/material-color-utilities)

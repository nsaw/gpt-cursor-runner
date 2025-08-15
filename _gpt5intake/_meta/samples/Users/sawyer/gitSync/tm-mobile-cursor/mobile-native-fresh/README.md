# mobile-native-fresh

This is the main application for the fresh mobile experience.

## Getting Started

...

## Development Shortcuts

| Command                                  | Purpose                                         |
| ---------------------------------------- | ----------------------------------------------- |
| `npm run dev`                            | Launch full MAIN stack via **dev-workflow.sh**  |
| `npm run validate:patch -- <PATCH_NAME>` | Run the alt-runtime validation suite on a patch |
| `npm run maintain`                       | Perform log pruning & heartbeat touch           |

Scripts live under `scripts/` and follow the safety conventions (`set -euo pipefail`).

## Styling and Theming

For a detailed guide on how to handle styling and theming in this project, please refer to our [Theming and Styling Guide](./docs/THEMING_GUIDE.md). This guide explains the correct patterns for using `designTokens` and the `useTheme` hook to ensure consistency and performance.
